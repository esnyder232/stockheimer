const {GameServerBaseState} = require('./game-server-base-state.js');
const {GameServerStopping} = require('./game-server-stopping.js');

class GameServerRunning extends GameServerBaseState {
	constructor(gs) {
		super(gs);
	}

	enter(dt) {
		console.log('running server enter');
		super.enter(dt);
	}

	update(dt) {
		//process input here

		
		//update users
		var activeUsers = this.gs.um.getUsersByNotState("user-disconnected-state");

		for(var i = 0; i < activeUsers.length; i++)
		{
			activeUsers[i].update(dt);
		}

		//physics update
		this.gs.world.step(this.gs.physicsTimeStep, this.gs.velocityIterations, this.gs.positionIterations);
		
		//if its time, send 
		this.gs.sendWorldDeltas();

		//update managers
		this.gs.wsm.update();
		this.gs.um.update();

		this.gs.frameNum++;

		super.update(dt);
	}

	exit(dt) {
		console.log('running server exit');
		super.exit(dt);
	}
	
	stopGameRequest() {
		this.gs.nextGameState = new GameServerStopping(this.gs);
	}

	joinRequest() {
		return "success";
	}

}



exports.GameServerRunning = GameServerRunning;