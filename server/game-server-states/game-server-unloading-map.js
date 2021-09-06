const {GameServerBaseState} = require('./game-server-base-state.js');
const GameServerLoadingMap = require('./game-server-loading-map.js');
const GameServerStopped = require('./game-server-stopped.js');
const logger = require('../../logger.js');

//do anything here that involves stopping the game, Like deleting things in memory, saving sessions, anything.
class GameServerUnloadingMap extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		logger.log("info", 'Game Server unloading map ' + this.gs.currentMapResourceKey + "'.");
		
		//tell all users its NOT okay to be in the game anymore
		var activeUsers = this.gs.um.getActiveUsers();
		for(var i = 0; i < activeUsers.length; i++) {
			activeUsers[i].bOkayToBeInTheGame = false;

			//also kick ai users
			if(activeUsers[i].userType === "ai") {
				activeUsers[i].bDisconnected = true;
			}
		}

		/////////////////////////////////////////////
		// Unload everything from the previous map //
		/////////////////////////////////////////////
		//delete all ai agents
		var aiAgents = this.gs.aim.getAIAgents();
		for(var i = 0; i < aiAgents.length; i++) {
			this.gs.aim.destroyAIAgent(aiAgents[i].userId);
		}

		//unload resources
		this.gs.rm.unloadAllResources();

		//unload teams
		var teams = this.gs.tm.getTeams();
		for(var i = 0; i < teams.length; i++) {
			this.gs.tm.destroyTeam(teams[i])
		}

		//unload tilemap and navgrid
		if(this.gs.activeTilemap !== null) {
			this.gs.tmm.destroyTilemap(this.gs.activeTilemap.id);
		}
		this.gs.activeTilemap = null;

		//unload game objects
		var gameObjects = this.gs.gom.getGameObjects();
		for(var i = 0; i < gameObjects.length; i++) {
			this.gs.gom.destroyGameObject(gameObjects[i].id);
		}

		//deactivate the collision system too
		this.gs.cs.deactivate();

		//other stuff
		this.gs.mapTimeLengthReached = false;
		this.gs.currentMatch = 0;
		this.gs.rotateMapNow = false;

		//this is just to give a few update loops so the managers/user can clear themselves out
		this.updateCounter = 0;
		this.updateCounterLimit = 30;

		super.enter(dt);
	}

	update(dt) {
		var activeUsers = this.gs.um.getActiveUsers();
		var userAgents = this.gs.uam.getUserAgents();

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

		//create/send packet for all useragents
		for(var i = 0; i < userAgents.length; i++) {
			var wsh = this.gs.wsm.getWebsocketByID(userAgents[i].wsId);
			if(wsh !== null) {
				wsh.createPacketForUser();
			}
		}
		
		this.updateCounter++;
		if(this.updateCounter > this.updateCounterLimit) {

			//last minute cleanup
			if(this.gs.world !== null) {
				this.gs.world = null;
			}

			//increase the map index for the next map in the rotation		
			this.gs.currentMapIndex++;
			this.gs.currentMapIndex %= this.gs.mapRotation.length;

			if(this.gs.currentMapIndex < 0 || this.gs.currentMapIndex > this.gs.mapRotation.length) {
				this.gs.nextGameState = new GameServerStopped.GameServerStopped(this.gs);
			} else {
				this.gs.nextGameState = new GameServerLoadingMap.GameServerLoadingMap(this.gs);	
			}
			
		}
		
		//update managers
		this.gs.wsm.update(dt);
		this.gs.fm.update(dt);
		this.gs.rm.update(dt);
		this.gs.um.update(dt);
		this.gs.gom.update(dt);
		this.gs.tmm.update(dt);
		this.gs.aim.update(dt);
		this.gs.tm.update(dt);
		this.gs.pm.update(dt);
		this.gs.uam.update(dt);
		this.gs.em.update(dt);
		
		this.gs.frameNum++;

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}

	joinRequest() {
		return "The game has ."; //has what?
	}
}



exports.GameServerUnloadingMap = GameServerUnloadingMap;