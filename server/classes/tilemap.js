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
		this.enemySpawnLayer = null;
		this.enemySpawnZones = [];
		this.playerSpawnLayer = null;
		this.playerSpawnZones = [];

		this.navGrid = null;
	}

	init(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	//creates tilemap and navgrid
	//returns true if an error occured. false if everything loaded fine.
	createTilemapAndNavgrid() {
		var bError = false;

		var r = this.gs.rm.getResourceByID(this.resourceId);
		if(r !== null && r.data !== null) {
			this.jsonData = r.data;
		}
		else {
			bError = true;
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
			this.enemySpawnZones = [];
	
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
	
							//a property with "enemySpawns = true" on it will be used for the enemy spawning locations
							if(currentProperty.name.toLowerCase() === "enemyspawns" 
							&& currentProperty.type === "bool"
							&& currentProperty.value === true)
							{
								this.enemySpawnLayer = currentLayer;
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
	
			//create enemy spawn zones
			if(this.enemySpawnLayer !== null && this.enemySpawnLayer.objects)
			{
				var xOffset = -this.tilewidth/2;
				var yOffset = -this.tileheight/2;
				for(var i = 0; i < this.enemySpawnLayer.objects.length; i++)
				{
					var z = this.enemySpawnLayer.objects[i];
	
					z.xPlanck = (z.x + xOffset) / this.tilewidth;
					z.yPlanck = ((z.y + yOffset) / this.tileheight) * -1;
					z.widthPlanck = z.height / this.tilewidth;
					z.heightPlanck = z.height / this.tileheight;
	
					this.enemySpawnZones.push(z);
				}
			}
	
			//create player spawn zones
			if(this.playerSpawnLayer !== null && this.playerSpawnLayer.objects)
			{
				var xOffset = -this.tilewidth/2;
				var yOffset = -this.tileheight/2;
				for(var i = 0; i < this.playerSpawnLayer.objects.length; i++)
				{
					var z = this.playerSpawnLayer.objects[i];
	
					z.xPlanck = (z.x + xOffset) / this.tilewidth;
					z.yPlanck = ((z.y + yOffset) / this.tileheight) * -1;
					z.widthPlanck = z.height / this.tilewidth;
					z.heightPlanck = z.height / this.tileheight;
	
					this.playerSpawnZones.push(z);
				}
			}
		}
		
		//create navgrid
		if(!bError) {
			this.navGrid = new NavGrid();
			this.navGrid.init(this.gs);
			this.navGrid.tm = this;
			this.navGrid.create();
		}

		return bError;
	}

	getNavGrid() {
		return this.navGrid;
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

	
}

exports.Tilemap = Tilemap;