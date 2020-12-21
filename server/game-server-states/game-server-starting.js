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
			this.gs.nextGameState = new GameServerRunning(this.gs);
		}

		//update some managers
		this.gs.tmm.update(dt);

		super.update(dt);
	}

	exit(dt) {
		super.exit(dt);
	}

	mapLoadFinished(tilemapId)
	{
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
