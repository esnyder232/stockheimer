const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerUnloadingMap} = require('./game-server-unloading-map.js');
const {AiConnectingState} = require('../user/ai-connecting-state.js');
const {Round} = require('../classes/round.js');
const GameConstants = require('../../shared_files/game-constants.json');

const logger = require('../../logger.js');

class GameServerRunning extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		logger.log("info", 'running server enter');
		super.enter(dt);

		//start a round
		this.gs.theRound = new Round();
		this.gs.theRound.roundInit(this.gs);

		//make a little summary message for the server logs
		var startSummaryArray = [];
		startSummaryArray.push("\n");
		startSummaryArray.push("===== Game has started =====");
		startSummaryArray.push("Map Name: " + this.gs.currentMapResource.data?.name);
		startSummaryArray.push("Map Resource: " + this.gs.currentMapResource.key);
		startSummaryArray.push("");

		var availableClasses = this.gs.rm.getResourceByType("character-class");
		var availableTeams = this.gs.tm.getTeams();
		
		startSummaryArray.push("Available Teams:");
		for(var i = 0; i < availableTeams.length; i++) {
			startSummaryArray.push(" - " + availableTeams[i].name);
		}
		startSummaryArray.push("");

		startSummaryArray.push("Available Classes:")
		for(var i = 0; i < availableClasses.length; i++) {
			startSummaryArray.push(" - " + availableClasses[i].key);
		}
		
		startSummaryArray.push("============================");

		this.gs.bServerMapLoaded = true;
		this.gs.rebalanceTeams = true; //set to true to spawn ai
		this.gs.mapTimeAcc = 0;

		logger.log("info", startSummaryArray.join("\n"));
	}

	update(dt) {
		// logger.log("info", "gameloop framenum " + this.gs.frameNum);
		var activeUsers = this.gs.um.getActiveUsers();
		var userAgents = this.gs.uam.getUserAgents();
		var activeGameObjects = this.gs.gom.getActiveGameObjects();
		var aiAgents = this.gs.aim.getAIAgents();
		var teams = this.gs.tm.getTeams();
		
		//process incoming messages here (might be split up based on type of messages later. Like process input HERE, and other messages later)
		for(var i = 0; i < activeUsers.length; i++) {
			activeUsers[i].processClientEvents();
		}

		//update users
		for(var i = 0; i < activeUsers.length; i++) {
			activeUsers[i].update(dt);
		}

		//update ai
		for(var i = 0; i < aiAgents.length; i++) {
			aiAgents[i].update(dt);
		}

		//update characters
		for(var i = 0; i < activeGameObjects.length; i++) {
			activeGameObjects[i].update(dt);
		}

		//physics update
		this.gs.world.step(dt/1000, this.gs.velocityIterations, this.gs.positionIterations);


		//update teams
		for(var i = 0; i < teams.length; i++) {
			teams[i].update(dt);
		}

		//update round
		this.gs.theRound.update(dt);

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

		//post packet send update for gameobjects
		for(var i = 0; i < activeGameObjects.length; i++) {
			activeGameObjects[i].postWebsocketUpdate(dt);
		}

		if(this.gs.rebalanceTeams) {
			this.gs.rebalanceTeams = false;
			this.gs.globalfuncs.balanceAiUsersOnTeams(this.gs);
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

		this.gs.frameNum++;

		this.gs.mapTimeAcc += dt;
		if(!this.gs.rotateMapAfterCurrentRound && this.gs.mapTimeAcc >= this.gs.mapTimeLength) {
			logger.log("info", "Map time length has been reached. Rotating maps after current round is over.");
			this.gs.rotateMapAfterCurrentRound = true;
		}

		if(this.gs.rotateMapNow) {
			this.gs.nextGameState = new GameServerUnloadingMap(this.gs);
		}

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		this.gs.bServerMapLoaded = false;

		//tell every connected client that it is NOT okay to be in the game right now
		var activeUsers = this.gs.um.getActiveUsers();
		for(var i = 0; i < activeUsers.length; i++) {
			activeUsers[i].bOkayToBeInTheGame = false;
		}

		this.gs.theRound.deinit();
		this.gs.theRound = null;
	}
	
	stopGameRequest() {
		this.gs.nextGameState = new GameServerStopping(this.gs);
	}

	joinRequest() {
		return "success";
	}

	//if ai user fails to be activated
	cbAiUserActivateFail(id, failedReason) {
		//logger.log("info", 'user activation failed CB called');

		var user = this.gs.um.getUserByID(id);

		//unsetup the users state
		if(user !== null){
			user.nextState = null;
			
			//destroy the aiAgent
			var aiAgent = this.gs.aim.getAIAgentByID(user.aiAgentId);
			if(aiAgent !== null) {
				this.gs.aim.destroyAIAgent(aiAgent.id);
			}
		}
	}


	destroyOwnersCharacter(ownerId, ownerType)
	{
		var owner = this.gs.globalfuncs.getOwner(this.gs, ownerId, ownerType);

		//as long as they have an existing character, kill it.
		if(owner !== null && owner.characterId !== null)
		{
			var c = this.gs.gom.getGameObjectByID(owner.characterId);

			if(c && c.ownerId === owner.id)
			{
				this.gs.gom.destroyGameObject(c.id);
			}
		}
	}

	characterDied(characterId) {
		var c = this.gs.gom.getGameObjectByID(characterId);

		if(c !== null)
		{
			//get the killer
			var killerOwner = this.gs.globalfuncs.getOwner(this.gs, c.lastHitByOwnerId, c.lastHitByOwnerType);

			//get the victim
			var victimOwner = this.gs.globalfuncs.getOwner(this.gs, c.ownerId, c.ownerType);

			//increase the users killcount if applicable, and announce it in the kill feed.
			//This will probably be gone later or moved somewhere else later.
			if(killerOwner !== null && victimOwner !== null)
			{
				//if the killer is a user, increase that user's killcount
				if(c.lastHitByOwnerType === "user")
				{
					if(killerOwner.id !== victimOwner.id && c.ownerType === "user")
					{
						killerOwner.updateKillCount(1);
						victimOwner.updateDeathsCount(1);

						//give a point to the team as well
						var killerTeam = this.gs.tm.getTeamByID(killerOwner.teamId);
						if(killerTeam !== null) {
							killerTeam.modRoundPoints(1);
						}
						
					}
				}

				//announce the killer and victim in the kill feed
				var killFeedMessage = "";

				if(killerOwner.id === victimOwner.id && c.ownerType === "user")
				{
					killFeedMessage = killerOwner.username + " decided to kill himself."
				}
				else
				{
					killFeedMessage = killerOwner.username + " killed " + victimOwner.username;
				}

				logger.log("info", killFeedMessage);

				var killerType = GameConstants.OwnerTypes[c.lastHitByOwnerType];
				var victimType = GameConstants.OwnerTypes[c.ownerType];

				if(killerType === undefined) {
					killerType = GameConstants.OwnerTypes["none"];
				}

				if(victimType === undefined) {
					victimType = GameConstants.OwnerTypes["none"];
				}

				//create event for clients for killfeed
				var userAgents = this.gs.uam.getUserAgents();
				for(var i = 0; i < userAgents.length; i++)
				{
					userAgents[i].insertServerToClientEvent({
						"eventName": "killFeedMsg",
						"killerId": killerOwner.id,
						"killerType": killerType,
						"killerName": killerOwner.username,
						"killerTeam": killerOwner.teamId,
						"victimId": victimOwner.id,
						"victimType": victimType,
						"victimName": victimOwner.username,
						"victimTeam": victimOwner.teamId
					});
				}
			}
		}
	}
}



exports.GameServerRunning = GameServerRunning;