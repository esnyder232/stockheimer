const {GlobalFuncs} = require('../global-funcs.js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');

//This class keeps track of nodes and edges for a particular tilemap. It also holds the functions for the actual pathing (breadth first/A*/ect).
class NavGrid {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.tm = null; //direct reference to the tile map itself
		this.nodes = []; //2d array [y][x]
		this.edges = []; //1d array
		this.edgesDiagonal = [] //1d array

		this.nodesIdIndex = {};
		this.edgesIdIndex = {};
		this.edgesDiagonalIdIndex = {};

		this.nodeIdCounter = 0;
		this.edgeIdCounter = 0;
		this.isNormalNavgrid = true;

		this.toCastleNodeMap = null;
		this.tiledUnitsToPlanckUnits = 1;
	}


	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	deinit() {
		this.gs = null;
		this.globalfuncs = null;
		this.tm = null;
		this.nodes.length = 0;
		this.edges.length = 0;
		this.nodesIdIndex = {};
		this.edgesIdIndex = {};
		this.edgesDiagonalIdIndex = {};
		this.toCastleNodeMap = null;
	}

	create() {
		//create nodes/edges
		if(this.tm !== null && this.tm.navGridLayer)
		{
			this.tiledUnitsToPlanckUnits = this.tm.tiledUnitsToPlanckUnits;

			//make a node for each coordinate in the tilemap
			//If this is the NORMAL navgrid, create a node for each tile where the node is in the MIDDLE of the tile
			if(this.isNormalNavgrid) {
				for(var j = 0; j < this.tm.height; j++) {
					this.nodes.push([]);
					for(var i = 0; i < this.tm.width; i++) {
						var tileIndex = (j * this.tm.width) + i;
						var tileType = this.tm.tileset[this.tm.navGridLayer.data[tileIndex]];
						var collideProjectiles = false;
						var collideProjectilesDirection = "";

						//kinda wierd. If its got the colideProjectile property on it, just treat that as the source of truth
						if(tileType.collideProjectiles !== undefined && tileType.collideProjectiles !== null) {
							collideProjectiles = tileType.collideProjectiles;
						}
						//if its a wall, and the collideProjectiles property is NOT on it, just assume the wall is SUPPOSED to block projectiles
						else if (tileType.impassable !== undefined && tileType.impassable !== null && tileType.impassable === true) {
							collideProjectiles = true
						}

						if(collideProjectiles) {
							collideProjectilesDirection = tileType.collideProjectilesDirection === undefined ? "" : tileType.collideProjectilesDirection;
						}
	
						var n = {
							id: this.nodeIdCounter++,
							x: i,
							y: j,
							edges: [],
							edgesDiagonal: [],
							xPlanck: i * this.tiledUnitsToPlanckUnits,
							yPlanck: j * this.tiledUnitsToPlanckUnits,
							impassable: tileType.impassable === true ? true : false,
							movementCost: tileType.movementCost !== undefined ? tileType.movementCost : 1,
							collideProjectiles: collideProjectiles,
							collideProjectilesDirection: collideProjectilesDirection,
							clearance: -1
						}
		
						this.nodes[j].push(n);
					}
				}
			}
			//If this is the OFFSET navgrid, create a node for each tile where the node is where the tiles MEET
			else {
				for(var j = 0; j <= this.tm.height; j++) {
					this.nodes.push([]);
						for(var i = 0; i <= this.tm.width; i++) {
						var node = {
							id: this.nodeIdCounter++,
							x: i,
							y: j,
							edges: [],
							edgesDiagonal: [],
							xPlanck: (i - 0.5) * this.tiledUnitsToPlanckUnits,
							yPlanck: (j - 0.5) * this.tiledUnitsToPlanckUnits,
							impassable: false,
							movementCost: 1, //just assume its 1 for now
							collideProjectiles: false,
							clearance: -1
						};

						//calculate properties for the node based on the 1-4 adjacent tiles
						var normalNodes = this.tm.getNormalNodesFromOffsetNode(i, j);
						var impassable = false;
						var collideProjectiles = false;
						
						for(var k = 0; k < normalNodes.length; k++) {
							var xNormal = normalNodes[k].x;
							var yNormal = normalNodes[k].y;

							var tileIndex = (yNormal * this.tm.width) + xNormal;
							var tileType = this.tm.tileset[this.tm.navGridLayer.data[tileIndex]];
		
							//calculate "collideProjectiles"
							//kinda wierd. If its got the colideProjectile property on it, just treat that as the source of truth
							if(tileType.collideProjectiles !== undefined && tileType.collideProjectiles !== null) {
								collideProjectiles = collideProjectiles || tileType.collideProjectiles;
							}
							//if its a wall, and the collideProjectiles property is NOT on it, just assume the wall is SUPPOSED to block projectiles
							else if (tileType.impassable !== undefined && tileType.impassable !== null && tileType.impassable === true) {
								collideProjectiles = true;
							}

							//calculate "impassable"
							if(tileType.impassable !== undefined && tileType.impassable === true){
								impassable = true;
							}
						}
						
						node.collideProjectiles = collideProjectiles;
						node.impassable = impassable;

						this.nodes[j].push(node);
					}
				}
			}
			
			
			//create edges for each node
			for(var j = 0; j < this.nodes.length; j++)
			{
				for(var i = 0; i < this.nodes[j].length; i++)
				{
					var currentNode = this.nodes[j][i];
					var potentialNeighbors = [];
					var coordSum = currentNode.x + currentNode.y;
					var isEven = (coordSum % 2) == 0 ? true : false;
					var potentialDiagonalNeighbors = [];
		
					//order the neighbors differently depending if the manhattan distance is even or odd (for some reason to paths just come out better this way)
					//even nodes, do CCW, N, W, S E
					if(isEven)
					{
						potentialNeighbors.push({x: currentNode.x, y:currentNode.y-1, dir:'north'});
						potentialNeighbors.push({x: currentNode.x-1, y:currentNode.y, dir:'west'});
						potentialNeighbors.push({x: currentNode.x, y:currentNode.y+1, dir:'south'});
						potentialNeighbors.push({x: currentNode.x+1, y:currentNode.y, dir:'east'});
					}
					//odd nodes, do CW, E, S, W, N
					else
					{
						potentialNeighbors.push({x: currentNode.x+1, y:currentNode.y, dir:'east'});
						potentialNeighbors.push({x: currentNode.x, y:currentNode.y+1, dir:'south'});
						potentialNeighbors.push({x: currentNode.x-1, y:currentNode.y, dir:'west'});
						potentialNeighbors.push({x: currentNode.x, y:currentNode.y-1, dir:'north'});
					}

					//also add diagonal neighbors (for clearance calculations only)
					potentialDiagonalNeighbors.push({x: currentNode.x+1, y:currentNode.y-1, dir:'north-east'});
					potentialDiagonalNeighbors.push({x: currentNode.x+1, y:currentNode.y+1, dir:'south-east'});
					potentialDiagonalNeighbors.push({x: currentNode.x-1, y:currentNode.y+1, dir:'south-west'});
					potentialDiagonalNeighbors.push({x: currentNode.x-1, y:currentNode.y-1, dir:'north-west'});
					
					//add neighbors to edges and currentNode
					for(var k = 0; k < potentialNeighbors.length; k++)
					{
						var neigh = potentialNeighbors[k];
						
						//check to see if the node exists
						if(neigh.y >= 0 
							&& neigh.y < this.nodes.length 
							&& neigh.x >= 0 
							&& neigh.x < this.nodes[neigh.y].length)
						{
							var e = {
								id: this.edgeIdCounter++,
								nodeFromId: currentNode.id,
								nodeToId: this.nodes[neigh.y][neigh.x].id,
								dir: neigh.dir
							};

							this.edges.push(e);
							currentNode.edges.push(e.id);
						}
					}

					//add diagonal neighbors to edges and currentNode
					for(var k = 0; k < potentialDiagonalNeighbors.length; k++)
					{
						var neigh = potentialDiagonalNeighbors[k];
						
						//check to see if the node exists
						if(neigh.y >= 0 
							&& neigh.y < this.nodes.length 
							&& neigh.x >= 0 
							&& neigh.x < this.nodes[neigh.y].length)
						{
							var e = {
								id: this.edgeIdCounter++,
								nodeFromId: currentNode.id,
								nodeToId: this.nodes[neigh.y][neigh.x].id,
								dir: neigh.dir
							};

							this.edgesDiagonal.push(e);
							currentNode.edgesDiagonal.push(e.id);
						}
					}
				}
			}

			//build indices
			this.buildIndex();

			//calculate clearances
			this.calculateNodeClearance();

			//fuck it, we'll just make the walls here
			if(this.isNormalNavgrid) {
				for(var j = 0; j < this.nodes.length; j++) {
					for(var i = 0; i < this.nodes[j].length; i++) {
						if(this.nodes[j][i].impassable) {
							var w = this.gs.gom.createStaticGameObject("wall");
							w.x = i * this.tiledUnitsToPlanckUnits;
							w.y = (j * this.tiledUnitsToPlanckUnits) * -1;
							w.size = this.tiledUnitsToPlanckUnits;
							w.collideProjectiles = this.nodes[j][i].collideProjectiles;
							w.collideProjectilesDirection = this.nodes[j][i].collideProjectilesDirection;
							w.init(this.gs);
						}
					}
				}
			}
		}
	}

	//just deletes the old indexes if there was any, and builds the indexes
	buildIndex() {
		this.nodesIdIndex = {};
		this.edgesIdIndex = {};
		this.edgesDiagonalIdIndex = {};
		for(var j = 0; j < this.nodes.length; j++)
		{
			for(var i = 0; i < this.nodes[j].length; i++)
			{
				this.nodesIdIndex[this.nodes[j][i].id] = this.nodes[j][i];
			}
		}

		for(var i = 0; i < this.edges.length; i++)
		{
			this.edgesIdIndex[this.edges[i].id] = this.edges[i];
		}

		for(var i = 0; i < this.edgesDiagonal.length; i++)
		{
			this.edgesDiagonalIdIndex[this.edgesDiagonal[i].id] = this.edgesDiagonal[i];
		}
	}

	//this calculates the clearance for each node in the navgrid. It uses the brushfire algorithm.
	//for NORMAL navgrids, the clearance is always 0 or 1 + 2n (0,1,3,5,7,...)
	//for OFFSET navgrids, the clearance is always 0 or 2 + 2n (0,2,4,6,8,...)
	calculateNodeClearance() {
		var initialFrontier = [];
		var frontier = [];
		var visitedNodes = {};

		//go through the nodes to get an initial frontier (all the impassable nodes)
		//also assign them a 0 clerance because they are impassable
		for(var j = 0; j < this.nodes.length; j++) {
			for (var i = 0; i < this.nodes[j].length; i++) {
				if(this.nodes[j][i].impassable) {
					this.nodes[j][i].clearance = 0;
					initialFrontier.push(this.nodes[j][i]);
					visitedNodes[this.nodes[j][i].id] = true;
				}
			}
		}
		
		//calculate the initial frontier clearance (either 1 or 2 depending on if its the NORMAL navgrid or OFFSET navgrid)
		while(initialFrontier.length > 0) {
			var currentFrontierNode = initialFrontier.shift();

			var currentFrontierNodeEdges = [];
			//get any edges it may have (and therefore its neighbors)
			for(var i = 0; i < currentFrontierNode.edges.length; i++) {
				currentFrontierNodeEdges.push(this.edgesIdIndex[currentFrontierNode.edges[i]]);
			}

			//diagonals too
			for(var i = 0; i < currentFrontierNode.edgesDiagonal.length; i++) {
				currentFrontierNodeEdges.push(this.edgesDiagonalIdIndex[currentFrontierNode.edgesDiagonal[i]]);
			}

			for(var j = 0; j < currentFrontierNodeEdges.length; j++) {
				var neighborNodeInQuestion = this.nodesIdIndex[currentFrontierNodeEdges[j].nodeToId];

				//if the neighbor hasn't been visited yet, calculate clearance and add it to the frontier if aplicable
				if(visitedNodes[neighborNodeInQuestion.id] === undefined) {
					visitedNodes[neighborNodeInQuestion.id] = true;
					if(this.isNormalNavgrid) {
						neighborNodeInQuestion.clearance = 1 * this.tiledUnitsToPlanckUnits;
					} else {
						neighborNodeInQuestion.clearance = 2 * this.tiledUnitsToPlanckUnits;
					}

					frontier.push(neighborNodeInQuestion);
				}
			}
		}

		//calculate the frontier clearance
		while(frontier.length > 0) {
			var currentFrontierNode = frontier.shift();

			var currentFrontierNodeEdges = [];
			//get any edges it may have (and therefore its neighbors)
			for(var i = 0; i < currentFrontierNode.edges.length; i++) {
				currentFrontierNodeEdges.push(this.edgesIdIndex[currentFrontierNode.edges[i]]);
			}

			//diagonals too
			for(var i = 0; i < currentFrontierNode.edgesDiagonal.length; i++) {
				currentFrontierNodeEdges.push(this.edgesDiagonalIdIndex[currentFrontierNode.edgesDiagonal[i]]);
			}

			for(var j = 0; j < currentFrontierNodeEdges.length; j++) {
				var neighborNodeInQuestion = this.nodesIdIndex[currentFrontierNodeEdges[j].nodeToId];

				//if the neighbor hasn't been visited yet, calculate clearance and add it to the frontier if aplicable
				if(visitedNodes[neighborNodeInQuestion.id] === undefined) {
					visitedNodes[neighborNodeInQuestion.id] = true;
					neighborNodeInQuestion.clearance = currentFrontierNode.clearance + (2  * this.tiledUnitsToPlanckUnits);
					frontier.push(neighborNodeInQuestion);
				}
			}
		}

		var debugHeere = true;
	}


	//creates an node map from every node to a specific target node. Uses breadth first search.
	//OLD - not really used anymore...but i'm keeping it around just incase i need it again.
	breadthFirstNodeMap(nodeTarget)
	{
		var finalNodeMap = {};
		var frontier = [];
		
		frontier.push(nodeTarget);
		finalNodeMap[nodeTarget.id] = [];
		finalNodeMap[nodeTarget.id].push(nodeTarget);

		while(frontier.length > 0)
		{
			var currentFrontierNode = frontier.shift();

			var currentFrontierNodeEdges = [];
			//get any edges it may have (and therefore its neighbors)
			for(var i = 0; i < currentFrontierNode.edges.length; i++)
			{
				currentFrontierNodeEdges.push(this.edgesIdIndex[currentFrontierNode.edges[i]]);
			}

			for(var j = 0; j < currentFrontierNodeEdges.length; j++)
			{
				
				var neighborNodeInQuestion = this.nodesIdIndex[currentFrontierNodeEdges[j].nodeToId];

				//if the neighbor hasn't been visited yet, add it to the frontier if aplicable and compute the path to the target
				if(finalNodeMap[neighborNodeInQuestion.id] === undefined)
				{
					//check first to see if its impassibla (wall). If not, add it to the frontier to be processed next
					if(!neighborNodeInQuestion.impassable)
					{
						//add its neighbors to the frontier
						frontier.push(neighborNodeInQuestion);
					}

					//compute the node map for the neighbor. Even if the neighbor is impassable, we should compute the node map to provide a path to get out of the impassable neighbor (incase the entity accidentally gets pushed in the wall)
					finalNodeMap[neighborNodeInQuestion.id] = [];
					finalNodeMap[neighborNodeInQuestion.id].push(neighborNodeInQuestion);

					//get the path back to the target node from the current node, and add it to the neighbor
					for(var k = 0; k < finalNodeMap[currentFrontierNode.id].length; k++)
					{
						finalNodeMap[neighborNodeInQuestion.id].push(finalNodeMap[currentFrontierNode.id][k])
					}
				}
			}
		}

		return finalNodeMap;
	}




	//returns the path from nodeStart to nodeEnd using breadthFirst
	//OLD - not really used anymore...but i'm keeping it around just incase i need it again.
	breadthFirstSearch(nodeStart, nodeEnd)
	{
		var breadCrumbs = {};
		var frontier = [];
		var bNodeFound = false;
		var finalPath = [];

		if(nodeStart.id === nodeEnd.id)
		{
			return [];
		}

		frontier.push(nodeStart);
		breadCrumbs[nodeStart.id] = null;

		while(frontier.length > 0 && !bNodeFound)
		{
			var currentFrontierNode = frontier.shift();

			var currentFrontierNodeEdges = [];
			//get any edges it may have (and therefore its neighbors)
			for(var i = 0; i < currentFrontierNode.edges.length; i++)
			{
				currentFrontierNodeEdges.push(this.edgesIdIndex[currentFrontierNode.edges[i]]);
			}

			for(var j = 0; j < currentFrontierNodeEdges.length; j++)
			{
				
				var neighborNodeInQuestion = this.nodesIdIndex[currentFrontierNodeEdges[j].nodeToId];

				//if the neighbor hasn't been visited yet, add it to the frontier if aplicable and compute the path to the target
				if(breadCrumbs[neighborNodeInQuestion.id] === undefined)
				{
					//check first to see if its impassibla (wall). If not, add it to the frontier to be processed next
					if(!neighborNodeInQuestion.impassable)
					{
						//add its neighbors to the frontier
						frontier.push(neighborNodeInQuestion);
					}

					//Add the neighbor to the breadcrumbs. Even if the neighbor is impassable, we should add it anyway to provide a path to get out of the impassable neighbor (incase the entity accidentally gets pushed in the wall)
					breadCrumbs[neighborNodeInQuestion.id] = currentFrontierNode.id;

					if(neighborNodeInQuestion.id === nodeEnd.id)
					{
						bNodeFound = true;
						break;
					}
				}
			}
		}

		//compute the path from the target node from the current node using the bread crumbs
		if(bNodeFound)
		{
			finalPath = this.getPathFromBreadCrumbs(breadCrumbs, nodeEnd);
		}

		return finalPath;
	}



	//returns the nodes from nodeStart to the nodeEnd using A* algorithm
	AStarSearch(nodeStart, nodeEnd, clearance) {
		if(clearance === undefined) {
			clearance = 1;
		}
		var breadCrumbs = {};
		var nodeCostMap = {}; // a mapping of node id to movement cost to get to the node
		var manhattanArr = [];
		var frontier = [];
		var bNodeFound = false;
		var finalPath = [];

		if(nodeStart.id === nodeEnd.id)
		{
			return [];
		}

		//if nodeEnd is not in a tile with specified clearance, find the closest tile that has the clearance
		if(nodeEnd.clearance < clearance) {
			nodeEnd = this.breadthFirstSearchClearance(nodeEnd, clearance);
		}


		frontier.push({
			node: nodeStart,
			priority: 0
		});
		breadCrumbs[nodeStart.id] = null;
		nodeCostMap[nodeStart.id] = 0;

		while(frontier.length > 0 && !bNodeFound)
		{
			//sort frintier based on priority desc
			frontier.sort((a, b) => {return a.priority - b.priority;});
			var currentFrontierNode = frontier.shift().node;

			if(currentFrontierNode.id === nodeEnd.id)
			{
				bNodeFound = true;
				break;
			}

			//just incase
			if(!bNodeFound)
			{
				var currentFrontierNodeEdges = [];
				//get any edges it may have (and therefore its neighbors)
				for(var i = 0; i < currentFrontierNode.edges.length; i++)
				{
					currentFrontierNodeEdges.push(this.edgesIdIndex[currentFrontierNode.edges[i]]);
				}
	
				for(var j = 0; j < currentFrontierNodeEdges.length; j++)
				{
					var neighborNodeInQuestion = this.nodesIdIndex[currentFrontierNodeEdges[j].nodeToId];
					var currentCostSoFar = nodeCostMap[currentFrontierNode.id];
	
					//calculate movement cost
					var newCost = currentCostSoFar + neighborNodeInQuestion.movementCost;
	
					//if the neghibor hasn't been visited, or the last known cost to get TO the neighbor is higher than the current cost, then add it to the frontier
					if(breadCrumbs[neighborNodeInQuestion.id] === undefined || nodeCostMap[neighborNodeInQuestion.id] > newCost)
					{
						//calculate heuristic
						var heuristic = this.manhattanDistanceHeuristicFunction(neighborNodeInQuestion, nodeEnd);
	
						//check first to see if its impassibla (wall). If not, add it to the frontier to be processed next
						if(!neighborNodeInQuestion.impassable && clearance <= neighborNodeInQuestion.clearance)
						{
							//add its neighbors to the frontier
							frontier.push({
								node: neighborNodeInQuestion,
								priority: newCost + heuristic
							});
						}
						
						nodeCostMap[neighborNodeInQuestion.id] = newCost;
	
						//Add the neighbor to the breadcrumbs. Even if the neighbor is impassable, we should add it anyway to provide a path to get out of the impassable neighbor (incase the entity accidentally gets pushed in the wall)
						breadCrumbs[neighborNodeInQuestion.id] = currentFrontierNode.id;
						manhattanArr.push({id: neighborNodeInQuestion.id, manhattanDistance: heuristic});
					}
				}
			}
		}

		//compute the path from the target node from the current node using the bread crumbs
		if(bNodeFound) {
			finalPath = this.getPathFromBreadCrumbs(breadCrumbs, nodeEnd);
		}
		//get the closest one path you can
		else {
			
			var closest = manhattanArr.reduce((acc, cur, curIndex, arr) => {return cur.manhattanDistance < acc.manhattanDistance ? cur : acc;});
			var	closestNode = this.nodesIdIndex[closest.id];
			if(closestNode !== undefined) {
				finalPath = this.getPathFromBreadCrumbs(breadCrumbs, closestNode);
			}
		}

		return finalPath;
	}

	manhattanDistanceHeuristicFunction(nodeStart, nodeTarget)
	{
		return Math.abs(nodeTarget.x - nodeStart.x) + Math.abs(nodeTarget.y - nodeStart.y);
	}
	

	//internal helper function to return a path from breadcrumbs
	getPathFromBreadCrumbs(breadCrumbs, nodeEnd)
	{
		var finalPath = [];
		var finalBreadCrumbPath = [];  //the bread crumbs from target to start

		//get the final bread crumb path
		finalBreadCrumbPath.push(nodeEnd.id);
		var currentNodeId = nodeEnd.id;
		while(breadCrumbs[currentNodeId] !== null && breadCrumbs[currentNodeId] !== undefined)
		{
			finalBreadCrumbPath.push(breadCrumbs[currentNodeId]);
			currentNodeId = breadCrumbs[currentNodeId];
		}

		//compute the path by reversing the final bread crumbs
		for(var i = finalBreadCrumbPath.length-1; i >= 0; i--)
		{
			finalPath.push(this.nodesIdIndex[finalBreadCrumbPath[i]]);
		}

		return finalPath;	
	}
	
	//This does a breadth first search from the nodeStart to any node that has the specified clearance
	//It returns the closest NODE of the specified clearance rather than the path to the node.
	breadthFirstSearchClearance(nodeStart, clearance) {
		if(clearance === undefined) {
			clearance = 1;
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

		while(frontier.length > 0 && !bNodeFound) {
			var currentFrontierNode = frontier.shift();

			var currentFrontierNodeEdges = [];
			//get any edges it may have (and therefore its neighbors)
			for(var i = 0; i < currentFrontierNode.edges.length; i++) {
				currentFrontierNodeEdges.push(this.edgesIdIndex[currentFrontierNode.edges[i]]);
			}

			for(var j = 0; j < currentFrontierNodeEdges.length; j++) {
				var neighborNodeInQuestion = this.nodesIdIndex[currentFrontierNodeEdges[j].nodeToId];

				//if the neighbor hasn't been visited yet, add it to the frontier if aplicable and compute the path to the target
				if(breadCrumbs[neighborNodeInQuestion.id] === undefined) {
					//check first to see if its impassibla (wall). If not, add it to the frontier to be processed next
					if(!neighborNodeInQuestion.impassable) {
						//add its neighbors to the frontier
						frontier.push(neighborNodeInQuestion);
					}

					//Add the neighbor to the breadcrumbs. Even if the neighbor is impassable, we should add it anyway to provide a path to get out of the impassable neighbor (incase the entity accidentally gets pushed in the wall)
					breadCrumbs[neighborNodeInQuestion.id] = currentFrontierNode.id;

					if(neighborNodeInQuestion.clearance >= clearance) {
						bNodeFound = true;
						finalNode = neighborNodeInQuestion;
						break;
					}
				}
			}
		}

		return finalNode;
	}




	//OLD - not really used anymore...but i'm keeping it around just incase i need it again.
	getPathToCastle(xStart, yStart) {
		var path = [];
		if(yStart >= 0 && yStart < this.nodes.length)
		{
			if(xStart >= 0 && xStart < this.nodes[yStart].length)
			{
				var nodeId = this.nodes[yStart][xStart].id;
				if(this.toCastleNodeMap[nodeId] !== undefined)
				{
					path = this.toCastleNodeMap[nodeId];
				}
			}
		}
		
		return path;
	}

	getNode(x, y) {
		var node = null;
		var yNode = Math.round(y / this.tiledUnitsToPlanckUnits);
		var xNode = Math.round(x / this.tiledUnitsToPlanckUnits);

		if(yNode >= 0 && yNode < this.nodes.length) {
			if(xNode >= 0 && xNode < this.nodes[yNode].length) {
				var node = this.nodes[yNode][xNode];
			}
		}
		
		return node;
	}

	getNodeExact(xNode, yNode) {
		var node = null;

		if(yNode >= 0 && yNode < this.nodes.length) {
			if(xNode >= 0 && xNode < this.nodes[yNode].length) {
				var node = this.nodes[yNode][xNode];
			}
		}
		
		return node;
	}
}

exports.NavGrid = NavGrid;