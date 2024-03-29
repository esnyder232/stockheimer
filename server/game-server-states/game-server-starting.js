// const {GameServerBaseState} = require('./game-server-base-state.js');
// const {GameServerRunning} = require('./game-server-running.js');
// const {GameServerStopping} = require('./game-server-stopping.js');
// const path = require("path");
// var {TeamData, SpectatorTeamSlotNum} = require("../../assets/game-data/team-data.js");
// const logger = require('../../logger.js');

// //do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
// class GameServerStarting extends GameServerBaseState {
// 	constructor(gs) {
// 		super(gs);
// 		this.tilemapError = false;
// 	}
	
// 	enter(dt) {
// 		logger.log("info", 'Game loop starting.');
// 		super.enter(dt);

// 		//load classes
// 		for(var i = 0; i < this.gs.classKeyList.length; i++) {
// 			this.gs.rm.loadResource(this.gs.classKeyList[i], "character-class", this.cbCharacterClassComplete.bind(this));
// 		}
		
// 		//load map
// 		this.tilemapToLoad = this.gs.mapKey;
// 		this.gs.rm.loadResource(this.gs.mapKey, "tilemap", this.cbTilemapComplete.bind(this));

// 		//load other static resources that the client needs (temporary until i get it sorted out better)
// 		this.gs.rm.loadResource("data/sprites/castle.json", "sprite");

// 		//create teams
// 		this.createTeams();
// 	}

// 	update(dt) {
// 		var resourcesProcessing = this.gs.rm.anyResourcesProcessing();
// 		if(resourcesProcessing === false) {
// 			this.gs.nextGameState = new GameServerRunning(this.gs);
// 		}

// 		if(this.tilemapError) {
// 			this.gs.nextGameState = new GameServerStopping(this.gs);
// 		}

// 		//update some managers
// 		this.gs.tmm.update(dt);
// 		this.gs.tm.update(dt);
// 		this.gs.rm.update(dt);
// 		this.gs.fm.update(dt);

// 		super.update(dt);
// 	}

// 	exit(dt) {
// 		super.exit(dt);
// 	}

// 	cbCharacterClassComplete(resource) {
// 		// console.log("!!!! Character Class Load Complete !!!!");
// 		var bError = false;
// 		var errorMessage = "";

// 		//need to create sprites, sounds, projectile resources here
// 		if(resource.data === null) {
// 			bError = true;
// 			errorMessage = "Error when loading character class '" + resource.key + "': No data found.";
// 		}

// 		//load sprite resources from animation sets
// 		if(!bError) {
// 			//from animation sets
// 			if(resource.data.animationSets) {
// 				for (const key in resource.data.animationSets) {
// 					if (resource.data.animationSets.hasOwnProperty(key)) {
// 						var animationSet = resource.data.animationSets[key];
// 						if(animationSet["spriteKey"]) {
// 							this.gs.rm.loadResource(animationSet["spriteKey"], "sprite");
// 						}
// 					}
// 				}
// 			}
// 		}

// 		//load sprite resources from death sprite
// 		if(!bError) {
// 			//from animation sets
// 			var sprite = this.globalfuncs.getValueDefault(resource?.data?.deathSpriteKey, null);
// 			if(sprite !== null) {
// 				this.gs.rm.loadResource(sprite, "sprite");
// 			}
// 		}


// 		//load character class state resources
// 		if(!bError) {
// 			var fireStateKey = this.globalfuncs.getValueDefault(resource?.data?.fireStateKey, null);
// 			var altFireStateKey = this.globalfuncs.getValueDefault(resource?.data?.altFireStateKey, null);

// 			if(fireStateKey !== null) {
// 				this.gs.rm.loadResource(fireStateKey, "character-class-state", this.cbCharacterClassStateComplete.bind(this));
// 			}

// 			if(altFireStateKey !== null) {
// 				this.gs.rm.loadResource(altFireStateKey, "character-class-state", this.cbCharacterClassStateComplete.bind(this));
// 			}
// 		}
		

// 		if(bError) {
// 			logger.log("error", errorMessage);
// 		}
// 	}

// 	cbTilemapComplete(resource) {
// 		// console.log("!!!! Tilemap resource load complete !!!!");
// 		var bError = false;
// 		var errorMessage = "";
// 		var tm = null;

// 		if(resource.data === null) {
// 			bError = true;
// 			errorMessage = "Error when loading tilemap '" + resource.key + "': No data found.";
// 		}

// 		//create the tilemap and navgrid
// 		if(!bError) {
// 			tm = this.gs.tmm.createTilemap(resource.id);
// 			tm.init(this.gs);
// 			bError = tm.createTilemapAndNavgrid();

