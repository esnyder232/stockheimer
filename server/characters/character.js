const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');

class Character {
	constructor() {
		this.gs = null;
		this.id = null;
		this.activeId = null;
		this.isActive = false;

		this.userId = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.plBody = null;

		this.inputController = {};
		this.isInputDirty = false;
		this.speedMag = 4;
		
		this.bigBulletCounter = 0;

		this.inputQueue = [];
		this.eventQueue = [];
	}

	init(gameServer) {
		this.gs = gameServer;

		//make simple little input controller
		this.inputController.up = {state: false, prevState: false};
		this.inputController.down = {state: false, prevState: false};
		this.inputController.left = {state: false, prevState: false};
		this.inputController.right = {state: false, prevState: false};
		this.inputController.isFiring = {state: false, prevState: false};
		this.inputController.isFiringAlt = {state: false, prevState: false};
		this.inputController.characterDirection = {value: false, prevValue: false};

		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;
		const world = this.gs.world;

		//create a plank box
		var boxShape = pl.Box(0.5, 0.5, Vec2(0, 0));
		var circleSensor = pl.Circle(Vec2(0, 0), 5);

		this.plBody = world.createBody({
			position: Vec2(2.5, 3.0),
			type: pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {type:"character", id: this.id}
		});
		
		this.plBody.createFixture({
			shape: boxShape,
			density: 1.0,
			friction: 0.3
		});	

		this.plBody.createFixture({
			shape: circleSensor,
			density: 0.0,
			friction: 0.3,
			isSensor: true,
			userData: {type: "mySensor"}
		});
	}

	reset() {
		this.gs.world.destroyBody(this.plBody);
		this.plBody = null;
	}

	update(dt) {
		const Vec2 = this.gs.pl.Vec2;

		//temporary. The character processes the inputs here.
		var firingInputFound = false;

		if(this.inputQueue.length > 0)
		{
			//Step 1 - get the last known input, and THAT is the input this frame
			var lastKnownInput = this.inputQueue[this.inputQueue.length - 1];

			//assign states for the controller this frame
			this.inputController.up.state = lastKnownInput.up;
			this.inputController.down.state = lastKnownInput.down;
			this.inputController.left.state = lastKnownInput.left;
			this.inputController.right.state = lastKnownInput.right;
			this.inputController.isFiring.state = lastKnownInput.isFiring;
			this.inputController.isFiringAlt.state = lastKnownInput.isFiringAlt;
			this.inputController.characterDirection.value = lastKnownInput.characterDirection.prevValue;

			this.isInputDirty = true;	//kinda wierd the diry flag set is HERE and not in the charcter...but whatever

			//Step 2 - detect any events that occured within the potentially clumped inputs (such as firing a bullet)
			for(var i = 0; i < this.inputQueue.length; i++)
			{
				//the character wants to fire a bullet
				if(!firingInputFound && this.inputQueue[i].isFiring && !this.inputController.isFiring.prevState)
				{
					firingInputFound = true;
					var pos = this.plBody.getPosition();
					var fireEvent = {
						x: pos.x,
						y: pos.y,
						angle: this.inputQueue[i].characterDirection,
						type: 'bullet'
					}

					this.eventQueue.push(fireEvent);
					
					break;
				}

				if(!firingInputFound && this.inputQueue[i].isFiringAlt && !this.inputController.isFiringAlt.prevState && this.bigBulletCounter <= 0)
				{
					firingInputFound = true;
					var pos = this.plBody.getPosition();
					var fireEvent = {
						x: pos.x,
						y: pos.y,
						angle: this.inputQueue[i].characterDirection,
						type: 'bigBullet'
					}

					this.bigBulletCounter = 5000;

					this.eventQueue.push(fireEvent);
					
					break;
				}
			}

			//clear all inputs at the end of the frame
			this.inputQueue.length = 0;
		}

		//update state
		if(this.isInputDirty)
		{
			var currentVelocity = this.plBody.getLinearVelocity();
			var desiredVelocityX = ((this.inputController['left'].state ? -1 : 0) + (this.inputController['right'].state ? 1 : 0)) * this.speedMag;
			var desiredVelocityY = ((this.inputController['down'].state ? -1 : 0) + (this.inputController['up'].state ? 1 : 0)) * this.speedMag;

			var f = this.plBody.getWorldVector(Vec2((desiredVelocityX - currentVelocity.x), (desiredVelocityY - currentVelocity.y)));
			var p = this.plBody.getWorldPoint(Vec2(0.0, 0.0));
			this.plBody.applyLinearImpulse(f, p, true);
		}

		//process events
		if(this.eventQueue.length > 0)
		{
			for(var i = 0; i < this.eventQueue.length; i++)
			{
				//spawn the bullet
				var p = this.gs.pm.createProjectile("bullet");
				
				if(p)
				{
					var e = this.eventQueue[i];
					p.type = e.type;
					
					if(e.type == "bigBullet")
					{
						p.size = 3;
						p.init(this.gs, e.x, e.y, e.angle, p.size, 140, 6000, 3.5);
						
					}
					else //small normal bullet
					{
						p.size = 0.1;
						p.init(this.gs, e.x, e.y, e.angle, p.size, 0.8, 1000, 100);
						// init(gameServer, xc, yc, angle, size, speed, lifespan, density)
						
					}

					//tell all clients about the bullet
					var playingUsers = this.gs.um.getPlayingUsers();
					for(var i = 0; i < playingUsers.length; i++)
					{
						playingUsers[i].serverToClientEvents.push({
							"eventName": "addProjectile",
							"id": p.id,
							"x": p.xStarting,
							"y": p.yStarting,
							"angle": p.angle,
							"size": p.size
						});
					}
					
				}
			}

			this.eventQueue.length = 0;
		}

		if(this.bigBulletCounter >= 0)
		{
			this.bigBulletCounter -= dt;
		}
		

		//update input
		if(this.isInputDirty)
		{
			for(var key in this.inputController)
			{
				this.inputController[key].prevState = this.inputController[key].state;
				this.inputController[key].prevValue = this.inputController[key].value;
			}
			this.isInputDirty = false;
		}

		//change state
		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}


	createAddActiveCharacterEvent() {
		
	}
}

exports.Character = Character;