const {GlobalFuncs} = require('../global-funcs.js');

//This class keeps track of nodes and edges for a particular tilemap. It also holds the functions for the actual pathing (breadth first/A*/ect).
class NavGrid {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.tmId = null; //tilemap id
		this.tm = null; //direct reference to the tile map itself
		this.nodes = []; //2d array [y][x]
		this.edges = []; //1d array

		this.nodesIdIndex = {};
		this.edgesIdIndex = {};

		this.nodeIdCounter = 0;
		this.edgeIdCounter = 0;

		this.castleNode = null;
		this.toCastleNodeMap = null;
	}

	init(gameServer, tmId) {
		this.gs = gameServer;
		this.tmId = tmId;

		this.globalfuncs = new GlobalFuncs();

		this.tm = this.gs.tmm.getTilemapByID(this.tmId);

		//create nodes/edges
		if(this.tm !== null && this.tm.navGridLayer)
		{
			//make a node for each coordinate in the tilemap
			for(var j = 0; j < this.tm.height; j++)
			{
				this.nodes.push([]);
				for(var i = 0; i < this.tm.width; i++)
				{
					var tileIndex = (j * this.tm.width) + i;
					var tileType = this.tm.tileset[this.tm.navGridLayer.data[tileIndex]];

					var n = {
						id: this.nodeIdCounter++,
						x: i,
						y: j,
						edges: [],
						impassable: tileType.impassable === true ? true : false,
						movementCost: tileType.movementCost !== undefined ? tileType.movementCost : 1,
						castle: tileType.castle === true ? true : false
					}
	
					this.nodes[j].push(n);
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
				}
			}

			this.buildIndex();

			//find the castle node, and create the node map to cache
			var bCastleFound = false;
			for(var i = 0; i < this.nodes.length; i++)
			{
				 var temp = this.nodes[i].find((x) => {return x.castle;});
				if(temp)
				{
					this.castleNode = temp;
					bCastleFound = true;
				}
			}
			this.toCastleNodeMap = this.breadthFirstNodeMap(this.castleNode);
		}
	}

	//just deletes the old indexes if there was any, and builds the indexes
	buildIndex() {
		this.nodesIdIndex = {};
		this.edgesIdIndex = {};
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
	}

	//creates an node map from every node to a specific target node. Uses breadth first search.
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
	AStarSearch(nodeStart, nodeEnd)
	{
		var breadCrumbs = {};
		var nodeCostMap = {}; // a mapping of node id to movement cost to get to the node
		var frontier = [];
		var bNodeFound = false;
		var finalPath = [];

		if(nodeStart.id === nodeEnd.id)
		{
			return [];
		}

		frontier.push({
			node: nodeStart,
			priority: 0
		});
		breadCrumbs[nodeStart.id] = null;
		nodeCostMap[nodeStart.id] = 0;

		while(frontier.length > 0 && !bNodeFound)
		{
			//sort frintier based on priority
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
						if(!neighborNodeInQuestion.impassable)
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



	// //returns the nodes from nodeStart to the nodeEnd using A* algorithm
	// AStarSearch(nodeStart, nodeEnd)
	// {
	// 	var edgeMap = [];
	// 	var path = {
	// 		nodes: [],
	// 		edges: []
	// 	}

	// 	var frontier = [];
	// 	var visited = [];

	// 	frontier.push({node: nodeStart, costSoFar: 0, priority: 0});
	// 	visited.push({node: nodeStart, costSoFar: 0, priority: 0});
	// 	var nodeFound = false;

	// 	while(frontier.length > 0 && !nodeFound)
	// 	{
	// 		//sort it so the lowest cost is in front
	// 		frontier.sort((a, b) => {return a.priority - b.priority;});
	// 		var currentFrontierNode = frontier.shift();

	// 		if(currentFrontierNode.node.id === nodeEnd.id)
	// 		{
	// 			nodeFound = true;
	// 		}

	// 		if(!nodeFound)
	// 		{
	// 			//get any edges it may have (and therefore its neighbors)
	// 			var currentFrontierNodeEdges = edges.filter((x) => {return x.nodeFrom.id === currentFrontierNode.node.id;});
	// 			for(var j = 0; j < currentFrontierNodeEdges.length; j++)
	// 			{
	// 				//check first to see if its impassibla (wall)
	// 				var neighborNodeInQuestion = currentFrontierNodeEdges[j].nodeTo;
	// 				var worldTile = world[neighborNodeInQuestion.y][neighborNodeInQuestion.x]
	// 				if(worldTile.type === "wall")
	// 				{
	// 					//do nothing
	// 				}
	// 				else
	// 				{
	// 					//if the neghibor hasn't been visited, or the last known cost to get TO the neighbor is higher than the current cost, then add it to the frontier
	// 					var currentCostSoFar = currentFrontierNode.costSoFar;
	// 					var visitedNode = visited.find((x) => {return x.node.id === neighborNodeInQuestion.id;});

	// 					//calculate movement cost
	// 					var movementCost = 1;
	// 					if(worldTile.type == "open")
	// 					{
	// 						movementCost = 1;
	// 					}
	// 					else if (worldTile.type == "water")
	// 					{
	// 						movementCost = 5;
	// 					}

	// 					var newCost = currentCostSoFar + movementCost;

	// 					if(!visitedNode || visitedNode.costSoFar > newCost)
	// 					{
	// 						//calculate heuristic
	// 						var heuristic = manhattanDistanceHeuristicFunction(neighborNodeInQuestion, nodeEnd);

	// 						//add its neighbors to the frontier
	// 						frontier.push({node: neighborNodeInQuestion, costSoFar: newCost, priority: newCost + heuristic});
	// 						visited.push({node: neighborNodeInQuestion, costSoFar: newCost, priority: newCost + heuristic});
										
	// 						//add the one edge to the edge map
	// 						var edgeToAdd = edges.find((x) => {return x.nodeFrom.id === neighborNodeInQuestion.id && x.nodeTo.id === currentFrontierNode.node.id})
	// 						if(edgeToAdd)
	// 						{
	// 							edgeMap.push(edgeToAdd)
	// 						}

	// 						//do another check to see if its the end node.
	// 						if(currentFrontierNode.node.id === nodeEnd.id)
	// 						{
	// 							nodeFound = true;
	// 							break;
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}

	// 	//if the node was found, find it in the visited nodes, and work backwards to the start
	// 	if(nodeFound) {
	// 		path = getPathFromEdgeMap(edgeMap, edges, nodeStart, nodeEnd);
	// 	}

	// 	//debugging
	// 	path.edgeMap = edgeMap;

	// 	return path;
	// }




	
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
	



}

exports.NavGrid = NavGrid;