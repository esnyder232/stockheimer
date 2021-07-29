const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const GameConstants = require('../../shared_files/game-constants.json');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');
const logger = require("../../logger.js");
const {EventEmitter} = require('../classes/event-emitter.js');
const CharacterClassState = require("../classes/character-class-state.js");


class Character {
	constructor() {
		this.gs = null;
		this.id = null;
		this.isActive = false;
		this.type = "character";
		this.resourceId = null;
		this.globalfuncs = null;

		this.ownerId = null;
		this.ownerType = ""; //translated to an integer when sent to the client. Integer mapping in game-constants.json.
		this.teamId = null;

		this.stateName = "";
		this.state = null;
		this.nextCharacterClassResource = null;
		this.exitCurrentState = false;

		this.plBody = null;

		this.frameInputController = {};	//input controller used in the frame to calculate physics/bullets/etc. Properties may be overwritten depending on the state of the character
		this.clientInputController = {}; //actual inputs sent from the client. 
		this.lockedLookDirection = 0;
		this.isInputDirty = false;
		this.isStateDirty = false;
		this.characterDirectionChanged = false;
		
		this.bigBulletCounter = 0;

		//bullshit variables for tech demo
		this.hpMax = 25;
		this.hpCur = 25;
		this.isDirty = false;
		this.xStarting = 15;
		this.yStarting = -15.0;
		this.forceImpulses = [];
		this.lastHitByOwnerId = null;
		this.lastHitByOwnerType = null;

		//bullshit physics variables for tech demo
		this.walkingTargetVelVec = null;	//target
		this.walkingAccVec = null;			//control variable (and the PV is the plank velocity)
		this.walkingVelMagMax = 4;			//maximum walking speed you can get to
		this.walkingVelTolerance = 1;		//tolerance for when to snap to the walking velocity
		this.walkingAccMag = 1000.0;			//acceleration to apply when trying to reach walking target
		this.walkingStoppingAccMag = this.walkingAccMag;
		this.walkingCurrentAccMagx = 0;
		this.walkingCurrentAccMagy = 0;

		this.bAllowedLook = true;
		this.bAllowedMove = true;
		this.bAllowedShoot = true;

		this.inputQueue = [];
		this.frameEventQueue = [];

		this.em = null;

		this.characterClassResourceId = null;
		this.characterClassResource = null; //reference to the resource

		this.activeStateCooldowns = [];
		this.stateCooldownsTemplates = {};

		//resource data
		this.size = 1;
		this.planckRadius = 1;
	}

	changeAllowMove(bAllowedMove) {
		this.bAllowedMove = bAllowedMove;
	}

	changeAllowShoot(bAllowedShoot) {
		this.bAllowedShoot = bAllowedShoot;
	}

	changeAllowLook(bAllowedLook) {
		//if your NOT allowed to look anymore, record the last known direction the character was facing (might as well do it here, idk)
		if(!bAllowedLook) {
			this.lockedLookDirection = this.frameInputController.characterDirection.value;
		}
		
		this.bAllowedLook = bAllowedLook;
	}


	activateStateCooldown(characterClassResourceKey) {
		var obj = this.stateCooldownsTemplates[characterClassResourceKey];
		if(obj !== undefined) {
			obj.onCooldown = true;
			obj.cooldownTimeAcc = 0;
			this.activeStateCooldowns.push(obj);
		}
	}

	//called only once when the character is first created. This is only called once ever.
	characterInit(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
		this.em = new EventEmitter(this);

		//make simple little input controller
		this.frameInputController.up = {state: false, prevState: false};
		this.frameInputController.down = {state: false, prevState: false};
		this.frameInputController.left = {state: false, prevState: false};
		this.frameInputController.right = {state: false, prevState: false};
		this.frameInputController.isFiring = {state: false, prevState: false};
		this.frameInputController.isFiringAlt = {state: false, prevState: false};
		this.frameInputController.characterDirection = {value: 0.0, prevValue: 0.0};

		this.clientInputController.up = {state: false, prevState: false};
		this.clientInputController.down = {state: false, prevState: false};
		this.clientInputController.left = {state: false, prevState: false};
		this.clientInputController.right = {state: false, prevState: false};
		this.clientInputController.isFiring = {state: false, prevState: false};
		this.clientInputController.isFiringAlt = {state: false, prevState: false};
		this.clientInputController.characterDirection = {value: 0.0, prevValue: 0.0};
	}

