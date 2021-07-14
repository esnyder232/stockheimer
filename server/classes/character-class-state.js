
const planck = require('planck-js');
const logger = require("../../logger.js");

class CharacterClassState {
	constructor(gameServer, character, characterClassResource) {
		this.gs = gameServer;
		this.character = character;
		this.characterClassResource = characterClassResource;
		this.tempTimer = 1000;
		this.tempTimerAcc = 0;
	}

	enter(dt) {
		// console.log("===== ENTERED " + this.characterClassResource.data.name + " STATE");
		this.character.changeAllowMove(this.characterClassResource.data.canMove);
		this.character.changeAllowShoot(this.characterClassResource.data.canShoot);
		this.character.changeAllowLook(this.characterClassResource.data.canLook);
		this.tempTimer = this.characterClassResource.data.timeLength >= 0 ? this.characterClassResource.data.timeLength : 1000;

		//spawn a bullet too
		var o = this.gs.gom.createGameObject("projectile");

		o.bulletType = "bullet";
		o.characterId = this.character.id;
		o.ownerId = this.character.ownerId;
		o.ownerType = this.character.ownerType;
		o.teamId = this.character.teamId;

		var pos = this.character.plBody.getPosition();
		o.projectileInit(this.gs, pos.x, pos.y, this.character.frameInputController.characterDirection.value, 0.05, 8, 1000);
	}

	update(dt) {
		this.tempTimerAcc += dt;
		if(this.tempTimerAcc >= this.tempTimer) {
			this.character.setCharacterClassState(null);
		}
	}

	exit(dt) {
		// console.log("===== EXITED " + this.characterClassResource.data.name + " STATE");
		this.character.changeAllowMove(true);
		this.character.changeAllowShoot(true);
		this.character.changeAllowLook(true);
	}
}

exports.CharacterClassState = CharacterClassState