// 			if(!bError) {
// 				this.gs.activeTilemap = tm;
// 				this.gs.activeNavGrid = tm.getNavGrid();
// 			}
// 			else {
// 				errorMessage = "Error occured when creating tilemap and navgrid for tilemap '" + resource.key + "'.";
// 			}
// 		}

// 		//create tileset resources
// 		if(!bError) {
// 			for(var i = 0; i < resource.data.tilesets.length; i++) {
// 				var currentTileset = resource.data.tilesets[i];
// 				var tilesetKey = path.join(resource.key, "..", currentTileset.image);
// 				tilesetKey = tilesetKey.replace(/\\/g, "/");

// 				//put the tilesetkey on the data as well so the client knows which tilesets to load for phaser
// 				currentTileset.tilesetKey = tilesetKey;

// 				this.gs.rm.loadResource(tilesetKey, "tileset");
// 			}
// 		}

// 		if(bError) {
// 			logger.log("error", errorMessage);
// 			this.tilemapError = true;
// 		}
// 	}

// 	cbProjectileComplete(resource) {
// 		// console.log("!!! Projectile Resource Loaded !!!!");
// 		// console.log(resource);
// 		var bError = false;
// 		var errorMessage = "";
// 		var tm = null;

// 		if(resource.data === null) {
// 			bError = true;
// 			errorMessage = "Error when loading projectile '" + resource.key + "': No data found.";
// 		}

// 		//create sprite resources
// 		if(!bError) {
// 			var spriteKey = this.globalfuncs.getValueDefault(resource?.data?.renderData?.spriteKey, null);

// 			if(spriteKey !== null) {
// 				this.gs.rm.loadResource(spriteKey, "sprite");
// 			}
// 		}

// 		if(bError) {
// 			logger.log("error", errorMessage);
// 			this.tilemapError = true;
// 		}
// 	}



// 	cbCharacterClassStateComplete(resource) {
// 		// console.log("!!! Character Class STAte Resource Loaded !!!!");
// 		// console.log(resource);
		
// 		var bError = false;
// 		var errorMessage = "";
// 		var tm = null;

// 		if(resource.data === null) {
// 			bError = true;
// 			errorMessage = "Error when loading character class state '" + resource.key + "': No data found.";
// 		}

// 		//load projectile resources
// 		if(!bError) {
// 			var projectileKey = this.globalfuncs.getValueDefault(resource?.data?.projectileKey, null);

// 			if(projectileKey !== null) {
// 				this.gs.rm.loadResource(projectileKey, "projectile", this.cbProjectileComplete.bind(this));
// 			}
// 		}

// 		if(bError) {
// 			logger.log("error", errorMessage);
// 			this.tilemapError = true;
// 		}
// 	}
	

	
// 	createTeams() {
// 		//just incase idk
// 		if(TeamData === undefined) {
// 			TeamData = [];
// 		}

// 		//detect if a "spectator" team doesn't exist. If the users don't have a team to join, its going to break stuff on the server.
// 		var spectatorTeamExists = true;

// 		if(TeamData.length === 0)
// 		{
// 			spectatorTeamExists = false;
// 		}
// 		else if(SpectatorTeamSlotNum === undefined || TeamData[SpectatorTeamSlotNum] === undefined)
// 		{
// 			spectatorTeamExists = false;
// 		}

// 		//create a default "specator" team if one doesn't exist or things get screwed up somehow
// 		if(!spectatorTeamExists)
// 		{
// 			var specSlotNum = TeamData.length + 1;
// 			TeamData.push({
// 				name: "Spectator",
// 				slotNum: specSlotNum
// 			});

// 			SpectatorTeamSlotNum = specSlotNum;
// 		}

// 		//create teams
// 		for(var i = 0; i < TeamData.length; i++)
// 		{
// 			var temp = this.gs.tm.createTeam();
// 			temp.teamInit(this.gs);
// 			temp.name = TeamData[i].name;
// 			temp.slotNum = TeamData[i].slotNum;
// 			temp.characterStrokeColor = TeamData[i].characterStrokeColor;
// 			temp.characterFillColor = TeamData[i].characterFillColor;
// 			temp.characterTextStrokeColor = TeamData[i].characterTextStrokeColor;
// 			temp.characterTextFillColor = TeamData[i].characterTextFillColor;
// 			temp.killFeedTextColor = TeamData[i].killFeedTextColor;
// 			temp.projectileStrokeColor = TeamData[i].projectileStrokeColor;
// 			temp.characterTintColor = TeamData[i].characterTintColor;

// 			if(TeamData[i].slotNum === SpectatorTeamSlotNum)
// 			{
// 				this.gs.tm.assignSpectatorTeamById(temp.id);
// 			}
// 		}
// 	}

// 	joinRequest() {
// 		return "Game is still starting up. Try again in a little bit.";
// 	}
// }



// exports.GameServerStarting = GameServerStarting;
