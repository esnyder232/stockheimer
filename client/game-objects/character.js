const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');

class Character {
	constructor() {
		this.gc = null;
		this.id = null;	//server id
		this.clientId = null;
		this.type = "character";
		this.globalfuncs = null;

		this.ownerId = null;
		this.ownerType = "";

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		//bullshit variables for tech demo
		this.hpMax = 100;
		this.hpCur = 100;
		this.isDirty = false;

		//bullshit physics variables for tech demo
		this.walkingTargetVelVec = null;	//target
		this.walkingAccVec = null;			//control variable (and the PV is the plank velocity)
		this.walkingVelMagMax = 4;			//maximum walking speed you can get to
		this.walkingVelTolerance = 1;		//tolerance for when to snap to the walking velocity
		this.walkingAccMag = 10.0;			//acceleration to apply when trying to reach walking target
		this.walkingStoppingAccMag = this.walkingAccMag * 1000;
		this.walkingCurrentAccMagx = 0;
		this.walkingCurrentAccMagy = 0;

		this.inputQueue = [];
		this.eventQueue = [];
	}

	//called only once when the character is first created. This is only called once ever.
	characterInit(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();

		//make simple little input controller
		this.inputController.up = {state: false, prevState: false};
		this.inputController.down = {state: false, prevState: false};
		this.inputController.left = {state: false, prevState: false};
		this.inputController.right = {state: false, prevState: false};
		this.inputController.isFiring = {state: false, prevState: false};
		this.inputController.isFiringAlt = {state: false, prevState: false};
		this.inputController.characterDirection = {value: 0.0, prevValue: 0.0};
	}

	//called only after the character is activated. Put things in here that other systems will depend on.
	characterPostActivated() {
		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;
		const world = this.gs.world;

		this.walkingTargetVelVec = Vec2(0, 0);
		this.walkingAccVec = Vec2(0, 0);

		var circleShape = pl.Circle(Vec2(0, 0), 0.375);

		this.plBody = world.createBody({
			position: Vec2(this.xStarting, this.yStarting),
			type: pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {type:"character", id: this.id}
		});

		var collisionCategory = CollisionCategories["character_body"];
		var collisionMask = CollisionMasks["character_body"];

		if(this.ownerType === "ai")
		{
			collisionCategory = CollisionCategories["ai_body"];
			collisionMask = CollisionMasks["ai_body"];
		}
		
		this.plBody.createFixture({
			shape: circleShape,
			density: 2.0,
			friction: 0.0,
			filterCategoryBits: collisionCategory,
			filterMaskBits: collisionMask
		});
	}

