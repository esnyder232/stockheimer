const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerRunning} = require('./game-server-running.js');
const GameServerStopping = require('./game-server-stopping.js');
const GameServerUnloadingMap = require('./game-server-unloading-map.js');

const path = require("path");
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class GameServerLoadingMap extends GameServerBaseState {
	constructor(gs) {
		super(gs);
		this.mapLoadError = false;
	}
	
	enter(dt) {
		super.enter(dt);

		//reset some stuff
		this.gs.minimumUsersPlaying = 0;
		this.gs.cache.clearCache();

		if(this.gs.currentMapIndex >= 0 && this.gs.currentMapIndex < this.gs.mapRotation.length) {
			this.gs.currentMapResourceKey = this.gs.mapRotation[this.gs.currentMapIndex];

			logger.log("info", 'Game server now loading map ' + this.gs.currentMapResourceKey);
			this.gs.rm.loadResource(this.gs.currentMapResourceKey, "map", this.cbMapComplete.bind(this));
		}
		else {
			logger.log("error", "Error: no maps found in map rotation. Stopping server.");
			this.gs.nextGameState = new GameServerStopping.GameServerStopping(this.gs);
		}
	}

	update(dt) {
		var activeUsers = this.gs.um.getActiveUsers();
		var userAgents = this.gs.uam.getUserAgents();

		//process client packets
		for(var i = 0; i < userAgents.length; i++) {
			var wsh = this.gs.wsm.getWebsocketByID(userAgents[i].wsId);
			if(wsh !== null) {
				wsh.processClientPackets();
			}
		}

		//process client events
		for(var i = 0; i < activeUsers.length; i++) {
			activeUsers[i].processClientEvents();
		}

		//update users
		for(var i = 0; i < activeUsers.length; i++) {
			activeUsers[i].update(dt);
		}

		//update user agents to fill each user's packet with events
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].update(dt);
		}

		//create packet for all useragents
		for(var i = 0; i < userAgents.length; i++) {
			var wsh = this.gs.wsm.getWebsocketByID(userAgents[i].wsId);
			if(wsh !== null) {
				wsh.createPacketForUser();
			}
		}

		//send packet for all useragents
		for(var i = 0; i < userAgents.length; i++) {
			var wsh = this.gs.wsm.getWebsocketByID(userAgents[i].wsId);
			if(wsh !== null) {
				wsh.sendPacketForUser();
			}
		}

		var resourcesProcessing = this.gs.rm.anyResourcesProcessing();
		if(resourcesProcessing === false) {
			this.gs.nextGameState = new GameServerRunning(this.gs);
		}

		if(this.mapLoadError) {
			this.gs.nextGameState = new GameServerUnloadingMap.GameServerUnloadingMap(this.gs);
		}

		//update managers
		this.gs.wsm.update(dt);
		this.gs.um.update(dt);
		this.gs.gom.update(dt);
		this.gs.tmm.update(dt);
		this.gs.aim.update(dt);
		this.gs.tm.update(dt);
		this.gs.pm.update(dt);
		this.gs.uam.update(dt);
		this.gs.rm.update(dt);
		this.gs.fm.update(dt);


		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
		
		//last things to do here before you load the game
		//calculate the healsToPointsRatio (this is used convert healing points into actual points in round results)
		//for now, just use the smallest hp class
		var characterClasses = this.gs.rm.getResourceByType("character-class");
		var smallestHpClass = null;
		var smallestHp = 0;

		smallestHpClass = characterClasses.reduce((acc, cur) => {
			var hpCur = this.globalfuncs.getValueDefault(cur.data?.hp, 1);
			var hpPrev = this.globalfuncs.getValueDefault(acc.data?.hp, 1);
			return hpCur < hpPrev ? cur : acc;
		});

		smallestHp = this.globalfuncs.getValueDefault(smallestHpClass?.data?.hp, 0);

		this.gs.healsToPointsRatio = smallestHp;
		if(this.gs.healsToPointsRatio <= 0) { 
			this.gs.healsToPointsRatio = 1;
		}
	}

	cbMapComplete(resource) {
		var bError = false;
		var errorMessage = "";

		if(resource.data === null) {
			bError = true;
			this.mapLoadError = true;
			errorMessage = "Error when loading map '" + resource.key + "': No data found.";
		}
		else {
			this.gs.currentMapResourceKey = resource.key;
			this.gs.currentMapResource = resource;
		}

		//create planck world
		if(!bError) {
			if(!this.gs.world) {
				this.gs.world = this.gs.pl.World({
					gravity: this.gs.pl.Vec2(0, 0)
				});
			}

			//activate the collision system too
			this.gs.cs.activate();
		}

		if(!bError) {
			this.gs.currentGameType = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.gameData?.type, "deathmatch");
			this.gs.matchWinCondition = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.gameData?.matchWinCondition, 1);
		}


		//load classes
		if(!bError) {
			var classData = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.classData, []);
			for(var i = 0; i < classData.length; i++) {
				this.gs.rm.loadResource(classData[i], "character-class", this.cbCharacterClassComplete.bind(this));
			}
		}

		//load tilemap
		if(!bError) {
			var tilemapResource = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.tilemapResource, null);
			if(tilemapResource !== null) {
				this.gs.rm.loadResource(tilemapResource, "tilemap", this.cbTilemapComplete.bind(this));
			} else {
				logger.log("error", "Error: No tilemap data.");
				this.mapLoadError = true
			}
		}

		//create teams
		if(!bError) {
			var teamData = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.teamData, []);
			var spectatorTeamSlotNum = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.spectatorTeamSlotNum, null);

			//detect if a "spectator" team doesn't exist. If the users don't have a team to join, its going to break stuff on the server.
			var spectatorTeamExists = true;

			if(teamData.length === 0) {
				spectatorTeamExists = false;
			}
			else if(spectatorTeamSlotNum === null) {
				spectatorTeamExists = false;
			}

			//create a default "specator" team if one doesn't exist or things get screwed up somehow
			if(!spectatorTeamExists)
			{
				spectatorTeamSlotNum = teamData.length + 1;
				teamData.push({
					name: "Spectator",
					slotNum: spectatorTeamSlotNum
				});
			}

			//create teams
			for(var i = 0; i < teamData.length; i++) {
				var temp = this.gs.tm.createTeam();
				temp.teamInit(this.gs);
				temp.name = this.globalfuncs.getValueDefault(teamData[i].name, "Team " + i);
				temp.slotNum = this.globalfuncs.getValueDefault(teamData[i].slotNum, i);
				temp.characterStrokeColor = this.globalfuncs.getValueDefault(teamData[i].characterStrokeColor, "#ffffff");
				temp.characterFillColor = this.globalfuncs.getValueDefault(teamData[i].characterFillColor, "#ffffff");
				temp.characterTextStrokeColor = this.globalfuncs.getValueDefault(teamData[i].characterTextStrokeColor, "#ffffff");
				temp.characterTextFillColor = this.globalfuncs.getValueDefault(teamData[i].characterTextFillColor, "#ffffff");
				temp.killFeedTextColor = this.globalfuncs.getValueDefault(teamData[i].killFeedTextColor, "#CCCCCC");
				temp.projectileStrokeColor = this.globalfuncs.getValueDefault(teamData[i].projectileStrokeColor, "#000000");
				temp.characterTintColor = this.globalfuncs.getValueDefault(teamData[i].characterTintColor, "#ffffff");
				temp.characterPrimaryColor = this.globalfuncs.getValueDefault(teamData[i].characterPrimaryColor, "#ffffff");
				temp.characterPrimaryColorReplace = this.globalfuncs.getValueDefault(teamData[i].characterPrimaryColorReplace, "#ffffff");
				temp.characterSecondaryColor = this.globalfuncs.getValueDefault(teamData[i].characterSecondaryColor, "#ffffff");
				temp.characterSecondaryColorReplace = this.globalfuncs.getValueDefault(teamData[i].characterSecondaryColorReplace, "#ffffff");
				temp.projectileColor1 = this.globalfuncs.getValueDefault(teamData[i].projectileColor1, "#ffffffff");
				temp.projectileColor1Replace = this.globalfuncs.getValueDefault(teamData[i].projectileColor1Replace, "#ffffffff");
				temp.projectileColor2 = this.globalfuncs.getValueDefault(teamData[i].projectileColor2, "#ffffffff");
				temp.projectileColor2Replace = this.globalfuncs.getValueDefault(teamData[i].projectileColor2Replace, "#ffffffff");
				temp.projectileColor3 = this.globalfuncs.getValueDefault(teamData[i].projectileColor3, "#ffffffff");
				temp.projectileColor3Replace = this.globalfuncs.getValueDefault(teamData[i].projectileColor3Replace, "#ffffffff");
				temp.projectileColor4 = this.globalfuncs.getValueDefault(teamData[i].projectileColor4, "#ffffffff");
				temp.projectileColor4Replace = this.globalfuncs.getValueDefault(teamData[i].projectileColor4Replace, "#ffffffff");
				temp.controlPointOwnerColor = this.globalfuncs.getValueDefault(teamData[i].controlPointOwnerColor, "#ffffffff");
				temp.controlPointCaptureColor = this.globalfuncs.getValueDefault(teamData[i].controlPointCaptureColor, "#ffffffff");

				if(teamData[i].slotNum === spectatorTeamSlotNum) {
					this.gs.tm.assignSpectatorTeamById(temp.id);
				}
			}
		}

		//other stuff
		this.gs.minimumUsersPlaying = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.minimumUsersPlaying, 0);
		this.gs.mapTimeLength = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.mapTimeLength, this.gs.mapTimeLengthDefault);
		this.gs.mapMinMatch = this.globalfuncs.getValueDefault(this.gs.currentMapResource.data?.mapMinMatch, this.gs.mapMinMatchDefault);
		
	}

	cbCharacterClassComplete(resource) {
		// console.log("!!!! Character Class Load Complete !!!!");
		var bError = false;
		var errorMessage = "";

		//need to create sprites, sounds, projectile resources here
		if(resource.data === null) {
			bError = true;
			errorMessage = "Error when loading character class '" + resource.key + "': No data found.";
		}

		//load sprite resources from animation sets
		if(!bError) {
			//from animation sets
			if(resource.data.animationSets) {
				for (const key in resource.data.animationSets) {
					if (resource.data.animationSets.hasOwnProperty(key)) {
						var animationSet = resource.data.animationSets[key];
						if(animationSet["spriteKey"]) {
							this.gs.rm.loadResource(animationSet["spriteKey"], "sprite");
						}
					}
				}
			}
		}

		//load sprite resources from death sprite
		if(!bError) {
			//from animation sets
			var sprite = this.globalfuncs.getValueDefault(resource?.data?.deathSpriteKey, null);
			if(sprite !== null) {
				this.gs.rm.loadResource(sprite, "sprite");
			}
		}


		//load character class state resources
		if(!bError) {
			var fireStateKey = this.globalfuncs.getValueDefault(resource?.data?.fireStateKey, null);
			var altFireStateKey = this.globalfuncs.getValueDefault(resource?.data?.altFireStateKey, null);

			if(fireStateKey !== null) {
				this.gs.rm.loadResource(fireStateKey, "character-class-state", this.cbCharacterClassStateComplete.bind(this));
			}

			if(altFireStateKey !== null) {
				this.gs.rm.loadResource(altFireStateKey, "character-class-state", this.cbCharacterClassStateComplete.bind(this));
			}
		}


		//load character ai class resources
		if(!bError) {
			var aiClasses = this.globalfuncs.getValueDefault(resource?.data?.aiClasses, null);
			if(aiClasses !== null) {
				//first try to use in based on the gametype
				var aiClassToUse = aiClasses.find((x) => {return x.gameType === this.gs.currentGameType});

				//if nothing was found, try to use the ones in the "other" category
				if(aiClassToUse === undefined) {
					aiClassToUse = aiClasses.find((x) => {return x.gameType === "other"});
				}

				var aiClassResourceKey = this.globalfuncs.getValueDefault(aiClassToUse?.aiClassResourceKey, null);

				//also assign the key to the character class resource so other systems can know which one to use
				resource.data.aiClassResourceKey = aiClassResourceKey;

				//now load in the ai class resource
				if(aiClassResourceKey !== null) {
					this.gs.rm.loadResource(aiClassResourceKey, "ai-class", this.cbAIClassComplete.bind(this));
				}
			}
		}

		if(bError) {
			logger.log("error", errorMessage);
		}
	}

	cbTilemapComplete(resource) {
		// console.log("!!!! Tilemap resource load complete !!!!");
		var bError = false;
		var errorMessage = "";
		var tm = null;

		if(resource.data === null) {
			bError = true;
			errorMessage = "Error when loading tilemap '" + resource.key + "': No data found.";
		}

		//create the tilemap and navgrid
		if(!bError) {
			tm = this.gs.tmm.createTilemap(resource.id);
			tm.init(this.gs);
			bError = tm.createTilemapAndNavgrid();

			if(!bError) {
				this.gs.activeTilemap = tm;
			}
			else {
				errorMessage = "Error occured when creating tilemap and navgrid for tilemap '" + resource.key + "'.";
			}
		}

		//create tileset resources
		if(!bError) {
			for(var i = 0; i < resource.data.tilesets.length; i++) {
				var currentTileset = resource.data.tilesets[i];
				var tilesetKey = path.join(resource.key, "..", currentTileset.image);
				tilesetKey = tilesetKey.replace(/\\/g, "/");

				//put the tilesetkey on the data as well so the client knows which tilesets to load for phaser
				currentTileset.tilesetKey = tilesetKey;

				this.gs.rm.loadResource(tilesetKey, "tileset");
			}
		}

		if(bError) {
			logger.log("error", errorMessage);
			this.mapLoadError = true;
		}
	}

	cbProjectileComplete(resource) {
		// console.log("!!! Projectile Resource Loaded !!!!");
		// console.log(resource);
		var bError = false;
		var errorMessage = "";

		if(resource.data === null) {
			bError = true;
			errorMessage = "Error when loading projectile '" + resource.key + "': No data found.";
		}

		//create sprite resources
		if(!bError) {
			var spriteKey = this.globalfuncs.getValueDefault(resource?.data?.renderData?.spriteKey, null);

			if(spriteKey !== null) {
				this.gs.rm.loadResource(spriteKey, "sprite");
			}
		}

		if(bError) {
			logger.log("error", errorMessage);
			this.mapLoadError = true;
		}
	}



	cbCharacterClassStateComplete(resource) {
		// console.log("!!! Character Class STAte Resource Loaded !!!!");
		// console.log(resource);
		
		var bError = false;
		var errorMessage = "";

		if(resource.data === null) {
			bError = true;
			errorMessage = "Error when loading character class state '" + resource.key + "': No data found.";
		}

		//load projectile resources if any
		if(!bError) {

			var stateType = this.globalfuncs.getValueDefault(resource?.data?.type, "one-time");

			switch(stateType) {
				case "one-time":
					var projectileKey = this.globalfuncs.getValueDefault(resource?.data?.projectileKey, null);

					if(projectileKey !== null) {
						this.gs.rm.loadResource(projectileKey, "projectile", this.cbProjectileComplete.bind(this));
					}
					break;

				case "persistent-projectile":
					var persistentProjectileKey = this.globalfuncs.getValueDefault(resource?.data?.persistentProjectileKey, null);

					if(persistentProjectileKey !== null) {
						this.gs.rm.loadResource(persistentProjectileKey, "persistent-projectile", this.cbPersistentProjectileComplete.bind(this));
					}
					break;
				
				case "special-dash":
					//nothing for now
					break;

				case "hitscan":
					var hitscanKey = this.globalfuncs.getValueDefault(resource?.data?.hitscanKey, null);

					if(hitscanKey !== null) {
						this.gs.rm.loadResource(hitscanKey, "hitscan", this.cbHitscanComplete.bind(this));
					}
					break;

				default:
					//nothing
					break;
			}
		}

		if(bError) {
			logger.log("error", errorMessage);
			this.mapLoadError = true;
		}
	}

	cbPersistentProjectileComplete(resource) {
		var bError = false;
		var errorMessage = "";

		if(resource.data === null) {
			bError = true;
			errorMessage = "Error when loading persistent projectile '" + resource.key + "': No data found.";
		}

		//create sprite resources
		if(!bError) {
			var spriteKey = this.globalfuncs.getValueDefault(resource?.data?.renderData?.spriteKey, null);

			if(spriteKey !== null) {
				this.gs.rm.loadResource(spriteKey, "sprite");
			}
		}

		if(bError) {
			logger.log("error", errorMessage);
			this.mapLoadError = true;
		}
	}


	cbHitscanComplete(resource) {
		var bError = false;
		var errorMessage = "";

		if(resource.data === null) {
			bError = true;
			errorMessage = "Error when loading hitscan resource '" + resource.key + "': No data found.";
		}

		// //create sprite resources
		// if(!bError) {
		// 	var spriteKey = this.globalfuncs.getValueDefault(resource?.data?.renderData?.spriteKey, null);

		// 	if(spriteKey !== null) {
		// 		this.gs.rm.loadResource(spriteKey, "sprite");
		// 	}
		// }

		if(bError) {
			logger.log("error", errorMessage);
			this.mapLoadError = true;
		}
	}

	


	cbAIClassComplete(resource) {
		var bError = false;
		var errorMessage = "";

		if(resource.data === null) {
			bError = true;
			errorMessage = "Error when loading AI Class '" + resource.key + "': No data found.";
		}

		if(bError) {
			logger.log("error", errorMessage);
			this.mapLoadError = true;
		}
	}
}



exports.GameServerLoadingMap = GameServerLoadingMap;
