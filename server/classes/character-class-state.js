
const planck = require('planck-js');
const logger = require("../../logger.js");

class CharacterClassState {
	constructor(gameServer, character, stateData) {
		this.gs = gameServer;
		this.character = character;
		this.stateData = stateData;
		this.tempTimer = 1000;
		this.tempTimerAcc = 0;
	}

	enter(dt) {
		console.log("===== ENTERED " + this.stateData.name + " STATE");
		this.character.changeAllowMove(false);
		this.character.changeAllowShoot(false);
		this.character.changeAllowLook(false);
		this.character.false;
	}

	update(dt) {
		this.tempTimerAcc += dt;
		if(this.tempTimerAcc >= this.tempTimer) {
			this.character.setNextState(null);
		}
	}

	exit(dt) {
		console.log("===== EXITED " + this.stateData.name + " STATE");
		this.character.changeAllowMove(true);
		this.character.changeAllowShoot(true);
		this.character.changeAllowLook(true);
	}
}

exports.CharacterClassState = CharacterClassState
