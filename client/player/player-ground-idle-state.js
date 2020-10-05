import PlayerGroundBaseState from "./player-ground-base-state.js";
import PlayerGroundWalkState from "./player-ground-walk-state.js";
import PlayerGroundAttackStrongState from "./player-ground-attack-strong-state.js";
import PlayerGroundAttackSWeakState from "./player-ground-attack-weak-state.js";

export default class PlayerGroundIdleState extends PlayerGroundBaseState {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		this.player.sprite.anims.play("slime-idle");
		this.player.sprite.anims.setTimeScale(8/24);
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {

		//walk left/right
		if(this.player.playerController.right.state || this.player.playerController.left.state)
		{
			this.player.nextState = new PlayerGroundWalkState(this.scene, this.player);
		}

		//add jump force
		if(this.player.playerController.jump.state && !this.player.playerController.jump.prevState)
		{
			this.player.applyJumpForce();
		}

		//attacks
		if(this.player.playerController.attackWeak.state || this.player.playerController.attackWeak.state)
		{
			this.player.nextState = new PlayerGroundAttackSWeakState(this.scene, this.player);
		}
		else if(this.player.playerController.attackStrong.state || this.player.playerController.attackStrong.state)
		{
			this.player.nextState = new PlayerGroundAttackStrongState(this.scene, this.player);
		}

		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		this.player.sprite.anims.stop();
		super.exit(timeElapsed, dt);
	}
}