const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');

class Bullet {
	constructor() {
		this.gs = null;
		this.id = null;
		this.characterId = null;

		this.plBody = null;
		this.speedMag = 0.8;
		this.lifespan = 1000; //ms
		this.xStarting = 0;
		this.yStarting = 0;
		this.angle = 0;
	}

	//angle is in radians
	//whateveR!!!
	init(gameServer, xc, yc, angle, size, speed, lifespan, density) {
		this.gs = gameServer;
		this.xStarting = xc + ((0.5+(size))*Math.cos(angle));
		this.yStarting = yc + ((0.5+(size))*Math.sin(angle)*-1);
		this.angle = angle;
		this.lifespan = lifespan;

		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;
		const world = this.gs.world;

		//create a plank object
		var boxShape = pl.Box(size, size, Vec2(0, 0));

		this.plBody = world.createBody({
			position: Vec2(this.xStarting, this.yStarting),
			type: pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {type: "projectile", id: this.id}
		});
		
		this.plBody.createFixture({
			shape: boxShape,
			density: density,
			friction: 0.0
		});	

		var vy = speed * Math.sin(angle) * -1;
		var vx = speed * Math.cos(angle);

		//set the velocity
		var f = this.plBody.getWorldVector(Vec2(vx*density, vy*density));
		var p = this.plBody.getWorldPoint(Vec2(0.0, 0.0));
		this.plBody.applyLinearImpulse(f, p, true);
	}

	reset() {
		if(this.plBody)
		{
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
	}

	update(dt) {
		this.lifespan -= dt;

		if(this.plBody)
		{
			if(this.lifespan <= 0)
			{
				this.gs.pm.destroyProjectileId(this.id);
				this.reset();
			}
		}
	}

	serializeProjectileUpdate() {
		var eventData = null;
		if(this.plBody !== null)
		{
			var bodyPos = this.plBody.getPosition();

			if(bodyPos)
			{
				eventData = {
					"eventName": "projectileUpdate",
					"id": this.id,
					"x": bodyPos.x,
					"y": bodyPos.y,
					"angle": this.angle
				};
			}
		}
		
		return eventData;
	}
}

exports.Bullet = Bullet;