import GlobalFuncs from "../global-funcs.js";

export default class PlayerBaseState {
	constructor(scene, player) {
		this.scene = scene;
		this.player = player;
		this.globalfuncs = new GlobalFuncs();
	}

	enter(timeElapsed, dt) {}
	update(timeElapsed, dt) {}
	exit(timeElapsed, dt) {
		this.player.sprite.anims.setTimeScale(24);
	}

}