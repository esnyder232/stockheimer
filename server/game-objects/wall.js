const planck = require('planck-js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');

//no need for an update/activate/deactivate functions. Walls do not "activate" because they are just static things that exist in the world. Just init/deinit will do.
class Wall {
	constructor() {
		this.type = "wall";
		this.plBody = null;
		this.id = null;
		this.isStatic = true;

		this.x = 0;
		this.y = 0;
		this.size = 1;

		this.impassable = true; //default is impassable
		this.collideProjectiles = true; //default is blocking projectiles
		this.collideProjectilesDirection = ""; //default is blank (blocks all of them)
		this.collideProjectilesAllDirections = false;

		this.collideProjectilesNormalsArray = [];
	}

	init(gameServer) {
		this.gs = gameServer;

		const Vec2 = this.gs.pl.Vec2;
		var wallShape = this.gs.pl.Box(this.size/2, this.size/2, Vec2(0,0));

		if(this.collideProjectilesDirection === "") {
			this.collideProjectilesAllDirections = true;
		}

		//calculate all the vectors that will block the projectile
		var collideProjectilesDirectionSplit = this.collideProjectilesDirection.toLowerCase().split(",");

		for(var i = 0; i < collideProjectilesDirectionSplit.length; i++) {
			var vec = null;
			if(collideProjectilesDirectionSplit[i] === "n") {
				vec = new Vec2(0, 1);

				// const Vec2 = this.gs.pl.Vec2;
				// var losResults = {
				// 	isLOS: true,
				// 	pathUnobstructed: true
				// }
		
				// var p1 = new Vec2(pos.x, pos.y);
				// vec = {x: 0, y: 1};
			}
			else if(collideProjectilesDirectionSplit[i] === "e") {
				vec = new Vec2(1, 0);
				// vec = {x: 1, y: 0};
			}
			else if(collideProjectilesDirectionSplit[i] === "s") {
				vec = new Vec2(0, -1);
				// vec = {x: 0, y: -1};
			}
			else if(collideProjectilesDirectionSplit[i] === "w") {
				vec = new Vec2(-1, 0);
				// vec = {x: -1, y: 0};
			}

			if(vec !== null) {
				this.collideProjectilesNormalsArray.push(vec);
			}
		}

		this.plBody = this.gs.world.createBody({
			position: Vec2(this.x, this.y),
			type: this.gs.pl.Body.STATIC,
			userData: {
				type:"wall", 
				id: this.id,
				collideProjectiles: this.collideProjectiles
			}
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
		if(this.plBody !== null) {
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}

		this.gs = null;
	}
	
	//returns true if the projectile body's velocity would collide with wall
	projectileBlockCheck(pBody) {
		var collided = false;

		if(this.collideProjectilesAllDirections) {
			collided = true;
		} else {
			var pv = pBody.getLinearVelocity();
			//see if any of the dot products with the wall's "normal" vectors
			for(var i = 0; i < this.collideProjectilesNormalsArray.length; i++) {
				var res = this.gs.pl.Vec2.dot(this.collideProjectilesNormalsArray[i], pv);
				var debugHere = true;
				if(res > 0) {
					collided = true;
					break;
				}
				
			}

		}

		return collided;
	}

	serializeAddWallEvent() {
		var eventData = null;
		var bodyPos = {x: this.x, y: this.y};
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "addWall",
			"id": this.id,
			"x": bodyPos.x,
			"y": bodyPos.y,
			"size": this.size,
			"impassable": this.impassable,
			"collideProjectiles": this.collideProjectiles
		};
		
		return eventData;
	}

	serializeRemoveWallEvent() {
		return {
			"eventName": "removeWall",
			"id": this.id,
		};	
	}

}

exports.Wall = Wall;