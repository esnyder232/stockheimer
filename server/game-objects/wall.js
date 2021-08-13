const planck = require('planck-js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');

class Wall {
	constructor() {
		this.type = "wall";
		this.plBody = null;
		this.id = null;

		this.x = 0;
		this.y = 0;
		this.size = 1;

		this.impassable = true; //default is impassable
		this.collideProjectile = true; //default is blocking projectiles
	}

	init(gameServer) {
		this.gs = gameServer;

		const Vec2 = this.gs.pl.Vec2;
		var wallShape = this.gs.pl.Box(this.size/2, this.size/2, Vec2(0,0));

		this.plBody = this.gs.world.createBody({
			position: Vec2(this.x, this.y),
			type: this.gs.pl.Body.STATIC,
			userData: {type:"wall", id: this.id}
		});

		this.plBody.createFixture({
			shape: wallShape,
			density: 0.0,
			friction: 0.0,
			filterCategoryBits: CollisionCategories["wall_body"],
			filterMaskBits: CollisionMasks["wall_body"]
		});
	}
	
	//called right before the bullet is officially deleted by the game object manager.
	deinit() {
		if(this.plBody) {
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}

		this.gs = null;
		this.id = null;
	}

	update(dt) {
	}
	

	postWebsocketUpdate() {
	}

	// collideProjectile()


	// collisionCharacter(c, characterUserData, projectileUserData, contactObj, isCharacterA) {
		
	// }
}

exports.Wall = Wall;