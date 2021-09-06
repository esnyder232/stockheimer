const {GlobalFuncs} = require('../global-funcs.js');
const {NavGrid} = require('./nav-grid.js');

//This is basically a wrapper wrapper class for Tiled exports (json exports from the Tiled program by Thorbjørn Lindeijer)
class Tilemap {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.resourceId = null;

		this.jsonData = null;

		this.width = 0;
		this.height = 0;
		this.tilewidth = 1;
		this.tileheight = 1;
		this.tileset = []; //this is a flattened version of the tileset array in the jsonData. The index for this array is the gid from Tiled
		this.navGridLayer = null;
		this.playerSpawnLayer = null;
		this.playerSpawnZones = [];
		this.playerSpawnZonesSlotNumIndex = {};
		this.tiledUnitsToPlanckUnits = 1;

		// this.navGrid = null;

		//there will be 2 navgrids: 
		//0 - normal (nodes are at the center of each tile)
		//1 - offset (nodes are at the corners where the tiles meet)
		this.navGrids = [];
		
		//These are 2D arrays of that link the NORMAL navgrid nodes to OFFSET navgrid nodes, and vice versa
		//This is to describe the relationship between the NORMAL and OFFSET navgrid nodes, such as when an impassable NORMAL node impacts 4 OFFSET nodes.
		//normalToOffset - each entry will represent a NORMAL node, and contain an array of 4 OFFSET nodes
		//offsetToNormal - each entry will represent an OFFSET node, and contain an array of 1-4 NORMAL nodes (the corners and edges will have 1-2 NORMAL nodes)
		this.normalToOffset = []; //[y][x]
		this.offsetToNormal = []; //[y][x]
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}


	deinit() {
		this.gs = null;
		this.globalfuncs = null;
		this.resourceId = null
		this.jsonData = null;
		this.tileset = [];
		this.navGridLayer = null;
		this.playerSpawnLayer = null;
		this.playerSpawnZones = [];
		this.playerSpawnZonesSlotNumIndex = {};

		for(var i = 0; i < this.navGrids.length; i++) {
			this.navGrids[i].deinit();
		}

		this.navGrids.length = 0;
	}

	//creates tilemap and navgrid
	//returns true if an error occured. false if everything loaded fine.
	createTilemapAndNavgrid() {
		var bError = false;

		var r = this.gs.rm.getResourceByID(this.resourceId);
		if(r !== null) {
			this.jsonData = r.data;
		}
		else {
			bError = true;
		}

		//find properties on the tilemap for scaling and stuff
		if(!bError && this.jsonData.properties !== undefined && this.jsonData.properties !== null) {
			for(var i = 0; i < this.jsonData.properties.length; i++) {
				var currentProperty = this.jsonData.properties[i];

				//a property with "planckScale" on it will be used for tiledUnitsToPlanckUnits scaling
				if(currentProperty.name.toLowerCase() === "planckscale"
				&& currentProperty.type === "float")
				{
					if(typeof currentProperty.value === "number") {
						this.tiledUnitsToPlanckUnits = Math.abs(currentProperty.value);
					}
				}
			}
		}
		

		//create tilemap
		if(!bError) {
			this.width = this.jsonData.width;
			this.height = this.jsonData.height;
			this.tilewidth = this.jsonData.tilewidth;
			this.tileheight = this.jsonData.tileheight;
	
			//create tileset
			//create a '0' gid tile (in Tiled, a 0 gid means there is no tile assigned at all)
			var gid0 = this.createTileForTileset(0, []);
			this.tileset.push(gid0);
	
			for(var i = 0; i < this.jsonData.tilesets.length; i++)
			{
				var currentTileset = this.jsonData.tilesets[i];
				
				for(var j = 0; j < currentTileset.tilecount; j++)
				{
					var gid = currentTileset.firstgid + j;
					var properties = [];
	
					if(currentTileset.tiles)
					{
						var tiledPropertyObject = currentTileset.tiles.find((x) => {return (x.id + currentTileset.firstgid) === gid;});
						if(tiledPropertyObject)
						{
							properties = tiledPropertyObject.properties;
						}
					}
					var t = this.createTileForTileset(gid, properties);
					this.tileset.push(t);
				}
			}
	
			//go through each layer
			if(this.jsonData.layers)
			{
				for(var i = 0; i < this.jsonData.layers.length; i++)
				{
					var currentLayer = this.jsonData.layers[i];
	
					//look at the properties
					if(currentLayer.properties)
					{
						for(var j = 0; j < currentLayer.properties.length; j++)
						{
							var currentProperty = currentLayer.properties[j];
	
							//a property with "navGrid = true" on it will be used for the nav grid
							if(currentProperty.name.toLowerCase() === "navgrid" 
							&& currentProperty.type === "bool"
							&& currentProperty.value === true)
							{
								this.navGridLayer = currentLayer;
							}
	
							//a property with "playerSpawns = true" on it will be used for the enemy spawning locations
							if(currentProperty.name.toLowerCase() === "playerspawns" 
							&& currentProperty.type === "bool"
							&& currentProperty.value === true)
							{
								this.playerSpawnLayer = currentLayer;
							}
						}
					}
				}
			}
	
			//create player spawn zones
			if(this.playerSpawnLayer !== null && this.playerSpawnLayer.objects)
			{
				var xOffset = -this.tilewidth/2;
				var yOffset = -this.tileheight/2;
				for(var i = 0; i < this.playerSpawnLayer.objects.length; i++) {
					var z = this.playerSpawnLayer.objects[i];

					z.xPlanck = ((z.x + xOffset) / this.tilewidth) * this.tiledUnitsToPlanckUnits;
					z.yPlanck = (((z.y + yOffset) / this.tileheight) * -1) * this.tiledUnitsToPlanckUnits;
					z.widthPlanck = (z.width / this.tilewidth) * this.tiledUnitsToPlanckUnits;
					z.heightPlanck = (z.height / this.tileheight) * this.tiledUnitsToPlanckUnits;
					z.slotNumArr = []; //slotnums assigned to this spawn zone

					this.playerSpawnZones.push(z);

					//look at slotnum for the index
					if(z.properties) {
						for(var j = 0; j < z.properties.length; j++) {
							if(z.properties[j].name
							&& z.properties[j].name.toLowerCase() === "slotnum"
							&& z.properties[j].type === "int"
							&& Number.isInteger(z.properties[j].value)) {
								this.updateSpawnZoneIndex(z.id, z.properties[j].value, z, "create");
							}
						}
					}
				}
			}
		}

		//create navgrid transformation arrays
		if(!bError) {
			//normalToOffset
			for(var j = 0; j < this.height; j++) {
				this.normalToOffset.push([]);

				for(var i = 0; i < this.width; i++) {
					var offsetNodes = [];
					
					offsetNodes.push({x: i, y: j});			//TL offset node
					offsetNodes.push({x: i, y: j+1});		//BL offset node
					offsetNodes.push({x: i+1, y: j});		//TR offset node
					offsetNodes.push({x: i+1, y: j+1});		//BR offset node

					this.normalToOffset[j].push(offsetNodes);
				}
			}

			//offsetToNormal
			for(var j = 0; j <= this.height; j++) {
				this.offsetToNormal.push([]);

				//top row
				if(j === 0) {
					for(var i = 0; i <= this.width; i++) {
						var normalNodes = [];
						//first column (1 node)
						if(i === 0) {
							normalNodes.push({x: i, y: j});
						}
						//final column (1 node)
						else if(i === this.width) {
							normalNodes.push({x: i-1, y: j});
						}
						//internal column (2 nodes)
						else {
							normalNodes.push({x: i-1, y: j});
							normalNodes.push({x: i, y: j});
						}

						this.offsetToNormal[j].push(normalNodes);
					}
				}
				//bottom row
				else if(j === this.height) {
					for(var i = 0; i <= this.width; i++) {
						var normalNodes = [];
						//first column (1 node)
						if(i === 0) {
							normalNodes.push({x: i, y: j-1});
						}
						//final column (1 node)
						else if(i === this.width) {
							normalNodes.push({x: i-1, y: j-1});
						}
						//internal column (2 nodes)
						else {
							normalNodes.push({x: i-1, y: j-1});
							normalNodes.push({x: i, y: j-1});
						}

						this.offsetToNormal[j].push(normalNodes);
					}
				}
				//internal row
				else {
					for(var i = 0; i <= this.width; i++) {
						var normalNodes = [];
						//first column (2 node)
						if(i === 0) {
							normalNodes.push({x: i, y: j-1});
							normalNodes.push({x: i, y: j});
						}
						//final column (2 nodes)
						else if(i === this.width) {
							normalNodes.push({x: i-1, y: j});
							normalNodes.push({x: i-1, y: j-1});
						}
						//internal column (4 nodes)
						else {
							normalNodes.push({x: i-1, y: j-1});
							normalNodes.push({x: i-1, y: j});
							normalNodes.push({x: i, y: j-1});
							normalNodes.push({x: i, y: j});
						}

						this.offsetToNormal[j].push(normalNodes);
					}
				}
			}
		}


		
		//create navgrids
		if(!bError) {
			//create navgridA first (navgrid with nodes in the center of the tiles)
			var navGridA = new NavGrid();
			navGridA.init(this.gs);
			navGridA.tm = this;
			navGridA.isNormalNavgrid = true;
			navGridA.create();

			this.navGrids.push(navGridA);

			//create navgridB second (navgrid with nodes where tiles meet)
			var navGridB = new NavGrid();
			navGridB.init(this.gs);
			navGridB.tm = this;
			navGridB.isNormalNavgrid = false;
			navGridB.create();

			this.navGrids.push(navGridB);
		}

		//testing
		// var a = this.findClosestOffsetNode({x:13, y:-29}, 4);

		// var b = this.AStarSearch({x:29, y:-36}, {x:13, y:-29}, 1.4);

		// var debughere = true;


		// //create navgrid
		// if(!bError) {
		// 	this.navGrid = new NavGrid();
		// 	this.navGrid.init(this.gs);
		// 	this.navGrid.tm = this;
		// 	this.navGrid.create();
		// }

		return bError;
	}

	updateSpawnZoneIndex(objId, slotNum, obj, transaction) {
		if(transaction == 'create') {
			if(this.playerSpawnZonesSlotNumIndex[slotNum] === undefined) {
				this.playerSpawnZonesSlotNumIndex[slotNum] = [];
			}
			this.playerSpawnZonesSlotNumIndex[slotNum].push(obj);
		}
		else if(transaction == 'delete') {
			if(this.playerSpawnZonesSlotNumIndex[slotNum] !== undefined) {
				var ind = this.playerSpawnZonesSlotNumIndex[slotNum].findIndex((x) => {return x.objId === objId;});
				if(ind >= 0) {
					this.playerSpawnZonesSlotNumIndex[slotNum].splice(ind, 1);
				}

				if(this.playerSpawnZonesSlotNumIndex[slotNum].length === 0) {
					delete this.playerSpawnZonesSlotNumIndex[slotNum];
				}
			}
		}
	}

	//gets 1-4 NORMAL nodes for the specified OFFSET node
	getNormalNodesFromOffsetNode(xOffsetNode, yOffsetNode) {
		var normalNodes = [];
		if(yOffsetNode >= 0 
			&& yOffsetNode < this.offsetToNormal.length 
			&& xOffsetNode >= 0
			&& xOffsetNode < this.offsetToNormal[yOffsetNode].length) {
				normalNodes = this.offsetToNormal[yOffsetNode][xOffsetNode];
		}

		return normalNodes;
	}

	
	//gets 4 OFFSET nodes for the specified NORMAL node
	getOffsetNodesFromNormalNode(xNormalNode, yNormalNode) {
		var offsetNodes = [];
		if(yNormalNode >= 0 
			&& yNormalNode < this.normalToOffset.length 
			&& xNormalNode >= 0
			&& xNormalNode < this.normalToOffset[yNormalNode].length) {
				offsetNodes = this.normalToOffset[yNormalNode][xNormalNode];
		}

		return offsetNodes;
	}

	//finds an path based on clearance
	AStarSearch(planckPosStart, planckPosEnd, clearance) {
		if(clearance === undefined) {
			clearance = 1;
		}

		var path = [];
		var ngIndex = Math.floor((clearance / this.tiledUnitsToPlanckUnits) % 2);
		var nodeStart = null;
		var nodeEnd = null;

		//This means we can use the normal navgrid to find the path
		if(ngIndex === 0 && this.navGrids.length === 2) {
			nodeStart = this.navGrids[0].getNode(planckPosStart.x, -planckPosStart.y);
			nodeEnd = this.navGrids[0].getNode(planckPosEnd.x, -planckPosEnd.y);

			//finally perform the astar search
			if(nodeStart !== null && nodeEnd !== null) {
				path = this.navGrids[0].AStarSearch(nodeStart, nodeEnd, clearance);
			}
		}
		//this means we need to use the offset nagvrid to find the path
		else if(ngIndex === 1 && this.navGrids.length === 2) {
			nodeStart = this.navGrids[1].getNode(planckPosStart.x, -planckPosStart.y);

			//Find a node that has the specified clearance on the normal navgrid
			nodeEnd = this.findClosestOffsetNode(planckPosEnd, clearance);

			//finally perform the astar search
			if(nodeStart !== null && nodeEnd !== null) {
				path = this.navGrids[1].AStarSearch(nodeStart, nodeEnd, clearance);
			}
		}

		return path;
	}


	//This finds the closest node on the OFFSET navgrid with specified clearance, with a starting point on the NORMAL navgrid. It uses breadth first search.
	//This is for when the target is NOT on the offset navgrid, and it effectively transforms the node on the NORMAL navgrid to a node on the OFFSET navgrid (with the specified clearance)
	//ex: if the target is a small gameobject, hiding in a 1x1 corridor, and the seeker is a 2x2 gameobject, we
	// need to transform the target slime's NORMAL node into a OFFSET node so the 2x2 gameobject can have a valid target node.
	findClosestOffsetNode(planckPos, clearance) {
		if(clearance === undefined) {
			clearance = 1;
		}
		if(this.navGrids.length !== 2) {
			return null;
		}

		//get the node on the NORMAL navgrid
		var nodeStart = this.navGrids[0].getNode(planckPos.x, -planckPos.y);

		if(nodeStart === null) {
			return null;
		}

		var breadCrumbs = {};
		var frontier = [];
		var bNodeFound = false;
		var finalNode = nodeStart;

		if(nodeStart.clearance >= clearance) {
			return nodeStart;
		}

		frontier.push(nodeStart);
		breadCrumbs[nodeStart.id] = null;

		//use breadth first search on the NORMAL navgrid
		while(frontier.length > 0 && !bNodeFound) {
			var currentFrontierNode = frontier.shift();
			var currentFrontierNodeEdges = [];

			//get any edges it may have (and therefore its neighbors)
			for(var i = 0; i < currentFrontierNode.edges.length; i++) {
				currentFrontierNodeEdges.push(this.navGrids[0].edgesIdIndex[currentFrontierNode.edges[i]]);
			}

			for(var j = 0; j < currentFrontierNodeEdges.length; j++) {
				var neighborNodeInQuestion = this.navGrids[0].nodesIdIndex[currentFrontierNodeEdges[j].nodeToId];

				//if the neighbor hasn't been visited yet, add it to the frontier if aplicable and compute the path to the target
				if(!bNodeFound && breadCrumbs[neighborNodeInQuestion.id] === undefined) {
					//check first to see if its impassibla (wall). If not, add it to the frontier to be processed next
					if(!neighborNodeInQuestion.impassable) {
						//add its neighbors to the frontier
						frontier.push(neighborNodeInQuestion);
					}

					//Add the neighbor to the breadcrumbs. Even if the neighbor is impassable, we should add it anyway to provide a path to get out of the impassable neighbor (incase the entity accidentally gets pushed in the wall)
					breadCrumbs[neighborNodeInQuestion.id] = currentFrontierNode.id;


					//get all the OFFSET nodes for the current node, and check if any of them have the specified clearance
					var offsetNodes = this.getOffsetNodesFromNormalNode(neighborNodeInQuestion.x, neighborNodeInQuestion.y);
					for(var k = 0; k < offsetNodes.length; k++) {
						var xOffset = offsetNodes[k].x;
						var yOffset = offsetNodes[k].y;

						var offsetNodeInQuestion = this.navGrids[1].getNodeExact(xOffset, yOffset);

						if(offsetNodeInQuestion !== null && offsetNodeInQuestion.clearance >= clearance) {
							bNodeFound = true;
							finalNode = offsetNodeInQuestion;
							break;
						}
					}
				}
			}
		}

		return finalNode;
	}

	getSpawnZonesBySlotnum(slotNum) {
		var arr = this.playerSpawnZones;
		
		if(slotNum !== undefined && Number.isInteger(slotNum)) {
			if(this.playerSpawnZonesSlotNumIndex[slotNum] !== undefined) {
				arr = this.playerSpawnZonesSlotNumIndex[slotNum];
			}
			else{
				arr = [];
			}
		}

		return arr;
	}

	createTileForTileset(gid, properties) {
		var t = {
			gid: gid
		}

		for(var i = 0; i < properties.length; i++)
		{
			var key = properties[i].name;
			var type = properties[i].type;
			var val = properties[i].value;
			var parsedVal = null;

			switch(type)
			{
				case "bool":
					parsedVal = val;
					break;
				case "string":
				default:
					parsedVal = val;
					break;
			}
			t[key] = parsedVal;
		}

		return t;
	}

	getNode(x, y, clearance) {
		var ngIndex = Math.floor((clearance / this.tiledUnitsToPlanckUnits) % 2);
		var node = null;

		//This means we can use the normal navgrid to find the path
		if(ngIndex === 0 && this.navGrids.length === 2) {
			node = this.navGrids[0].getNode(x, y);
		}
		//this means we need to use the offset nagvrid to find the path
		else if(ngIndex === 1 && this.navGrids.length === 2) {
			node = this.navGrids[1].getNode(x, y);
		}

		return node;
	}
}

exports.Tilemap = Tilemap;