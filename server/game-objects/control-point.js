const planck = require('planck-js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');

class ControlPoint {
	constructor() {
		this.type = "control-point";
		this.plBody = null;
		this.id = null;
		this.xStarting = 0; //top left corner of control point
		this.yStarting = 0; //top left corner of control point
		this.x = 0;			//center point of control point (needed for planck since planck's 'position' is the center of object)
		this.y = 0;			//center point of control point (needed for planck since planck's 'position' is the center of object)
		this.angle = 0;
		this.width = 1;
		this.height = 1;
	}

	controlPointInit(gameServer, xStarting, yStarting, width, height, angle) {
		this.gs = gameServer;
		this.xStarting = xStarting;
		this.yStarting = yStarting;
		this.angle = angle;
		this.width = width;
		this.height = height;
	}

	activated() {
		this.x = this.xStarting + this.width/2;
		this.y = this.yStarting - this.height/2;

		var theShape = this.gs.pl.Box(this.width/2, this.height/2, this.gs.pl.Vec2(0, 0), this.angle*-1);

		this.plBody = this.gs.world.createBody({
			position: this.gs.pl.Vec2(this.x, this.y),
			type: this.gs.pl.Body.STATIC,
			fixedRotation: true,
			userData: {
				type:"control-point", 
				id: this.id
			}
		});

		this.plBody.createFixture({
			shape: theShape,
			friction: 0.0,
			isSensor: true,
			filterCategoryBits: CollisionCategories["control_point"],
			filterMaskBits: CollisionMasks["control_point"]
		});

		//tell the active user agents about it
		// this.gs.globalfuncs.insertTrackedEntityToPlayingUsers(this.gs, "gameobject", this.id);
	}

	deactivated() {
		if(this.plBody) {
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
				
		// var userAgents = this.gs.uam.getUserAgents();
		// for(var i = 0 ; i < userAgents.length; i++) {
		// 	userAgents[i].deleteTrackedEntity("gameobject", this.id);
		// }
	}

	//called right before the bullet is officially deleted by the game object manager.
	deinit() {
		this.gs = null;
	}
	
	update(dt) {

	}
	
	postPhysicsUpdate() {

	}

	postWebsocketUpdate() {

	}

	collisionCharacter(c) {
		// console.log("INSIDE HILL CONTROL POINT: collision character.");
	}
}

exports.ControlPoint = ControlPoint;