	//called before the character is officially deactivated with the characterManager.
	characterPredeactivated() {
		if(this.plBody !== null)
		{
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
	}

	//called right before the character is officially deleted by the characterManager.
	characterDeinit() {
		this.gs = null;
		this.inputController = null;
		this.forceImpulses.length = 0;
		this.ownerId = null;
		this.ownerType = null;

	}

	update(dt) {
		//for now, just set isDirty to false at the BEGINNING of the update loop
		this.isDirty = false;

		const Vec2 = this.gs.pl.Vec2;

		//temporary. The character processes the inputs here.
		var firingInputFound = false;

		if(this.plBody !== null)
		{
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
	
				this.isInputDirty = true;
	
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
	
			//debug
			if(this.inputController["right"].state === false && this.inputController["right"].prevState === true)
			{
				var stophere = true;
			}

			//update state
			this.walkingTargetVelVec.x = ((this.inputController['left'].state ? -1 : 0) + (this.inputController['right'].state ? 1 : 0)) * this.walkingVelMagMax;
			this.walkingTargetVelVec.y = ((this.inputController['down'].state ? -1 : 0) + (this.inputController['up'].state ? 1 : 0)) * this.walkingVelMagMax;

			this.walkingCurrentAccMagx = this.walkingAccMag;
			this.walkingCurrentAccMagy = this.walkingAccMag;

			//character is trying to stop. Switch acceleration to "stopping" acceleration
			if(this.walkingTargetVelVec.x == 0)
			{
				this.walkingCurrentAccMagx = this.walkingStoppingAccMag;
			}
			if(this.walkingTargetVelVec.y == 0)
			{
				this.walkingCurrentAccMagy = this.walkingStoppingAccMag;
			}
	
			//apply walking acc
			var currentVel = this.plBody.getLinearVelocity();
			var xDiff = this.walkingTargetVelVec.x - currentVel.x; //the difference it would take to get your currentVel to the targetVel
			var yDiff = this.walkingTargetVelVec.y - currentVel.y; //the difference it would take to get your currentVel to the targetVel
			var xbound = 0;
			var ybound = 0;
			
			//make the bound a "lower" bound
			if(xDiff >= 0)
			{
				xbound = this.walkingTargetVelVec.x - this.walkingVelTolerance;
			}
			//make the bound an "upper" bound
			else
			{
				xbound = this.walkingTargetVelVec.x + this.walkingVelTolerance;
			}
	
			//x direction
			//make the bound a "lower" bound
			if(xDiff >= 0)
			{
				xbound = this.walkingTargetVelVec.x - this.walkingVelTolerance;
			}
			//make the bound an "upper" bound
			else
			{
				xbound = this.walkingTargetVelVec.x + this.walkingVelTolerance;
			}
	
			if(xDiff >= 0)
			{
				//You are going to overshoot. Just add enough to snap to the target velocity
				if(currentVel.x + this.walkingCurrentAccMagx >= xbound)
				{
					this.walkingAccVec.x = xDiff;
				}
				//You are going to undershoot. Just accelerate to the right.
				else
				{
					this.walkingAccVec.x = this.walkingCurrentAccMagx;
				}
			}
			//accelearte to the left
			else if(xDiff < 0)
			{
				//You are within the tolerance. Just add enough to snap to the target velocity
				if(currentVel.x - this.walkingCurrentAccMagx <= xbound)
				{
					this.walkingAccVec.x = xDiff;
				}
				//You are outside the tolerance. Just accelerate to the right.
				else
				{
					this.walkingAccVec.x = this.walkingCurrentAccMagx * -1;
				}
			}	
	
			//y direction
			//make the bound a "lower" bound
			if(yDiff >= 0)
			{
				ybound = this.walkingTargetVelVec.y - this.walkingVelTolerance;
			}
			//make the bound an "upper" bound
			else
			{
				ybound = this.walkingTargetVelVec.y + this.walkingVelTolerance;
			}
			
			if(yDiff >= 0)
			{
				//You are going to overshoot. Just add enough to snap to the target velocity
				if(currentVel.y + this.walkingCurrentAccMagy >= ybound)
				{
					this.walkingAccVec.y = yDiff;
				}
				//You are going to undershoot. Just accelerate to the right.
				else
				{
					this.walkingAccVec.y = this.walkingCurrentAccMagy;
				}
			}
			//accelearte to the left
			else if(yDiff < 0)
			{
				//You are within the tolerance. Just add enough to snap to the target velocity
				if(currentVel.y - this.walkingCurrentAccMagy <= ybound)
				{
					this.walkingAccVec.y = yDiff;
				}
				//You are outside the tolerance. Just accelerate to the right.
				else
				{
					this.walkingAccVec.y = this.walkingCurrentAccMagy * -1;
				}
			}

			
			if(Math.abs(this.walkingAccVec.x) >= 0.001 || Math.abs(this.walkingAccVec.y) >= 0.001)
			{
				var f = this.plBody.getWorldVector(Vec2(this.walkingAccVec.x, this.walkingAccVec.y));
				var p = this.plBody.getWorldPoint(Vec2(0.0, 0.0));

				this.plBody.applyLinearImpulse(f, p, true);
			}
			
	
			//process force impulses
			if(this.forceImpulses.length > 0)
			{
				for(var i = 0; i < this.forceImpulses.length; i++)
				{
					if(this.plBody !== null)
					{
						var f = this.plBody.getWorldVector(Vec2(this.forceImpulses[i].xDir * this.forceImpulses[i].mag, this.forceImpulses[i].yDir * this.forceImpulses[i].mag));
						var p = this.plBody.getWorldPoint(Vec2(0.0, 0.0));
						this.plBody.applyLinearImpulse(f, p, true);
					}
				}
	
				this.forceImpulses.length = 0;
			}
		}

		//process events
		if(this.eventQueue.length > 0)
		{
			for(var i = 0; i < this.eventQueue.length; i++)
			{
				//spawn the bullet
				var o = this.gs.gom.createGameObject("projectile");
				
				if(o)
				{
					var e = this.eventQueue[i];
					o.bulletType = e.type;
					o.characterId = this.id;
					o.ownerId = this.ownerId;
					o.ownerType = this.ownerType;

					if(e.type == "bigBullet")
					{
						o.bulletInit(this.gs, e.x, e.y, e.angle, 1.4, 5, 6000, 7.0);
					}
					else //small normal bullet
					{
						o.bulletInit(this.gs, e.x, e.y, e.angle, 0.05, 8, 1000, 100);
					}

					//just activate it here...whatever
					this.gs.gom.activateGameObjectId(o.id, o.bulletPostActivated.bind(o), o.cbBulletActivatedFailed.bind(this));
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

		if(this.hpCur == 0)
		{
			//tell the user he has killed a character if applicable
			//whatever
			// var owner = this.globalfuncs.getOwner(this.gs, this.ownerId, this.ownerType);

			// if(this.ownerType === "user" && owner !== null)
			// {
			// 	owner.userCharacterDied(this.id);
			// }
			// else if(this.ownerType === "ai" && owner !== null)
			// {
			// 	owner.userCharacterDied(this.id);
			// }

			this.gs.gameState.characterDied(this.id);
			this.gs.gameState.destroyOwnersCharacter(this.ownerId, this.ownerType);
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

	isHit(dmg, ownerIdHitBy, ownerTypeHitBy) {
		if(ownerIdHitBy !== null)
		{
			this.lastHitByOwnerId = ownerIdHitBy;
			this.lastHitByOwnerType = ownerTypeHitBy;

			// //debugging
			// var owner = this.globalfuncs.getOwner(this.gs, this.ownerId, this.ownerType);
			// var ownerHitBy = this.globalfuncs.getOwner(this.gs, this.lastHitByOwnerId, this.lastHitByOwnerType);

			// if(owner !== null && ownerHitBy !== null)
			// {
			// 	logger.log("info", owner.username + ' was hit for ' + dmg + ' dmg from ' + ownerHitBy.username);
			// }
		}

		//create event for clients to notify them of damage
		var activeUsers = this.gs.um.getActiveUsers();
		for(var i = 0; i < activeUsers.length; i++)
		{
			activeUsers[i].insertTrackedEntityEvent("gameobject", this.id, {
				"eventName": "characterDamage",
				"id": this.id,
				"damage": dmg
			});
		}
		
		
		this.hpCur -= dmg;
		if(this.hpCur < 0)
		{
			this.hpCur = 0;
		}
	}

	///////////////////////////////////
	// EVENT SERIALIZATION FUNCTIONS //
	///////////////////////////////////
	serializeAddActiveCharacterEvent() {
		var eventData = null;
		var bodyPos = {x: this.xStarting, y: this.yStarting}
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		var eventOwnerType = GameConstants.owner_types[this.ownerType];

		if(eventOwnerType === undefined)
		{
			eventOwnerType = 0;
		}

		eventData = {
			"eventName": "addActiveCharacter",
			"ownerId": this.ownerId,
			"ownerType": eventOwnerType,
			"id": this.id,
			"characterPosX": bodyPos.x,
			"characterPosY": bodyPos.y,
			"characterHpMax": this.hpMax,
			"characterHpCur": this.hpCur
		};
		
		return eventData;
	}


	serializeActiveCharacterUpdateEvent() {
		var eventData = null;
		var bodyPos = {x: this.xStarting, y: this.yStarting}
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "activeCharacterUpdate",
			"id": this.id,
			"characterPosX": bodyPos.x,
			"characterPosY": bodyPos.y,
			"characterHpCur": this.hpCur
		};

		
		return eventData;
	}

	serializeRemoveActiveCharacterEvent() {
		return {
			"eventName": "removeActiveCharacter",
			"id": this.id
		};
	}

}

exports.Character = Character;