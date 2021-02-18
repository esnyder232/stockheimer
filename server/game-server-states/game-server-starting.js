const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerRunning} = require('./game-server-running.js');
const {GameServerStopping} = require('./game-server-stopping.js');
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
		this.path = path.join(this.gs.appRoot, "assets/tilemaps/stockheimer-techdemo.json");
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

			//create teams (probably temporary place for it)
			var t1 = this.gs.tm.createTeam();
			var t2 = this.gs.tm.createTeam();
	
			t1.name = "Red Team askeujrghnluisehrng lsiuhergl i78shaerog8li7huseor8g7hbselirtughnlsieu5h4ng liasuerhgliuaeshrbvl98s7aeyh45l iguo38e7hgbv5oli9s78ehrno8vbhauseli78rbhskliertuhbks7uiretghlbw4t";
			t2.name = "Blue Team iuehrg897her897yhoe38974yg938o74 hgo3874 yho8347y9873hyo847 h34oi 7uh3og48i huo34897 hl34io u8hl3 k4jnliukjbnklyivgbwkliurhoe847hg3oli4ughl3ier78yhgvliweurhgiow8736g4huierghuioergbujnilsertghuljniko";

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
