// import GlobalFuncs from "../global-funcs.js"
// import ServerEventQueue from "./server-event-queue.js"

// export default class CharacterClassState {
// 	constructor(gameServer, character, characterClassStateResource) {
// 		this.gs = gameServer;
// 		this.character = character;
// 		this.characterClassStateResource = characterClassStateResource;
// 		this.timeAcc = 0;

// 		this.animationSet = null;
// 		this.timeLength = 1000;
// 		this.canMove = false;
// 		this.canLook = false;
// 		this.projectileKey = null;
// 		this.projectileTime = null;
		
// 		this.projectileFired = false;
// 		this.cooldownTimeLength = 1000;
// 	}

// 	enter(dt) {
// 		// console.log("===== ENTERED " + this.characterClassStateResource.data.name + " STATE");
// 		//get data from resource
// 		this.animationSet = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.animationSet);
// 		this.canLook = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canLook, this.canLook);
// 		this.canMove = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canMove, this.canMove);
// 		this.timeLength = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.timeLength, this.timeLength);
// 		this.projectileKey = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.projectileKey, this.projectileKey);
// 		this.projectileTime = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.projectileTime, this.projectileTime);
// 		this.cooldownTimeLength = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.cooldownTimeLength, this.cooldownTimeLength);

// 		//set characters stuff from data
// 		this.character.changeAllowMove(this.canMove);
// 		this.character.changeAllowLook(this.canLook);

// 		//always set character to not allow shooting
// 		this.character.changeAllowShoot(false);

// 		//apply cooldown to state on character
// 		this.character.activateStateCooldown(this.characterClassStateResource.key);

// 		//more data validation
// 		if(this.timeLength <= 0) {
// 			this.timeLength = 35;
// 		}

// 		if(this.projectileTime < 0) {
// 			this.projectileTime = 0;
// 		}
// 	}

// 	update(dt) {
// 		this.timeAcc += dt;

// 		if(!this.projectileFired && this.timeAcc >= this.projectileTime) {
// 			this.projectileFired = true;
			
// 			//check to make sure the projectile resource actually exists
// 			var projectileResource = this.gs.rm.getResourceByKey(this.projectileKey);

// 			if(projectileResource !== null) {
// 				var o = this.gs.gom.createGameObject("projectile");

// 				o.characterId = this.character.id;
// 				o.ownerId = this.character.ownerId;
// 				o.ownerType = this.character.ownerType;
// 				o.teamId = this.character.teamId;
	
// 				var pos = this.character.plBody.getPosition();

// 				o.projectileInit(this.gs, projectileResource, pos.x, pos.y, this.character.frameInputController.characterDirection.value);
// 			}
// 		}
		
// 		if(this.timeAcc >= this.timeLength) {
// 			this.character.setCharacterClassState(null);
// 		}
// 	}

// 	exit(dt) {
// 		// console.log("===== EXITED " + this.characterClassStateResource.data.name + " STATE");
// 		this.character.changeAllowMove(true);
// 		this.character.changeAllowShoot(true);
// 		this.character.changeAllowLook(true);
// 	}
// }
