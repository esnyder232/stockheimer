import PlayerGroundBaseState from "./player-ground-base-state.js";
import PlayerGroundIdleState from "./player-ground-idle-state.js";
import PlayerGroundAttackStrongState from "./player-ground-attack-strong-state.js";
import PlayerGroundAttackSWeakState from "./player-ground-attack-weak-state.js";

export default class PlayerGroundWalkState extends PlayerGroundBaseState {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		this.player.sprite.anims.play("slime-walk");
		this.player.sprite.anims.setTimeScale(8/24);
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {
		
		//walk right
		if(this.player.playerController.right.state)
		{
			this.player.sprite.flipX = false;
			this.player.applyWalkForce(1);
		}
		//walk left
		else if(this.player.playerController.left.state)
		{
			this.player.sprite.flipX = true;
			this.player.applyWalkForce(-1);
		}
		//idle
		else
		{
			this.player.sprite.setVelocityX(0);
			this.player.nextState = new PlayerGroundIdleState(this.scene, this.player);
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