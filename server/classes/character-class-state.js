const planck = require('planck-js');
const logger = require("../../logger.js");

class CharacterClassState {
	constructor(gameServer, character, characterClassStateResource, characterClassInput) {
		this.gs = gameServer;
		this.character = character;
		this.characterClassStateResource = characterClassStateResource;
		this.characterClassStateResourceId = 0;
		this.characterClassInput = characterClassInput;
		this.timeAcc = 0;
		this.type = "one-time";

		this.timeLength = 1000;
		this.canMove = false;
		this.canLook = false;
		this.canFire = false;
		this.canAltFire = false;
		this.projectileKey = null;
		this.projectileTime = 0;
		
		this.projectileFired = false;
		this.cooldownTimeLength = 1000;

		this.updateFunction = null;
		this.specialDashMag = 0;
		this.specialDashTimeStop = 0;
		this.contactDmg = 0;
	}

	enter(dt) {
		// console.log("===== ENTERED " + this.characterClassStateResource.data.name + " STATE");
		//get data from resource
		this.characterClassStateResourceId = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.id);
		this.canLook = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canLook, this.canLook);
		this.canMove = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canMove, this.canMove);
		this.canFire = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canMove, this.canMove);
		this.canAltFire = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canMove, this.canMove);
		this.timeLength = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.timeLength, this.timeLength);
		this.projectileKey = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.projectileKey, this.projectileKey);
		this.projectileTime = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.projectileTime, this.projectileTime);
		this.cooldownTimeLength = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.cooldownTimeLength, this.cooldownTimeLength);
		this.type = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.type, this.type);
		this.specialDashMag = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.specialDashMag, this.specialDashMag);
		this.specialDashTimeStop = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.specialDashTimeStop, this.specialDashTimeStop);
		this.contactDmg = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.contactDmg, this.contactDmg);

		//set characters stuff from data
		this.character.changeAllowMove(this.canMove);
		this.character.changeAllowLook(this.canLook);
		this.character.changeAllowFire(this.canFire);
		this.character.changeAllowAltFire(this.canAltFire);

		//apply cooldown to state on character
		this.character.activateStateCooldown(this.characterClassStateResource.key);

		//more data validation
		if(this.timeLength <= 0) {
			this.timeLength = 35;
		}

		if(this.projectileTime < 0) {
			this.projectileTime = 0;
		}

		//this is just begging to be split up into different classes
		if(this.type === "shield") {
			
		}

		switch(this.type) {
			case "one-time":
				this.updateFunction = this.updateOneTime.bind(this);
				break;
			case "special-dash":
				this.character.startContactDamage(this.contactDmg);
				this.updateFunction = this.updateSpecialDash.bind(this);
				break;
			case "shield": 
				this.updateFunction = this.updateShield.bind(this);
				break;
			default:
				this.updateFunction = this.updateNoType.bind(this);
				break;
			
		}
	}

	update(dt) {
		this.updateFunction(dt);
	}

	exit(dt) {
		// console.log("===== EXITED " + this.characterClassStateResource.data.name + " STATE");
		this.character.changeAllowMove(true);
		this.character.changeAllowFire(true);
		this.character.changeAllowAltFire(true);
		this.character.changeAllowLook(true);
		this.character.stopContactDamage();
	}


	//update function for "one-time" type of states
	updateOneTime(dt) {
		this.timeAcc += dt;

		if(!this.projectileFired && this.timeAcc >= this.projectileTime) {
			this.projectileFired = true;
			
			//check to make sure the projectile resource actually exists
			var projectileResource = this.gs.rm.getResourceByKey(this.projectileKey);

			if(projectileResource !== null) {
				var o = this.gs.gom.createGameObject("projectile");

				o.characterId = this.character.id;
				o.ownerId = this.character.ownerId;
				o.ownerType = this.character.ownerType;
				o.teamId = this.character.teamId;
	
				var pos = this.character.plBody.getPosition();

				o.projectileInit(this.gs, projectileResource, pos.x, pos.y, this.character.frameInputController.characterDirection.value);
			}
		}
		
		if(this.timeAcc >= this.timeLength) {
			this.character.setCharacterClassState(null);
		}
	}


	//update function for "channel" type of states
	// updateChannel(dt) {
	// 	this.timeAcc += dt;

	// 	if(!this.projectileFired && this.timeAcc >= this.projectileTime) {
	// 		this.projectileFired = true;
			
	// 		//check to make sure the projectile resource actually exists
	// 		var projectileResource = this.gs.rm.getResourceByKey(this.projectileKey);

	// 		if(projectileResource !== null) {
	// 			var o = this.gs.gom.createGameObject("projectile");

	// 			o.characterId = this.character.id;
	// 			o.ownerId = this.character.ownerId;
	// 			o.ownerType = this.character.ownerType;
	// 			o.teamId = this.character.teamId;
	
	// 			var pos = this.character.plBody.getPosition();

	// 			o.projectileInit(this.gs, projectileResource, pos.x, pos.y, this.character.frameInputController.characterDirection.value);
	// 		}
	// 	}
		
	// 	if(this.timeAcc >= this.timeLength) {
	// 		this.character.setCharacterClassState(null);
	// 	}
	// }



	//update function for "special-dash" type of states
	updateSpecialDash(dt) {
		this.timeAcc += dt;

		if(this.timeAcc >= this.projectileTime && this.timeAcc <= this.specialDashTimeStop) {
			//add an impulse to the character
			var xDir = Math.cos(this.character.frameInputController.characterDirection.value);
			var yDir = Math.sin(-this.character.frameInputController.characterDirection.value);
			this.character.addForceImpulse(xDir, yDir, this.specialDashMag);
		}

		if(this.timeAcc >= this.timeLength) {
			this.character.setCharacterClassState(null);
		}
	}

	//update for "no types", meaning the data is bad
	updateNoType(dt) {
		this.timeAcc += dt;
		
		if(this.timeAcc >= this.timeLength) {
			this.character.setCharacterClassState(null);
		}
	}

	//update for "shield"
	updateShield(dt) {
		this.timeAcc += dt;

		if(this.character.frameInputController[this.characterClassInput].state === false) {
			this.character.setCharacterClassState(null);
		}
	}



}

exports.CharacterClassState = CharacterClassState
