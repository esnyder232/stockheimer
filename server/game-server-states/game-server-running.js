const {GlobalFuncs} = require('../global-funcs.js');
const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStopping} = require('./game-server-stopping.js');

class GameServerRunning extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(timeElapsed, dt) {
		console.log('running server enter');
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		//process input here

		//physics update
		this.gs.world.step(this.gs.physicsTimeStep, this.gs.velocityIterations, this.gs.positionIterations);
		
		//if its time, send 
		this.gs.sendWorldDeltas();

		//update managers
		this.gs.pm.update();
		this.gs.wsm.update();
		this.gs.um.update();

		this.gs.frameNum++;

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		console.log('running server exit');
		super.exit(timeElapsed, dt);
	}
	
	stopGameRequest() {
		this.gs.nextGameState = new GameServerStopping(this.gs);
	}

	joinRequest() {
		return "success";
	}

}



exports.GameServerRunning = GameServerRunning;