	//called after the character is activated. Put things in here that other systems will depend on.
	activated() {
		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;
		const world = this.gs.world;

		this.walkingTargetVelVec = Vec2(0, 0);
		this.walkingAccVec = Vec2(0, 0);

		
		//get character class resource Id
		var user = this.gs.um.getUserByID(this.ownerId);
		if(user !== null) {
			this.characterClassResourceId = user.characterClassResourceId;
		}

		//get resource data
		this.characterClassResource = this.gs.rm.getResourceByID(this.characterClassResourceId);

		//overwrite the defaults with data from the resource
		this.planckRadius = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.planckData?.plRadius, this.planckRadius);
		this.size = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.size, this.size);
		this.hpCur = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.hp, this.hpCur);
		this.hpMax = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.hp, this.hpMax);
		this.walkingVelMagMax = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.speed, this.walkingVelMagMax);
		

		if(this.planckRadius <= 0) {
			this.planckRadius = 1;
		}

		if(this.size <= 0) {
			this.size = 1;
		}

		

		//create planck shape
		var circleShape = pl.Circle(Vec2(0, 0), this.planckRadius * this.size);

		//create planck body
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
		
		//create planck fixture
		this.plBody.createFixture({
			shape: circleShape,
			density: 2.0,
			friction: 0.0,
			filterCategoryBits: collisionCategory,
			filterMaskBits: collisionMask
		});

		//tell the active user agents about it
		this.globalfuncs.insertTrackedEntityToPlayingUsers(this.gs, "gameobject", this.id);

		//create state cooldown objects
		var fireStateResource = this.gs.rm.getResourceByKey(this.characterClassResource.data.fireStateKey);
		var altFireStateResource = this.gs.rm.getResourceByKey(this.characterClassResource.data.altFireStateKey);
		var arrStates = [];

		if(fireStateResource !== null) {
			arrStates.push(fireStateResource);
		}
		if(altFireStateResource !== null) {
			arrStates.push(altFireStateResource);
		}

		for(var i = 0; i < arrStates.length; i++) {
			var obj = {
				key: arrStates[i].key,
				cooldownTimeLength: this.globalfuncs.getValueDefault(arrStates[i].data.cooldownTimeLength, 0),
				cooldownTimeAcc: 0,
				onCooldown: false
			}

			this.stateCooldownsTemplates[obj.key] = obj;
		}
	}

	//called right before the character is officially deactivated with the characterManager.
	deactivated() {
		if(this.plBody !== null)
		{
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}

		///////////////////
		//all the stuff below came from game-server-running from the semi-old flow of gameobjectManager (manually activating/deactivation/deinit of game objects with bunch of callbacks).
		//its kind of hacky that it is HERE inside character.
		var owner = null;
		owner = this.globalfuncs.getOwner(this.gs, this.ownerId, this.ownerType);
		
		this.em.emitEvent("character-deactivated");
		/////////////////////


		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0 ; i < userAgents.length; i++) {
			userAgents[i].deleteTrackedEntity("gameobject", this.id);
		}
	}

	//called right before the character is officially deleted by the characterManager.
	deinit() {
		this.gs = null;
		this.inputController = null;
		this.clientInputController = null;
		this.forceImpulses.length = 0;
		this.ownerId = null;
		this.ownerType = null;
		this.em.eventEmitterDeinit();
		this.em = null;
		this.activeStateCooldowns = [];
		this.stateCooldownsTemplates = {};
	}

	update(dt) {
		//for now, just set isDirty to false at the BEGINNING of the update loop
		this.isDirty = false;

		const Vec2 = this.gs.pl.Vec2;

		if(this.plBody !== null)
		{
			//Step 1 - get the last known input, and THAT is the input this frame
			if(this.inputQueue.length > 0)
			{
				//set the dirty flag so the websocket knows to send the update to clients
				this.isInputDirty = true;
				var lastKnownInput = this.inputQueue[this.inputQueue.length - 1];

				this.clientInputController.up.state = lastKnownInput.up;
				this.clientInputController.down.state = lastKnownInput.down;
				this.clientInputController.left.state = lastKnownInput.left;
				this.clientInputController.right.state = lastKnownInput.right;

				//assign fireing states
				this.clientInputController.isFiring.state = lastKnownInput.isFiring;
				this.clientInputController.isFiringAlt.state = lastKnownInput.isFiringAlt;

				//if your allowed to look, assign look state
				this.clientInputController.characterDirection.value = lastKnownInput.characterDirection;

				//detect any events that occured within the potentially clumped inputs (such as firing a bullet)
				for(var i = 0; i < this.inputQueue.length; i++) {
					if(this.inputQueue[i].isFiring && !this.clientInputController.isFiring.prevState) {
						this.clientInputController.isFiring.state = true;
					}
	
					if(this.inputQueue[i].isFiringAlt && !this.clientInputController.isFiringAlt.prevState) {
						this.clientInputController.isFiringAlt.state = true;
					}
				}
	
				//clear all inputs
				this.inputQueue.length = 0;
			}
	
			//step 2 - apply game logic for the client input controller to get the input for THIS frame
			//if they are allowed to move, get the latest directional inputs from the client for the frame
			if(this.bAllowedMove) {
				this.frameInputController.up.state = this.clientInputController.up.state;
				this.frameInputController.down.state = this.clientInputController.down.state;
				this.frameInputController.left.state = this.clientInputController.left.state;
				this.frameInputController.right.state = this.clientInputController.right.state;
			}
			//if they are not allowed to move, treat all directional input for the frame as if nothing was pressed
			else {
				this.frameInputController.up.state = false;
				this.frameInputController.down.state = false;
				this.frameInputController.left.state = false;
				this.frameInputController.right.state = false;
			}

			//if they are allowed to shoot, get the latest shooting buttons from the client for the frame
			if(this.bAllowedShoot) {
				this.frameInputController.isFiring.state = this.clientInputController.isFiring.state;
				this.frameInputController.isFiringAlt.state = this.clientInputController.isFiringAlt.state;
			}
			//if they are not allowed to shoot, treat all shooting buttons as if nothing was pressed
			else {
				this.frameInputController.isFiring.state = false;
				this.frameInputController.isFiringAlt.state = false;
			}

			if(this.bAllowedLook) {
				this.frameInputController.characterDirection.value = this.clientInputController.characterDirection.value;
			}
			else {
				this.frameInputController.characterDirection.value = this.lockedLookDirection;
			}
			
			



			//step 3 - translate the inputs for this frame into events
			//cooldowns get applied here
			if(this.frameInputController.isFiring.state && !this.frameInputController.isFiring.prevState) {
				if(!this.stateCooldownsTemplates[this.characterClassResource.data.fireStateKey].onCooldown) {
					this.frameEventQueue.push(this.characterClassResource.data.fireStateKey);
				}
			}

			if(this.frameInputController.isFiringAlt.state && !this.frameInputController.isFiringAlt.prevState) {
				if(!this.stateCooldownsTemplates[this.characterClassResource.data.altFireStateKey].onCooldown) {
					this.frameEventQueue.push(this.characterClassResource.data.altFireStateKey);
				}
			}




			//debug
			// if(this.inputController["right"].state === false && this.inputController["right"].prevState === true)
			// {
			// 	var stophere = true;
			// }

			//step 4 - apply frame inputs and events
			//update state
			this.walkingTargetVelVec.x = ((this.frameInputController['left'].state ? -1 : 0) + (this.frameInputController['right'].state ? 1 : 0)) * this.walkingVelMagMax;
			this.walkingTargetVelVec.y = ((this.frameInputController['down'].state ? -1 : 0) + (this.frameInputController['up'].state ? 1 : 0)) * this.walkingVelMagMax;

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

			//process movement
			if((Math.abs(this.walkingAccVec.x) >= 0.001 || Math.abs(this.walkingAccVec.y) >= 0.001))
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
		if(this.frameEventQueue.length > 0) {
			for(var i = 0; i < this.frameEventQueue.length; i++) {
				this.setCharacterClassState(this.frameEventQueue[i]);
			}
			
			this.frameEventQueue.length = 0;
		}

		//add dt to cooldowns
		if(this.activeStateCooldowns.length > 0) {
			for(var i = this.activeStateCooldowns.length - 1; i >= 0; i--) {
				this.activeStateCooldowns[i].cooldownTimeAcc += dt;
				if(this.activeStateCooldowns[i].cooldownTimeAcc >= this.activeStateCooldowns[i].cooldownTimeLength) {
					this.stateCooldownsTemplates[this.activeStateCooldowns[i].key].onCooldown = false;
					this.stateCooldownsTemplates[this.activeStateCooldowns[i].key].cooldownTimeAcc = 0;
					this.activeStateCooldowns.splice(i, 1);
				}
			}
		}

		// if(this.bigBulletCounter >= 0)
		// {
		// 	this.bigBulletCounter -= dt;
		// }
		

		//tell the user he has killed a character if applicable
		if(this.hpCur <= 0) {
			this.gs.gameState.characterDied(this.id);
			this.gs.gameState.destroyOwnersCharacter(this.ownerId, this.ownerType);
		}

		//update state if there is one
		if(this.state !== null) {
			this.state.update(dt);

			//exit the state if the flag is set
			if(this.exitCurrentState) {
				this.state.exit(dt);
				this.state = null;
				this.isStateDirty = true;
			}
		}

		//change state if there is a next one
		if(this.nextCharacterClassResource !== null) {
			var nextState = new CharacterClassState.CharacterClassState(this.gs, this, this.nextCharacterClassResource);

			nextState.enter(dt);
			
			this.state = nextState;
			this.nextCharacterClassResource = null;

			this.isStateDirty = true;
		}
		
		this.exitCurrentState = false;

		//update input controllers for prevState/prevValue
		if(this.isInputDirty) {
			for(var key in this.clientInputController) {
				this.clientInputController[key].prevState = this.clientInputController[key].state;
				this.clientInputController[key].prevValue = this.clientInputController[key].value;
			}
		}

		for(var key in this.frameInputController) {
			this.frameInputController[key].prevState = this.frameInputController[key].state;
			this.frameInputController[key].prevValue = this.frameInputController[key].value;
		}

		//if the state changed at all, send out an event to all clients to tell them
		if(this.isStateDirty) {
			//create event for clients to notify them of damage
			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++) {
				var eventData = this.serializeUpdateCharacterStateEvent();
				userAgents[i].insertTrackedEntityOrderedEvent("gameobject", this.id, eventData);
			}
		}

		this.em.update(dt);
	}

	//reset dirty flags back to false
	postWebsocketUpdate() {
		this.isInputDirty = false;
		this.isStateDirty = false;
	}


	setCharacterClassState(characterClassResourceKey) {
		var r = this.gs.rm.getResourceByKey(characterClassResourceKey);
		if(r !== null) {
			this.nextCharacterClassResource = r;
		}
		else {
			this.nextCharacterClassResource = null;
		}
		
		this.exitCurrentState = true;
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
		if(this.plBody !== null) {
			result = this.plBody.isAwake();
		}

		if(this.isInputDirty) {
			result = true;
		}

		return result || this.isDirty;
	}

	modHealth(hpChange) {
		this.hpCur -= hpChange;
		if(this.hpCur < 0) {
			this.hpCur = 0;
		}
	}

	collisionProjectile(p, characterUserData, projectileUserData, contactObj, isCharacterA) {
		//get resource data
		var damage = this.gs.globalfuncs.getValueDefault(p?.projectileResource?.data?.projectileData?.damage, 0);
		var pushbackVecMagnitude = this.gs.globalfuncs.getValueDefault(p?.projectileResource?.data?.projectileData?.pushbackVecMagnitude, 10);

		//add a push back to the character
		var pVel = p.plBody.getLinearVelocity();
		var temp = this.gs.pl.Vec2(pVel.x, pVel.y);
		temp.normalize();
		var xDir = temp.x;
		var yDir = temp.y;
		var mag = pushbackVecMagnitude / this.size;

		this.addForceImpulse(xDir, yDir, mag);

		//apply damage to hp
		this.modHealth(damage);

		//update last hit by
		if(p.ownerId !== null) {
			this.lastHitByOwnerId = p.ownerId;
			this.lastHitByOwnerType = p.ownerType;

			//create event for clients to notify them of damage
			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++) {
				userAgents[i].insertTrackedEntityEvent("gameobject", this.id, {
					"eventName": "characterDamage",
					"id": this.id,
					"damage": damage,
					"srcUserId": p.ownerId
				});
			}
		}
	}

	//add a push back to the character for the one frame
	addForceImpulse(xDir, yDir, mag) {
		var pushBackVector = {xDir: xDir, yDir: yDir, mag: mag};
		this.forceImpulses.push(pushBackVector)
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

		var eventOwnerType = GameConstants.OwnerTypes[this.ownerType];

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
			"characterHpCur": this.hpCur,
			"characterClassResourceId": this.characterClassResourceId
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
			"characterHpCur": this.hpCur,
			"characterDirection": this.frameInputController.characterDirection.value
		};

		return eventData;
	}

	serializeRemoveActiveCharacterEvent() {
		return {
			"eventName": "removeActiveCharacter",
			"id": this.id
		};
	}

	serializeUpdateCharacterStateEvent() {
		//get current character state. If the character isn't in a state, the resource Id will be 0.
		var characterClassStateResourceid = 0;
		var stateTimeAcc = 0;
		
		if(this.state !== null) {
			characterClassStateResourceid = this.state.characterClassStateResourceId;
			stateTimeAcc = this.state.timeAcc;
		}

		var eventData = {
			"eventName": "updateCharacterState",
			"characterId": this.id,
			"characterClassStateResourceId": characterClassStateResourceid,
			"stateTimeAcc": stateTimeAcc
		};

		return eventData;
	}

}

exports.Character = Character;