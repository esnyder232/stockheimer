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
		this.stateSpeed = this.character.originalSpeed;

		this.hitscanKey = null;
		
		this.projectileFired = false;
		this.cooldownTimeLength = 1000;

		this.updateFunction = null;
		this.specialDashMag = 0;
		this.specialDashTimeStop = 0;
		this.contactDmg = 0;

		this.persistentProjectileKey = null;
		this.tempShieldRechargeAmount = 0;
	}

	enter(dt) {
		// console.log("===== ENTERED " + this.characterClassStateResource.data.name + " STATE");
		//get data from resource
		this.characterClassStateResourceId = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.id);
		this.canLook = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canLook, this.canLook);
		this.canMove = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canMove, this.canMove);
		this.canFire = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canFire, this.canFire);
		this.canAltFire = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canAltFire, this.canAltFire);
		this.timeLength = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.timeLength, this.timeLength);
		this.projectileKey = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.projectileKey, this.projectileKey);
		this.projectileTime = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.projectileTime, this.projectileTime);
		this.cooldownTimeLength = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.cooldownTimeLength, this.cooldownTimeLength);
		this.type = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.type, this.type);
		this.specialDashMag = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.specialDashMag, this.specialDashMag);
		this.specialDashTimeStop = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.specialDashTimeStop, this.specialDashTimeStop);
		this.contactDmg = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.contactDmg, this.contactDmg);
		
		this.hitscanKey = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.hitscanKey, this.hitscanKey);

		this.persistentProjectileKey = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.persistentProjectileKey, this.persistentProjectileKey);
		this.persistentProjectileTime = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.persistentProjectileTime, this.persistentProjectileTime);
		this.stateSpeed = this.gs.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.speed, this.stateSpeed);

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

		this.character.setSpeed(this.stateSpeed);

		//this is just begging to be split up into different classes
		switch(this.type) {
			case "one-time":
				//hacky shit
				this.character.tempShieldRechargeAmount = Math.floor(this.character.tempShieldRechargeAmountOriginal/4);
				this.updateFunction = this.updateOneTime.bind(this);
				break;
			case "special-dash":
				this.character.startContactDamage(this.contactDmg);
				this.updateFunction = this.updateSpecialDash.bind(this);
				break;
			case "persistent-projectile": 
				this.enterPersistentProjectile(dt);
				this.updateFunction = this.updatePersistentProjectile.bind(this);
				break;
			case "hitscan": 
				this.enterHitscan(dt)
				this.updateFunction = this.updateHitscan.bind(this);
				break;
			case "sniper-scope":
				this.enterSniperScope(dt);
				this.updateFunction = this.updateSniperScope.bind(this);
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

		this.character.tempShieldRechargeAmount = this.character.tempShieldRechargeAmountOriginal;

		if(this.type === "persistent-projectile") {
			this.exitPersistentProjectile(dt);
		} else if (this.type === "sniper-scope") {
			this.exitSniperScope(dt);
		}

		this.character.resetSpeed();
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

	//enter for "hitscan" type of states
	enterHitscan(dt) {
		var pos = this.character.getPlanckPosition();
		var hitscanResource = this.gs.rm.getResourceByKey(this.hitscanKey);

		//create 1 hitscan bullet for testing
		if(pos !== null && hitscanResource !== null) {
			const Vec2 = this.gs.pl.Vec2;
			var raycastLength = this.gs.globalfuncs.getValueDefault(hitscanResource?.data?.hitscanData?.distance, 1);
			raycastLength = raycastLength > this.gs.activeTilemap.diagonalLength ? this.gs.activeTilemap.diagonalLength : raycastLength;
	
			var angle = this.character.frameInputController.characterDirection.value;
			var planckPosTo = new Vec2(pos.x + raycastLength * Math.cos(angle), pos.y + raycastLength * Math.sin(angle) * -1);
			var collisionFilters = this.gs.globalfuncs.getValueDefault(hitscanResource?.data?.collisionData, null);

			//do a raycast for the first applicable object
			var raycastResult = this.raycastFirst(pos, planckPosTo, collisionFilters);
			var x2 = raycastResult.point !== null ? raycastResult.point.x : planckPosTo.x;
			var y2 = raycastResult.point !== null ? raycastResult.point.y : planckPosTo.y;

			/////////////////////////////////////
			//debugging raycast stuff
			// var eventData = {
			// 	"eventName": "debugServerRaycast",
			// 	"gameObjectId": raycastResult.gameObjectId,
			// 	"x1": pos.x,
			// 	"y1": pos.y,
			// 	"x2": x2,
			// 	"y2": y2
			// };
			// var userAgents = this.gs.uam.getUserAgents();
			// for(var i = 0; i < userAgents.length; i++) {
			// 	userAgents[i].insertServerToClientEvent(eventData);
			// }
			/////////////////////////////////////

			if(raycastResult.gameObject !== null) {
				//create object for hitscan collisions
				var hitscanResult = {
					raycastResult: raycastResult,
					ownerId: this.character.ownerId,
					ownerType: this.character.ownerType,
					hitscanKey: this.hitscanKey
				}

				switch(raycastResult.gameObjectType) {
					case "wall":
						//for now, there is no 'reaction' from hitting a wall
						break;
					case "character":
						raycastResult.gameObject.collisionHitscan(hitscanResult);
						break;
					case "projectile":
						//for now, just never hit projectiles
						break;
					case "persistent-projectile":
						raycastResult.gameObject.collisionHitscan(hitscanResult);
						break;
				}
			}

			var eventData = {
				"eventName": "addHitscan",
				"gameObjectId": raycastResult.gameObjectId,
				"teamId": this.character.teamId,
				"x1": pos.x,
				"y1": pos.y,
				"x2": x2,
				"y2": y2
			};
			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++) {
				userAgents[i].insertServerToClientEvent(eventData);
			}

		}
	}

	//update function for "hitscan" type of states
	//for now, just wait until its over
	updateHitscan(dt) {
		this.timeAcc += dt;
		// console.log("UPDATING HITSCAN");

		if(this.timeAcc >= this.timeLength) {
			this.character.setCharacterClassState(null);
		}
	}

	//gets the first object hit in the raycast. The collision filters are from the resource for the hitscan.
	//Returns the first game object + collision data if there is a hit.
	raycastFirst(planckPosFrom, planckPosTo, collisionFilters) {
		if(!collisionFilters) {
			collisionFilters = {
				"collideSameTeamCharacters": false,
				"collideOtherTeamCharacters": true,
				"collideSelf": false,
				"collideWalls": true,
				"collideSameTeamProjectiles": false,
				"collideOtherTeamProjectiles": false
			};
		}
		
		var raycastResult = {
			gameObjectId: null,
			gameObject: null,
			gameObjectType: "",
			point: null,
			originPoint1: planckPosFrom,
			originPoint2: planckPosTo
		};
		this.gs.world.rayCast(planckPosFrom, planckPosTo, this.raycastFirstCallback.bind(this, raycastResult, collisionFilters, this.character.teamId));

		return raycastResult;
	}

	raycastFirstCallback(raycastResult, collisionFilters, raycastTeamId, fixture, point, normal, fraction) {
		var planckReturnValue = -1.0; 
		
		var userData = fixture.getBody().getUserData()
		var obj = this.gs.gom.getGameObjectByID(userData.id);
		var raycastHit = false;

		switch(userData.type) {
			case "wall":
				if(collisionFilters.collideWalls && obj.collideProjectiles) {
					raycastHit = true;
				}
				break;
			case "character":
				//team collision check
				if(collisionFilters.collideSameTeamCharacters && raycastTeamId === obj.teamId) {
					raycastHit = true;
				}
				else if(collisionFilters.collideOtherTeamCharacters && raycastTeamId !== obj.teamId) {
					raycastHit = true;
				}
				break;
			case "projectile":
				//for now, just never hit projectiles
				raycastHit = false;
				break;
			case "persistent-projectile":
				//team collision check
				if(obj.collideSameTeamProjectiles && raycastTeamId === obj.teamId) {
					raycastHit = true;
				}
				else if(obj.collideOtherTeamProjectiles && raycastTeamId !== obj.teamId) {
					raycastHit = true;
				}
				break;
		}

		if(raycastHit) {
			raycastResult.gameObjectId = obj.id;
			raycastResult.gameObject = obj;
			raycastResult.gameObjectType = userData.type;
			raycastResult.point = point;
			planckReturnValue = fraction;
		} else {
			planckReturnValue = -1.0;
		}
		
		return planckReturnValue;
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


	enterPersistentProjectile(dt) {
		//create shield object here
		var persistentProjectileResource = this.gs.rm.getResourceByKey(this.persistentProjectileKey);

		if(persistentProjectileResource !== null) {
			var pp = this.gs.gom.createGameObject("persistent-projectile");

			pp.characterId = this.character.id;
			pp.ownerId = this.character.ownerId;
			pp.ownerType = this.character.ownerType;
			pp.teamId = this.character.teamId;
	
			var pos = this.character.plBody.getPosition();
	
			pp.persistentProjectileInit(this.gs, persistentProjectileResource, pos.x, pos.y, this.character.frameInputController.characterDirection.value);
		}

		// create entry for persistent data on character
		this.tempId = pp.id;
		
		//hacky shit
		this.character.tempShieldRechargeAmount = 0;
	}

	//update for persistent projectile
	updatePersistentProjectile(dt) {
		if(this.character.frameInputController[this.characterClassInput].state === false) {
			this.character.setCharacterClassState(null);
		}
	}


	exitPersistentProjectile(dt) {
		this.gs.gom.destroyGameObject(this.tempId);
	}

	enterSniperScope(dt) {
		this.character.setIsCharacterCharging(true);
	}

	//update for sniper scope
	updateSniperScope(dt) {
		if(this.character.frameInputController[this.characterClassInput].state === false) {
			this.character.setCharacterClassState(null);
		}

		//fuck it, we'll hard code it
		if(this.character.frameInputController.isFiring.state) {
			if(this.character.stateCooldownsTemplates[this.character.characterClassResource.data.fireStateKey] !== undefined && !this.character.stateCooldownsTemplates[this.character.characterClassResource.data.fireStateKey].onCooldown) {
				this.character.setCharacterClassState(this.character.characterClassResource.data.fireStateKey, "isFiring");
			}
		}
	}

	exitSniperScope(dt) {
		this.character.setIsCharacterCharging(false);
		this.character.setResetChargeFlag();
	}
}

exports.CharacterClassState = CharacterClassState
