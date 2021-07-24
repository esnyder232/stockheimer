const planck = require('planck-js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');

class Projectile {
	constructor() {
		this.gs = null;
		this.id = null;
		this.characterId = null; //the character that fired the bullet
		this.ownerId = null; //the user/ai that controller the character that fired the bullet
		this.ownerType = "";
		this.teamId = null;
		this.type = "projectile";

		this.plBody = null;
		this.plShape = "circle";
		this.plRadius = 1;

		this.speed = 1.0;
		this.mass = 100;

		this.size = 1;

		this.spawnLocationType = "mouse-direction";
		this.damage = 1;
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
	}


	projectileInit(gameServer, projectileResource, xc, yc, angle) {
		this.gs = gameServer;
		this.projectileResource = projectileResource;
		this.projectileResourceId = this.projectileResource.id;
		this.xc = xc;
		this.yc = yc;
		this.angle = angle;
	}

	//called only after the bullet is activated. Put things in here that other systems will depend on.
	activated() {
		//get data from resource
		this.plShape = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plShape);
		this.plRadius = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plRadius);
		this.speed = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.physicsData?.speed);
		this.mass = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.physicsData?.mass);
		this.spawnLocationType = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.spawnLocationType);
		this.damage = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.damage);
		this.timeLength = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.timeLength);
		this.spawnOffsetLength = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.spawnOffsetLength);
		this.size = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.size);

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

		// var boxShape = pl.Box(this.size, this.size, Vec2(0, 0));
		var theShape = this.gs.globalfuncs.createPlanckShape(this.gs, this.plShape, {plRadius: this.plRadius*this.size});

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
		//
		/////////////////////////////////////

		if(this.plBody) {
			if(this.timeLength <= 0) {
				this.gs.gom.destroyGameObject(this.id);
			}
		}
	}

	postWebsocketUpdate() {
	}


	checkDirty() {
		var result = false;
		if(this.plBody !== null)
		{
			result = this.plBody.isAwake();
		}
		return result || this.isDirty;
	}

	collisionCharacter(c, characterUserData, projectileUserData, contactObj, isCharacterA) {
		//get resource data
		var destroyOnContact = this.gs.globalfuncs.getValueDefault(this?.projectileResource?.data?.projectileData?.destroyOnContact, true);

		if(destroyOnContact) {
			this.timeLength = 0;
		}

		//temporary. Just a special case for the big boy to be useful for something
		if(c.size >= 4) {
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
			"r": this.plRadius*this.size
		};
		
		return eventData;
	}

}

exports.Projectile = Projectile;