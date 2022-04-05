const planck = require('planck-js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');

class Shield {
	constructor() {
		this.gs = null;
		this.id = null;
		this.characterId = null; //the character that owns the shield
		this.ownerId = null; //the user/ai that controlles the character owns the shield
		this.ownerType = "";
		this.teamId = null;
		this.type = "shield";

		this.plBody = null;
		this.plShape = "circle";
		this.plRadius = 1;
		this.plWidth = 1;
		this.plHeight = 1;

		this.speed = 1.0;
		this.mass = 100;

		this.size = 1;

		this.spawnLocationType = "mouse-direction";
		this.timeLength = 1000; //ms
		this.spawnOffsetLength = 0;

		this.xStarting = 0;
		this.yStarting = 0;
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
		this.characterEffectData = [];
	}


	shieldInit(gameServer, projectileResource, xc, yc, angle) {
		this.gs = gameServer;
		this.projectileResource = projectileResource;
		this.projectileResourceId = this.projectileResource.id;
		this.xc = xc;
		this.yc = yc;
		this.angle = angle;
	}

	//called only after the shield is activated. Put things in here that other systems will depend on.
	activated() {
		//get data from resource
		this.plShape = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plShape);
		this.plRadius = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plRadius);
		this.plWidth = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plWidth);
		this.plHeight = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plHeight);
		this.speed = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.physicsData?.speed);
		this.mass = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.physicsData?.mass);
		this.spawnLocationType = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.spawnLocationType);
		this.timeLength = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.timeLength);
		this.spawnOffsetLength = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.spawnOffsetLength);
		this.size = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.size);
		this.collideSameTeamCharacters = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideSameTeamCharacters, this.collideSameTeamCharacters);
		this.collideOtherTeamCharacters = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideOtherTeamCharacters, this.collideOtherTeamCharacters);
		this.collideSameTeamProjectiles = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideSameTeamProjectiles, this.collideSameTeamProjectiles);
		this.collideOtherTeamProjectiles = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideOtherTeamProjectiles, this.collideOtherTeamProjectiles);
		this.collideWalls = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideWalls);
		this.collideSelf = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.collisionData?.collideSelf);
		this.characterEffectData = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.characterEffectData);

		//data validation stuff
		if(this.size <= 0) {
			this.size = 1;
		}

		//calculate stuff
		this.xStarting = this.xc;
		this.yStarting = this.yc;

		//calculate offsets for spawning location. This is mainly so projectiles won't hit walls when the character is right next to them, and aiming away from the wall.
		var xOffset = 0;
		var yOffset = 0;

		if(this.spawnLocationType === "mouse-direction") {
			yOffset = this.spawnOffsetLength * Math.sin(this.angle) * -1;
			xOffset = this.spawnOffsetLength * Math.cos(this.angle);
		}



		var theShape = null;

		if(this.plShape === "circle") {
			theShape = this.gs.pl.Circle(this.gs.pl.Vec2(0, 0), this.plRadius*this.size);
		} else if(this.plShape === "rect") {
			theShape = this.gs.pl.Box((this.plWidth * this.size)/2, (this.plHeight * this.size)/2, this.gs.pl.Vec2(0, 0), this.angle*-1);
		} else {
			theShape = this.gs.pl.Circle(this.gs.pl.Vec2(0, 0), 1);
		}

		this.plBody = this.gs.world.createBody({
			position: this.gs.pl.Vec2(this.xStarting + xOffset, this.yStarting + yOffset),
			type: this.gs.pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {type: "projectile", id: this.id}
		});
		
		this.plBody.createFixture({
			shape: theShape,
			density: this.mass/(this.size*this.size),
			friction: 0.0,
			isSensor: true,
			filterCategoryBits: CollisionCategories["projectile_body"],
			filterMaskBits: CollisionMasks["projectile_body"]
		});	

		var vx = this.speed * Math.cos(this.angle);
		var vy = this.speed * Math.sin(this.angle) * -1;

		//set the velocity
		var vel = new this.gs.pl.Vec2(vx, vy);
		this.plBody.setLinearVelocity(vel);

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
		this.isDirty = false;
		this.timeLength -= dt;

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

		if(this.plBody) {
			if(this.timeLength <= 0) {
				this.gs.gom.destroyGameObject(this.id);
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
		otherP.timeLength = 0;
	}

	collisionCharacter(c, characterUserData, projectileUserData, contactObj, isCharacterA) {
		
		//get resource data
		var destroyOnContact = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.destroyOnContact, true);

		if(destroyOnContact) {
			this.timeLength = 0;
		}
	}

	endCollisionCharacter() {
		
	}


	collisionWall(w, projectileUserData, wallUserData, contactObj, isProjectileA) {
		var collided = false;

		//check if it actually hit the wall or was allowed to go through
		collided = w.projectileBlockCheck(this.plBody);

		if(collided) {
			this.timeLength = 0;
		}
	}
	
	///////////////////////////////////
	// EVENT SERIALIZATION FUNCTIONS //
	///////////////////////////////////

	serializeAddProjectileEvent() {
		var eventData = null;
		var bodyPos = {x: this.xStarting, y: this.yStarting};
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "addProjectile",
			"id": this.id,
			"x": bodyPos.x,
			"y": bodyPos.y,
			"angle": this.angle,
			"size": this.size,
			"speed": this.speed,
			"teamId": this.teamId,
			"projectileResourceId": this.projectileResourceId,
		};
		
		return eventData;
	}

	serializeRemoveProjectileEvent() {
		return {
			"eventName": "removeProjectile",
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

exports.Shield = Shield;