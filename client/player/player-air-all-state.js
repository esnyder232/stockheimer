import PlayerAirBaseState from "./player-air-base-state.js";

export default class PlayerAirAllState extends PlayerAirBaseState {
	constructor(scene, player) {
		super(scene, player);
	}

	enter(timeElapsed, dt) {
		this.calculateAnimation();
		this.player.sprite.anims.setTimeScale(8/24);
		super.enter(timeElapsed, dt);
	}

	update(timeElapsed, dt) {

		if(this.player.playerController.right.state)
		{
			this.player.sprite.flipX = false;
			this.player.applyWalkForce(1);
		}
		else if(this.player.playerController.left.state)
		{
			this.player.sprite.flipX = true;
			this.player.applyWalkForce(-1);
		}
		else
		{
			this.player.sprite.setVelocityX(0);
		}

		this.calculateAnimation();
		super.update(timeElapsed, dt);
	}

	exit(timeElapsed, dt) {
		super.exit(timeElapsed, dt);
	}

	calculateAnimation() {
		//rising
		if(this.player.sprite.body.velocity.y <= 0)
		{
			this.player.sprite.anims.play("slime-rising");
		}
		else{
			this.player.sprite.anims.play("slime-falling");
		}
	}
}