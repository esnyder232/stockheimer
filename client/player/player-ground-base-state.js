import PlayerBaseState from "./player-base-state.js";
import PlayerAirAllState from "./player-air-all-state.js";

export default class PlayerGroundBaseState extends PlayerBaseState {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		
		//transfer to in air state
		if(!this.player.sprite.body.blocked.down)
		{
			this.player.nextState = new PlayerAirAllState(this.scene, this.player);
		}

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		super.exit(timeElapsed, dt);
	}
	
}