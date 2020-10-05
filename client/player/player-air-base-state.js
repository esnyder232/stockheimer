import PlayerBaseState from "./player-base-state.js";
import PlayerGroundIdleState from "./player-ground-idle-state.js"

export default class PlayerAirBaseState extends PlayerBaseState {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		//transfer to on ground state
		if(this.player.sprite.body.blocked.down)
		{
			this.player.nextState = new PlayerGroundIdleState(this.scene, this.player);
		}

		//add jump force
		if(this.player.playerController.jump.state && !this.player.playerController.jump.prevState)
		{
			this.player.applyJumpForce();
		}
		
		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		super.exit(timeElapsed, dt);
	}
}