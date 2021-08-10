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

		this.navGrid = null;
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

		this.navGrid.deinit();
		this.navGrid = null;
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

					z.xPlanck = (z.x + xOffset) / this.tilewidth;
					z.yPlanck = ((z.y + yOffset) / this.tileheight) * -1;
					z.widthPlanck = z.width / this.tilewidth;
					z.heightPlanck = z.height / this.tileheight;
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
		
		//create navgrid
		if(!bError) {
			this.navGrid = new NavGrid();
			this.navGrid.init(this.gs);
			this.navGrid.tm = this;
			this.navGrid.create();
		}

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


	getNavGrid() {
		return this.navGrid;
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

	
}

exports.Tilemap = Tilemap;