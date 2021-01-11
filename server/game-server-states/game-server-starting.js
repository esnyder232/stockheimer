const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerRunning} = require('./game-server-running.js');
const {GameServerStopping} = require('./game-server-stopping.js');
const path = require('path');
const fs = require('fs');

//do anything here that involves starting the game, Like loading the map, pools, loading saved games, sessions, anything.
class GameServerStarting extends GameServerBaseState {
	constructor(gs) {
		super(gs);
		this.tilemapLoaded = false;
		this.tilemapFailedToLoad = false;
		this.tilemapId = null;
		this.path = path.join(this.gs.appRoot, "assets/tilemaps/stockheimer-path-testing.json");
	}
	
	enter(dt) {
		console.log('Game loop starting.');
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

			// //create castle object (temporary location for it)
			// var castle = this.gs.gom.createGameObject("castle");
			// this.gs.castleObject = castle;

			// var xc = this.gs.activeNavGrid.castleNode.x;
			// var yc = -this.gs.activeNavGrid.castleNode.y;

			// castle.castleInit(this.gs, xc, yc);

			// //just activate here, fuckin whatever
			// this.gs.gom.activateGameObjectId(castle.id, castle.castlePostActivated.bind(castle), castle.cbCastleActivatedFailed.bind(castle));

			this.gs.nextGameState = new GameServerRunning(this.gs);
		}

		//update some managers
		this.gs.tmm.update(dt);
		this.gs.ngm.update(dt);

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
