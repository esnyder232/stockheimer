const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {CollisionCategories, CollisionMasks} = require('../collision-data.js');

class Bullet {
	constructor() {
		this.gs = null;
		this.id = null;
		this.characterId = null; //the character that fired the bullet
		this.ownerId = null; //the user/ai that controller the character that fired the bullet
		this.ownerType = "";
		this.type = "projectile";

		this.plBody = null;
		this.speed = 0.8;
		this.lifespan = 1000; //ms
		this.xStarting = 0;
		this.yStarting = 0;
		this.angle = 0;
		this.isDirty = false;

		this.bulletType = "";
		this.firedCountdown = 250; //ms. This is the amount of time remaining until your own bullets will hurt the character that fired it.
	}

	bulletInit(gameServer, xc, yc, angle, size, speed, lifespan) {
		this.gs = gameServer;
		this.xStarting = xc + ((0.5+(size))*Math.cos(angle));
		this.yStarting = yc + ((0.5+(size))*Math.sin(angle)*-1);
		this.angle = angle;
		this.size = size;
		this.speed = speed;
		this.lifespan = lifespan;
		//this.density = density;
	}

	//called only after the bullet is activated. Put things in here that other systems will depend on.
	activated() {
		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;
		const world = this.gs.world;

		//create a plank object
		var boxShape = pl.Box(this.size, this.size, Vec2(0, 0));

		this.plBody = world.createBody({
			position: Vec2(this.xStarting, this.yStarting),
			type: pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {type: "projectile", id: this.id}
		});
		
		this.plBody.createFixture({
			shape: boxShape,
			density: 1/(this.size*this.size),
			friction: 0.0,
			isSensor: true,
			filterCategoryBits: CollisionCategories["projectile_body"],
			filterMaskBits: CollisionMasks["projectile_body"]
		});	

		var vy = this.speed * Math.sin(this.angle) * -1;
		var vx = this.speed * Math.cos(this.angle);

		//set the velocity
		var vel = new Vec2(vx, vy);
		this.plBody.setLinearVelocity(vel);
	}

	//called before the bullet is officially deactivated with the game object manager.
	deactivated() {
		if(this.plBody)
		{
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
	}

	//called right before the bullet is officially deleted by the game object manager.
	deinit() {
		this.gs = null;
	}

	update(dt) {
		//for now, just set isDirty to false at the BEGINNING of the update loop
		this.isDirty = false;

		this.lifespan -= dt;

		if(this.firedCountdown >= 0)
		{
			this.firedCountdown -= dt;
		}

		if(this.plBody)
		{
			if(this.lifespan <= 0)
			{
				this.gs.gom.destroyGameObject(this.id);
			}
		}
	}

	checkDirty() {
		var result = false;
		if(this.plBody !== null)
		{
			result = this.plBody.isAwake();
		}
		return result || this.isDirty;
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
			"speed": this.speed
		};
		
		return eventData;
	}

	serializeProjectileUpdateEvent() {
		var eventData = null;
		var bodyPos = {x: this.xStarting, y: this.yStarting};
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "projectileUpdate",
			"id": this.id,
			"x": bodyPos.x,
			"y": bodyPos.y,
			"angle": this.angle
		};
		
		return eventData;
	}

	serializeRemoveProjectileEvent() {
		return {
			"eventName": "removeProjectile",
			"id": this.id,
		};
	}
}

exports.Bullet = Bullet;