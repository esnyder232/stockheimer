const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');

class Bullet {
	constructor() {
		this.gs = null;
		this.id = null;
		this.characterId = null;

		this.plBody = null;
		this.speedMag = 8;
		this.lifespan = 3000; //ms
	}

	init(gameServer) {
		this.gs = gameServer;
	}

	reset() {
		//this.gs.world.destroyBody(this.plBody);
		this.plBody = null;
	}

	//angle is in radians
	createPlankObject(xc, yc, angle) {
		// const pl = this.gs.pl;
		// const Vec2 = pl.Vec2;
		// const world = this.gs.world;

		// //create a plank box
		// var boxShape = pl.Box(0.5, 0.5, Vec2(0, 0));

		// this.plBody = world.createBody({
		// 	position: Vec2(2.5, 3.0),
		// 	type: pl.Body.DYNAMIC,
		// 	fixedRotation: true,
		// 	userData: {characterId: this.id}
		// });
		
		// this.plBody.createFixture({
		// 	shape: boxShape,
		// 	density: 1.0,
		// 	friction: 0.3
		// });	



		// //update state
		// var currentVelocity = this.plBody.getLinearVelocity();
		// var desiredVelocityX = ((this.inputController['left'].state ? -1 : 0) + (this.inputController['right'].state ? 1 : 0)) * this.speedMag;
		// var desiredVelocityY = ((this.inputController['down'].state ? -1 : 0) + (this.inputController['up'].state ? 1 : 0)) * this.speedMag;

		// var f = this.plBody.getWorldVector(Vec2((desiredVelocityX - currentVelocity.x), (desiredVelocityY - currentVelocity.y)));
		// var p = this.plBody.getWorldPoint(Vec2(0.0, 0.0));
		// this.plBody.applyLinearImpulse(f, p, true);


	}


	update(dt) {
		this.lifespan -= dt;

		if(this.lifespan <= 0)
		{
			this.gs.pm.destroyProjectileId(this.id);
		}
	}
}

exports.Bullet = Bullet;