const planck = require('planck-js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');

class PersistentProjectile {
	constructor() {
		this.gs = null;
		this.id = null;
		this.characterId = null; //the character that owns the persistent projectiles
		this.character = null; //reference to the character
		this.ownerId = null; //the user/ai that controlles the character owns the persistent projectile
		this.ownerType = "";
		this.teamId = null;
		this.type = "persistent-projectile";

		this.plBody = null;
		this.plShape = "circle";
		this.plRadius = 1;
		this.plWidth = 1;
		this.plHeight = 1;

		this.speed = 0.0;
		this.mass = 100;

		this.size = 1;
		this.spawnOffsetLength = 0;

		this.x = 0;
		this.y = 0;
		this.angle = 0;
		this.isDirty = false;

		this.projectileResource = null;
		this.projectileResourceId = null;

		this.tempTimerLength = 0;
		this.tempTimerAcc = 0;

		this.collideSameTeamCharacters = false;
		this.collideOtherTeamCharacters = false;
		this.collideSameTeamProjectiles = false;
		this.collideOtherTeamProjectiles = false;
		this.collideWalls = false;
		this.collideSelf = false;

		this.collideSameTeamCharactersResource = false;
		this.collideOtherTeamCharactersResource = false;
		this.collideSameTeamProjectilesResource = false;
		this.collideOtherTeamProjectilesResource = false;
		this.collideWallsResource = false;
		this.collideSelfResource = false;


		this.characterEffectData = [];
		this.persistentProjectileData = {};

		this.hpStatResourceKey = "";
		this.isCollisionBasedOnStat = false;
	}


	persistentProjectileInit(gameServer, projectileResource, xStarting, yStarting, angle) {
		this.gs = gameServer;
		this.projectileResource = projectileResource;
		this.projectileResourceId = this.projectileResource.id;
		this.x = xStarting;
		this.y = yStarting;
		this.angle = angle;
	}

