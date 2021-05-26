const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerRunning} = require('./game-server-running.js');
const {GameServerStopping} = require('./game-server-stopping.js');
const ServerConfig = require("../server-config.json");
var {TeamData, SpectatorTeamSlotNum} = require("../../assets/game-data/team-data.js");

const path = require('path');
const fs = require('fs');
const logger = require('../../logger.js');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class GameServerStarting extends GameServerBaseState {
	constructor(gs) {
		super(gs);
		this.tilemapLoaded = false;
		this.tilemapFailedToLoad = false;
		this.tilemapId = null;
		// this.path = path.join(this.gs.appRoot, "assets/tilemaps/stockheimer-path-testing.json");
		this.path = path.join(this.gs.appRoot, ServerConfig.map_relpath);

	}
	
	enter(dt) {
		logger.log("info", 'Game loop starting.');
		super.enter(dt);
		
		//read in the tile map
		this.gs.tmm.loadTilemap(this.path, this.mapLoadFinished.bind(this), this.mapLoadFailed.bind(this));
	}

	update(dt) {
		
		if(this.tilemapFailedToLoad)
		{
			this.gs.nextGameState = new GameServerStopping(this.gs);
		}
		else if(this.tilemapLoaded)
		{
			//at this point, the tile map is loaded in data. Now process the tilemap to create the game map on the server
			var tm = this.gs.tmm.getTilemapByID(this.tilemapId);

			var ng = this.gs.ngm.createNavGrid();
			ng.init(this.gs, tm.id);

			this.gs.activeNavGrid = ng; //temporary

			//just incase idk
			if(TeamData === undefined)
			{
				TeamData = [];
			}

			//detect if a "spectator" team doesn't exist. If the users don't have a team to join, its going to break stuff on the server.
			var spectatorTeamExists = true;

			if(TeamData.length === 0)
			{
				spectatorTeamExists = false;
			}
			else if(SpectatorTeamSlotNum === undefined || TeamData[SpectatorTeamSlotNum] === undefined)
			{
				spectatorTeamExists = false;
			}

			//create a default "specator" team if one doesn't exist or things get screwed up somehow
			if(!spectatorTeamExists)
			{
				var specSlotNum = TeamData.length + 1;
				TeamData.push({
					name: "Spectator",
					slotNum: specSlotNum
				});

				SpectatorTeamSlotNum = specSlotNum;
			}

			//create teams
			for(var i = 0; i < TeamData.length; i++)
			{
				var temp = this.gs.tm.createTeam();
				temp.teamInit(this.gs);
				temp.name = TeamData[i].name;
				temp.slotNum = TeamData[i].slotNum;
				temp.characterStrokeColor = TeamData[i].characterStrokeColor;
				temp.characterFillColor = TeamData[i].characterFillColor;
				temp.characterTextStrokeColor = TeamData[i].characterTextStrokeColor;
				temp.characterTextFillColor = TeamData[i].characterTextFillColor;
				temp.killFeedTextColor = TeamData[i].killFeedTextColor;
				temp.projectileStrokeColor = TeamData[i].projectileStrokeColor;

				if(TeamData[i].slotNum === SpectatorTeamSlotNum)
				{
					this.gs.tm.assignSpectatorTeamById(temp.id);
				}
			}

			this.gs.nextGameState = new GameServerRunning(this.gs);
		}

		//update some managers
		this.gs.tmm.update(dt);
		this.gs.ngm.update(dt);
		this.gs.tm.update(dt);

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}

	mapLoadFinished(tilemapId)
	{
		this.tilemapId = tilemapId;
		this.tilemapLoaded = true;
	}
	
	mapLoadFailed()
	{
		this.tilemapFailedToLoad = true;
	}

	joinRequest() {
		return "Game is still starting up. Try again in a little bit.";
	}

}



exports.GameServerStarting = GameServerStarting;