	//called only after the shield is activated. Put things in here that other systems will depend on.
	activated() {
		//get data from resource
		this.plShape = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plShape);
		this.plRadius = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plRadius);
		this.plWidth = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plWidth);
		this.plHeight = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plHeight);
		this.mass = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.physicsData?.mass);
		this.size = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.size);
		this.collideSameTeamCharactersResource = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideSameTeamCharacters, this.collideSameTeamCharactersResource);
		this.collideOtherTeamCharactersResource = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideOtherTeamCharacters, this.collideOtherTeamCharactersResource);
		this.collideSameTeamProjectilesResource = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideSameTeamProjectiles, this.collideSameTeamProjectilesResource);
		this.collideOtherTeamProjectilesResource = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideOtherTeamProjectiles, this.collideOtherTeamProjectilesResource);
		this.collideWallsResource = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideWallsResource);
		this.collideSelfResource = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideSelfResource);
		this.characterEffectData = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.characterEffectData);

		this.spawnOffsetLength = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.persistentProjectileData?.spawnOffsetLength);
		this.hpStatResourceKey = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.persistentProjectileData?.hpStatResourceKey);

		this.character = this.gs.gom.getActiveGameObjectID(this.characterId);

		//data validation stuff
		if(this.size <= 0) {
			this.size = 1;
		}

		var theShape = null;

		if(this.plShape === "circle") {
			theShape = this.gs.pl.Circle(this.gs.pl.Vec2(0, 0), this.plRadius*this.size);
		} else if(this.plShape === "rect") {
			theShape = this.gs.pl.Box((this.plWidth * this.size)/2, (this.plHeight * this.size)/2, this.gs.pl.Vec2(0, 0));
		} else {
			theShape = this.gs.pl.Circle(this.gs.pl.Vec2(0, 0), 1);
		}

		this.plBody = this.gs.world.createBody({
			position: this.gs.pl.Vec2(this.x, this.y),
			type: this.gs.pl.Body.KINEMATIC,
			fixedRotation: true,
			userData: {type: "persistent-projectile", id: this.id}
		});
		
		//just temporariliy always make it "shield_body"
		this.plBody.createFixture({
			shape: theShape,
			density: this.mass/(this.size*this.size),
			friction: 0.0,
			isSensor: false,
			filterCategoryBits: CollisionCategories["shield_body"],
			filterMaskBits: CollisionMasks["shield_body"]
		});	

		if(this.hpStatResourceKey) {
			this.isCollisionBasedOnStat = true;
		}

		//tell the active user agents about it
		this.gs.globalfuncs.insertTrackedEntityToPlayingUsers(this.gs, "gameobject", this.id);
	}

	//called before the bullet is officially deactivated with the game object manager.
	deactivated() {
		if(this.plBody) {
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
				
		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0 ; i < userAgents.length; i++) {
			userAgents[i].deleteTrackedEntity("gameobject", this.id);
		}
	}

	//called right before the bullet is officially deleted by the game object manager.
	deinit() {
		this.gs = null;
	}

	update(dt) {
		//for now, just set isDirty to false at the BEGINNING of the update loop
		// this.isDirty = false;
		// this.timeLength -= dt;

		/////////////////////////////////////
		//debugging hitbox syncing issues
		// this.tempTimerAcc += dt;
		// if(this.tempTimerAcc >= this.tempTimerLength) {
		// 	// var v = this.plBody.getLinearVelocity();
		// 	// console.log(v.x);
		// 	this.tempTimerAcc = 0;
		// 	var eventData = this.serializeDebugHitboxEvent();
		// 	var userAgents = this.gs.uam.getUserAgents();
		// 	for(var i = 0; i < userAgents.length; i++) {
		// 		userAgents[i].insertServerToClientEvent(eventData);
		// 	}
		// }
		
		/////////////////////////////////////

		// if(this.plBody) {
		// 	if(this.timeLength <= 0) {
		// 		this.gs.gom.destroyGameObject(this.id);
		// 	}
		// }

		
		this.angle = this.character.frameInputController.characterDirection.value;
		var pos = this.character.getPlanckPosition();

		if(pos !== null) {
			this.x = pos.x + this.spawnOffsetLength * Math.cos(this.angle);
			this.y = pos.y + this.spawnOffsetLength * Math.sin(this.angle) * -1;

			this.plBody.setPosition(this.gs.pl.Vec2(this.x, this.y));
			this.plBody.setAngle(this.angle*-1);
			this.plBody.setAwake(true);
		}

		//temporarily put the checks here
		if(this.isCollisionBasedOnStat) {
			//if the stat is 0, turn all collisions off
			if(this.character[this.hpStatResourceKey] <= 0) {
				this.collideSameTeamCharacters = false;
				this.collideOtherTeamCharacters = false;
				this.collideSameTeamProjectiles = false;
				this.collideOtherTeamProjectiles = false;
				this.collideWalls = false;
				this.collideSelf = false;
			} 
			//otherwise, put the collisions back to the original value
			else {
				this.collideSameTeamCharacters = this.collideSameTeamCharactersResource;
				this.collideOtherTeamCharacters = this.collideOtherTeamCharactersResource;
				this.collideSameTeamProjectiles = this.collideSameTeamProjectilesResource;
				this.collideOtherTeamProjectiles = this.collideOtherTeamProjectilesResource;
				this.collideWalls = this.collideWallsResource;
				this.collideSelf = this.collideSelfResource;
			}
		}
	}
	

	postWebsocketUpdate() {
	}

	postPhysicsUpdate() {

	}

	getPlanckPosition() {
		if(this.plBody !== null)
		{
			return this.plBody.getPosition();
		}
		return null;
	}


	checkDirty() {
		var result = false;
		if(this.plBody !== null)
		{
			result = this.plBody.isAwake();
		}
		return result || this.isDirty;
	}

	collisionProjectile(otherP, projectileUserData1, projectileUserData2, contactObj, isProjectileA) {
		var characterEffectData = this.gs.globalfuncs.getValueDefault(otherP?.projectileResource?.data?.characterEffectData, []);

		for(var i = 0; i < characterEffectData.length; i++) {
			//go through each character hit effect
			switch(characterEffectData[i].type) {
				case "damage":
					var value = this.gs.globalfuncs.getValueDefault(characterEffectData[i].value, 0);
					this.character.modShield(-value);
					this.applyShieldDamageEffect(otherP.ownerId, value);
					break;
				default:
					//nothing
					break;
			}
		}

		var pPos = otherP.getPlanckPosition();
		var cPos = this.character.getPlanckPosition();
		if(pPos !== null && cPos !== null) {
			var pushbackVecMagnitude = this.gs.globalfuncs.getValueDefault(otherP?.projectileResource?.data?.projectileData?.pushbackVecMagnitude, 1) / 4;

			var temp = this.gs.pl.Vec2((cPos.x - pPos.x), (cPos.y - pPos.y));
			temp.normalize();
			this.character.addForceImpulse(temp.x, temp.y, pushbackVecMagnitude);
		}

		otherP.timeLength = 0;
	}

	collisionCharacter(c, characterUserData, projectileUserData, contactObj, isCharacterA) {
	
	}

	endCollisionCharacter() {
	
	}

	applyShieldDamageEffect(srcUserId, damage) {
		//create event for clients to notify them of damage
		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertTrackedEntityEvent("gameobject", this.id, {
				"eventName": "persistentProjectileDamageEffect",
				"id": this.id,
				"damage": damage,
				"srcUserId": srcUserId
			});
		}
	}



	
	///////////////////////////////////
	// EVENT SERIALIZATION FUNCTIONS //
	///////////////////////////////////

	serializeAddPersistentProjectileEvent() {
		var eventData = null;
		var bodyPos = {x: this.xStarting, y: this.yStarting};
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "addPersistentProjectile",
			"userId": this.ownerId,
			"id": this.id,
			"characterId": this.characterId,
			"x": bodyPos.x,
			"y": bodyPos.y,
			"angle": this.angle,
			"teamId": this.teamId,
			"persistentProjectileResourceId": this.projectileResourceId
		};
		
		return eventData;
	}

	serializeUpdatePersistentProjectileEvent() {
		var eventData = null;
		var bodyPos = {x: this.x, y: this.y};
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "updatePersistentProjectile",
			"id": this.id,
			"x": bodyPos.x,
			"y": bodyPos.y,
			"angle": this.angle
		};
		
		return eventData;
	}

	serializeRemovePersistentProjectileEvent() {
		return {
			"eventName": "removePersistentProjectile",
			"id": this.id,
		};
	}

	serializeDebugHitboxEvent() {
		var eventData = null;
		var bodyPos = {x: this.xStarting, y: this.yStarting};
		if(this.plBody !== null) {
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "debugServerCircle",
			"gameObjectId": this.id,
			"x": bodyPos.x,
			"y": bodyPos.y,
			"r": this.plRadius*this.size,
			"w": this.plWidth*this.size,
			"h": this.plHeight*this.size,
			"a": this.angle,
			"t": this.plShape === "rect" ? 2 : 1
		};
		
		return eventData;
	}

}

exports.PersistentProjectile = PersistentProjectile;