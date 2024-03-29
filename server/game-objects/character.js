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
		this.nextCharacterClassResource = null;		//the resource key for the next state
		this.nextCharacterClassInput = "";			//the input that caused the next state (used to keep track of click-hold kind of states)
		this.exitCurrentState = false;

		this.plBody = null;

		this.frameInputController = {};	//input controller used in the frame to calculate physics/bullets/etc. Properties may be overwritten depending on the state of the character
		this.clientInputController = {}; //actual inputs sent from the client. 
		this.lockedLookDirection = 0;
		this.isInputDirty = false;
		this.isStateDirty = false;
		this.isShieldDirty = false;
		this.isChargeDirty = false;
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
		this.originalSpeed = 4;

		this.bAllowedLook = true;
		this.bAllowedMove = true;
		this.bAllowedFire = true;
		this.bAllowedAltFire = true;
		this.bAllowedInput = true;

		this.inputQueue = [];
		this.frameEventQueue = [];

		this.em = null;

		this.characterClassResourceId = null;
		this.characterClassResource = null; //reference to the resource

		this.activeStateCooldowns = [];
		this.stateCooldownsTemplates = {};

		this.collideOtherTeamCharacters = false;

		//resource data
		this.size = 1;
		this.planckRadius = 1;
		this.characterClearance = 1;

		this.projectileEnter = [];
		this.projectileStay = [];
		this.projectileLeave = [];
		this.projectileIndex = {};

		this.shieldMax = 0;
		this.shieldCur = 0;
		this.tempShieldRechargeCounter = 0; //temporary shield recharge counter
		this.tempShieldRechargeTimeLength = 250;
		this.tempShieldRechargeAmount = 8;
		this.tempShieldRechargeAmountOriginal = 8;
		
		this.bResetCharge = false;
		this.chargeMax = 0;
		this.chargeCur = 0;
		this.chargeSyncTimer = 1000;	//time length until the isChargeDirty becomes true again (just to sync with the clients every so often)
		this.chargeSyncTimerAcc = 0;
		this.isCharacterCharging = false;
	}

	changeAllowMove(bAllowedMove) {
		this.bAllowedMove = bAllowedMove;
	}

	changeAllowFire(bAllowedFire) {
		this.bAllowedFire = bAllowedFire;
	}

	changeAllowAltFire(bAllowedAltFire) {
		this.bAllowedAltFire = bAllowedAltFire;
	}

	changeAllowInput(bAllowInput) {
		this.bAllowedInput = bAllowInput;
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

	//forces a cooldown for a particular class state resource key
	activateStateCooldownForce(characterClassResourceKey, cooldownTimeLength) {
		var cooldownTemplate = this.stateCooldownsTemplates[characterClassResourceKey];

		if(cooldownTemplate !== undefined) {
			cooldownTemplate.onCooldown = true;
		}

		//push your own custom cooldown object
		var obj = {
			key: characterClassResourceKey,
			cooldownTimeLength: this.globalfuncs.getValueDefault(cooldownTimeLength, 0),
			cooldownTimeAcc: 0
		}

		this.activeStateCooldowns.push(obj);

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
		this.originalSpeed = this.walkingVelMagMax;
		

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
		
		//create planck fixture
		this.plBody.createFixture({
			shape: circleShape,
			density: 2.0,
			friction: 0.0,
			filterCategoryBits: collisionCategory,
			filterMaskBits: collisionMask
		});

		//calculate clearance
		this.characterClearance = this.planckRadius * 2 * this.size;


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


		//get the stat resources
		this.shieldCur = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.shieldCur, this.shieldCur);
		this.shieldMax = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.shieldMax, this.shieldMax);
		this.chargeMax = this.globalfuncs.getValueDefault(this?.characterClassResource?.data?.chargeMax, this.chargeMax);

		this.gs.em.emitEvent("character-activated", {characterId: this.id, teamId: this.teamId});
	}

	//called right before the character is officially deactivated with the characterManager.
	deactivated() {
		//final exit out of current state (just in case something needs to be deleted within the state)
		if(this.state !== null) {
			this.state.exit();
			this.state = null;
		}


		if(this.plBody !== null)
		{
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}

		///////////////////
		//all the stuff below came from game-server-running from the semi-old flow of gameobjectManager (manually activating/deactivation/deinit of game objects with bunch of callbacks).
		//its kind of hacky that it is HERE inside character.
		this.em.emitEvent("character-deactivated");
		this.gs.em.emitEvent("character-deactivated", {characterId: this.id, teamId: this.teamId});
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

		this.projectileEnter.length = 0;
		this.projectileStay.length = 0;
		this.projectileLeave.length = 0;
		this.projectileIndex = {};
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
			if(this.bAllowedInput && this.bAllowedMove) {
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
			if(this.bAllowedInput && this.bAllowedFire) {
				this.frameInputController.isFiring.state = this.clientInputController.isFiring.state;
			}
			//if they are not allowed to shoot, treat all shooting buttons as if nothing was pressed
			else {
				this.frameInputController.isFiring.state = false;
			}

			//if they are allowed to shoot, get the latest shooting buttons from the client for the frame
			if(this.bAllowedInput && this.bAllowedAltFire) {
				this.frameInputController.isFiringAlt.state = this.clientInputController.isFiringAlt.state;
			}
			//if they are not allowed to shoot, treat all shooting buttons as if nothing was pressed
			else {
				this.frameInputController.isFiringAlt.state = false;
			}

			if(this.bAllowedInput && this.bAllowedLook) {
				this.frameInputController.characterDirection.value = this.clientInputController.characterDirection.value;
			}
			else {
				this.frameInputController.characterDirection.value = this.lockedLookDirection;
			}
			
			



			//step 3 - translate the inputs for this frame into events to set the next states
			//cooldowns get checked here as well
			if(this.state == null && this.frameInputController.isFiring.state) {
				if(this.stateCooldownsTemplates[this.characterClassResource.data.fireStateKey] !== undefined && !this.stateCooldownsTemplates[this.characterClassResource.data.fireStateKey].onCooldown) {
					this.frameEventQueue.push({"key": this.characterClassResource.data.fireStateKey, "input": "isFiring"});
				}
			}

			if(this.state == null && this.frameInputController.isFiringAlt.state) {
				if(this.stateCooldownsTemplates[this.characterClassResource.data.altFireStateKey] !== undefined && !this.stateCooldownsTemplates[this.characterClassResource.data.altFireStateKey].onCooldown) {
					this.frameEventQueue.push({"key": this.characterClassResource.data.altFireStateKey, "input": "isFiringAlt"});
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

		//process events to set the next state
		if(this.frameEventQueue.length > 0) {
			for(var i = 0; i < this.frameEventQueue.length; i++) {
				this.setCharacterClassState(this.frameEventQueue[i].key, this.frameEventQueue[i].input);
			}
			
			this.frameEventQueue.length = 0;
		}

		//add dt to cooldowns
		if(this.activeStateCooldowns.length > 0) {
			for(var i = this.activeStateCooldowns.length - 1; i >= 0; i--) {
				this.activeStateCooldowns[i].cooldownTimeAcc += dt;
				if(this.activeStateCooldowns[i].cooldownTimeAcc >= this.activeStateCooldowns[i].cooldownTimeLength) {
					if(this.stateCooldownsTemplates[this.activeStateCooldowns[i].key] !== undefined) {
						this.stateCooldownsTemplates[this.activeStateCooldowns[i].key].onCooldown = false;
						this.stateCooldownsTemplates[this.activeStateCooldowns[i].key].cooldownTimeAcc = 0;
					}
					
					this.activeStateCooldowns.splice(i, 1);
				}
			}
		}

		//tell the user he has killed a character if applicable
		if(this.hpCur <= 0) {
			this.gs.gameState.characterDied(this.id);
			this.gs.gameState.destroyOwnersCharacter(this.ownerId, this.ownerType);
		}

		//if there was a 'reset' flag set, reset the actual values now.
		if(this.bResetCharge) {
			this.resetCharge();
			this.bResetCharge = false;
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
		//temporarily automatically increase the shield recharge counter
		if(this.shieldMax > 0) {
			this.tempShieldRechargeCounter += dt;

			if(this.tempShieldRechargeCounter >= this.tempShieldRechargeTimeLength) {
				this.tempShieldRechargeCounter = 0;
				this.modShield(this.tempShieldRechargeAmount);
			}
		}

		//update charge stat
		if(this.isCharacterCharging) {
			this.modCharge(dt);
			this.chargeSyncTimerAcc += dt;
			// console.log("charge cur: " + this.chargeCur + ". charge max: " + this.chargeMax);
			if(this.chargeSyncTimerAcc >= this.chargeSyncTimer) {
				this.chargeSyncTimerAcc = 0;
				this.isChargeDirty = true;
				// console.log("sync charge rate");
			}
		}


		//change state if there is a next one
		if(this.nextCharacterClassResource !== null) {
			var nextState = new CharacterClassState.CharacterClassState(this.gs, this, this.nextCharacterClassResource, this.nextCharacterClassInput);

			nextState.enter(dt);
			
			this.state = nextState;
			this.nextCharacterClassResource = null;
			this.nextCharacterClassInput = "";

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

	postPhysicsUpdate(dt) {

		/////////////////////////////////
		// update projectile collision //
		/////////////////////////////////
		//give each projectile that the character is still colliding with an update tick
		for(var i = 0; i < this.projectileStay.length; i++) {
			// console.log("Currently colliding with: " + this.projectileStay[i].id + ", " + this.projectileStay[i].timerAcc);

			for(var j = 0; j < this.projectileStay[i].effects.length; j++) {
				var e = this.projectileStay[i].effects[j];
				if(e.bUpdate) {
					e.timeAcc += dt;
					if(e.timeAcc >= e.period) {
						this.processProjectileHitEffects(this.projectileStay[i].p, e.characterEffectData);
					}
				}
			}
		}


		/////////////////////////////////
		// new projectile collision    //
		/////////////////////////////////
		//process collisions occuring this frame
		while(this.projectileEnter.length > 0) {
			var o = this.projectileEnter.shift();
			// console.log("NOW collided with: " + o.p.id);

			// apply a 1 time hit back vector (legacy. Maybe removed eventually.)
			//get resource data
			var pushbackVecMagnitude = this.gs.globalfuncs.getValueDefault(o.p?.projectileResource?.data?.projectileData?.pushbackVecMagnitude, 10);

			//add a push back to the character
			var pVel = o.p.plBody.getLinearVelocity();
			var temp = this.gs.pl.Vec2(pVel.x, pVel.y);
			temp.normalize();
			var xDir = temp.x;
			var yDir = temp.y;
			var mag = pushbackVecMagnitude / this.size;

			this.addForceImpulse(xDir, yDir, mag);

			//for each character effect, create a wrapper object to keep track of the collision time
			var characterEffectData = this.gs.globalfuncs.getValueDefault(o.p?.projectileResource?.data?.characterEffectData, []);

			for(var i = 0; i < characterEffectData.length; i++) {
				var e = {
					characterEffectData: characterEffectData[i],
					timeAcc: 0,
					period: characterEffectData[i].period,
					bUpdate: typeof characterEffectData[i].period === "number" ? true : false
				};

				o.effects.push(e);

				//process the hit effects on the first hit
				this.processProjectileHitEffects(o.p, e.characterEffectData);
				
			}

			//add projectile to the "staying" array until the character uncollides with it
			this.projectileStay.push(o);
		}

		//////////////////////////////////////
		// existing projectile collision    //
		//////////////////////////////////////
		while(this.projectileLeave.length > 0) {
			var p = this.projectileLeave.shift();
			// console.log("LEAVING collided with: " + p.id);
			var existingProjectile = this.getProjectileByID(p.id);

			if(existingProjectile !== null) {
				
				var pindex = this.projectileStay.findIndex((x) => {return x.id === p.id});
				if(pindex >= 0) {
					this.projectileStay.splice(pindex, 1);
				}

				this.updateProjectileIndex(p.id, null, "delete");
			}
		}
	}

	processProjectileHitEffects(p, characterEffectData) {
		//go through each character hit effect
		switch(characterEffectData.type) {
			case "damage":
				var value = this.gs.globalfuncs.getValueDefault(characterEffectData.value, 0);
				this.applyDamageEffect(p.ownerId, p.ownerType, value);
				break;
			case "heal":
				var value = this.gs.globalfuncs.getValueDefault(characterEffectData.value, 0);
				this.applyHealEffect(p.ownerId, value);
				break;
			case "force":
				var pPos = p.getPlanckPosition();
				var cPos = this.getPlanckPosition();
				if(pPos !== null && cPos !== null) {
					var mag = this.gs.globalfuncs.getValueDefault(characterEffectData.mag, 0);
					var dir = this.gs.globalfuncs.getValueDefault(characterEffectData.dir, "out");
					var dirMult = 1;
					if(dir === "out") {
						dirMult = 1;
					} else {
						dirMult = -1;
					}

					var temp = this.gs.pl.Vec2((cPos.x - pPos.x) * dirMult, (cPos.y - pPos.y) * dirMult);
					temp.normalize();
					this.addForceImpulse(temp.x, temp.y, mag);
				}
				break;
		}
		
	}


	//reset dirty flags back to false
	postWebsocketUpdate() {
		this.isInputDirty = false;
		this.isStateDirty = false;
		this.isShieldDirty = false;
		this.isChargeDirty = false;
	}


	setCharacterClassState(characterClassResourceKey, nextCharacterClassInput) {
		var r = this.gs.rm.getResourceByKey(characterClassResourceKey);
		if(r !== null) {
			this.nextCharacterClassResource = r;
			this.nextCharacterClassInput = nextCharacterClassInput;
		}
		else {
			this.nextCharacterClassResource = null;
			this.nextCharacterClassInput = "";
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

	checkDirtyShield() {
		return this.isShieldDirty;
	}

	modShield(shieldChange) {
		if((this.shieldCur + shieldChange) !== this.shieldCur) {
			this.isShieldDirty = true;
		}

		this.shieldCur += shieldChange;
		if(this.shieldCur < 0) {
			this.shieldCur = 0;
		}
		else if(this.shieldCur > this.shieldMax) {
			this.shieldCur = this.shieldMax;
		}
	}

	checkDirtyCharge() {
		return this.isChargeDirty;
	}

	modCharge(dt) {
		this.chargeCur += dt;

		if(this.chargeCur > this.chargeMax) {
			this.chargeCur = this.chargeMax;
		}

		if(this.chargeCur < 0) {
			this.chargeCur = 0;
		}
	}

	setIsCharacterCharging(bCharging) {
		this.isCharacterCharging = bCharging;
		this.isChargeDirty = true;
	}

	//sets the flag to reset the charge on the following frame
	setResetChargeFlag() {
		this.bResetCharge = true;
		
	}

	//actually resets the charge back to 0
	resetCharge() {
		this.isChargeDirty = true;
		this.isCharacterCharging = false;
		this.chargeCur = 0;
		this.chargeSyncTimerAcc = 0;
	}


	modHealth(hpChange) {
		this.hpCur += hpChange;
		if(this.hpCur < 0) {
			this.hpCur = 0;
		}
		else if(this.hpCur > this.hpMax) {
			this.hpCur = this.hpMax;
		}
	}

	setSpeed(speed) {
		this.walkingVelMagMax = speed;
		if(this.walkingVelMagMax < 0) {
			this.walkingVelMagMax = 0;
		}
	}

	resetSpeed() {
		this.walkingVelMagMax = this.originalSpeed;
	}

	getProjectileByID(id) {
		var o = null;

		if(this.projectileIndex[id] !== undefined) {
			o = this.projectileIndex[id];
		}

		return o;
	}

	
	updateProjectileIndex(id, obj, transaction) {
		if(transaction == 'create') {
			this.projectileIndex[id] = obj;
		}
		else if(transaction == 'delete') {
			if(this.projectileIndex[id] !== undefined) {
				delete this.projectileIndex[id];
			}
		}
	}


	//gets called by the collision system when the collision starts
	collisionProjectile(p, characterUserData, projectileUserData, contactObj, isCharacterA) {
		var existingProjectile = this.getProjectileByID(p.id);

		if(existingProjectile === null) {
			var o = {
				id: p.id,
				p: p,
				effects: []
			}
			this.projectileEnter.push(o);
			this.updateProjectileIndex(o.id, o, "create");
		}
	}
	
	//gets called by the collision system when the collision ends
	endCollisionProjectile(p, characterUserData, projectileUserData, contactObj, isCharacterA) {
		this.projectileLeave.push(p);
	}
	

	collisionHitscan(hitscanResult) {
		//process the hit effects
		var characterEffectData = [];
		var hitscanResource = this.gs.rm.getResourceByKey(hitscanResult.hitscanKey);
		if(hitscanResource !== null) {
			characterEffectData = this.gs.globalfuncs.getValueDefault(hitscanResource?.data?.characterEffectData, []);
		}
		for(var i = 0; i < characterEffectData.length; i++) {
			this.processHitscanHitEffects(hitscanResult, characterEffectData[i]);
		}
	}

	processHitscanHitEffects(hitscanResult, characterEffectData) {
		//go through each character hit effect
		switch(characterEffectData.type) {
			case "damage":
				var value = this.gs.globalfuncs.getValueDefault(characterEffectData.value, 0);
				this.applyDamageEffect(hitscanResult.ownerId, hitscanResult.ownerType, value);
				break;
			case "charge-damage":
				var minValue = this.gs.globalfuncs.getValueDefault(characterEffectData.minValue, 0);
				var maxValue = this.gs.globalfuncs.getValueDefault(characterEffectData.maxValue, 0);
				var chargeAmount = this.gs.globalfuncs.getValueDefault(hitscanResult.chargeAmount, 0);
				var chargeMax = this.gs.globalfuncs.getValueDefault(hitscanResult.chargeMax, 1);
				this.applyChargedDamageEffect(hitscanResult.ownerId, hitscanResult.ownerType, minValue, maxValue, chargeAmount, chargeMax);
				break;

			case "heal":
				var value = this.gs.globalfuncs.getValueDefault(characterEffectData.value, 0);
				this.applyHealEffect(hitscanResult.ownerId, value);
				break;
			case "hitscan-force":
				var p1 = hitscanResult.raycastResult.originPoint1;
				var p2 = hitscanResult.raycastResult.originPoint2;

				var mag = this.gs.globalfuncs.getValueDefault(characterEffectData.mag, 0);
				var dir = this.gs.globalfuncs.getValueDefault(characterEffectData.dir, "out");
				var dirMult = 1;

				if(dir === "out") {
					dirMult = 1;
				} else {
					dirMult = -1;
				}

				var temp = this.gs.pl.Vec2((p2.x - p1.x) * dirMult, (p2.y -p1.y) * dirMult);
				temp.normalize();
				this.addForceImpulse(temp.x, temp.y, mag);
				
				break;
		}
		
	}



	
	collisionCharacter(otherCharacter) {
		//apply contact damage
		if(otherCharacter.collideOtherTeamCharacters) {
			var u = this.gs.um.getUserByID(otherCharacter.ownerId);
			if(u !== null) {
				this.applyDamageEffect(u.id, u.ownerType, otherCharacter.contactDamage);
			}
		}
	}

	collisionPersistentProjectile(persistentProjectile) {
		//nothing!!!
	}

	collisionControlPoint(controlPoint) {
		//nothing yet
	}

	endCollisionControlPoint(controlPoint) {
		//nothing yet
	}

	getStateCooldown(characterClassStateResourceKey) {
		return this.stateCooldownsTemplates[characterClassStateResourceKey] !== undefined ? this.stateCooldownsTemplates[characterClassStateResourceKey] : null;
	}

	applyDamageEffect(ownerId, ownerType, damage) {
		this.modHealth(-damage);

		//update last hit by
		if(ownerId !== null) {
			this.lastHitByOwnerId = ownerId;
			this.lastHitByOwnerType = ownerType;
		}

		//create event for clients to notify them of damage
		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertTrackedEntityEvent("gameobject", this.id, {
				"eventName": "characterDamageEffect",
				"id": this.id,
				"damage": damage,
				"srcUserId": ownerId
			});
		}
	}

	applyChargedDamageEffect(ownerId, ownerType, minDamage, maxDamage, chargeAmount, chargeMax) {
		if(chargeMax === 0) {
			chargeMax = 1;
		}
		var damage = Math.round(minDamage + ((maxDamage - minDamage) * (chargeAmount/chargeMax)));
		this.modHealth(-damage);

		//update last hit by
		if(ownerId !== null) {
			this.lastHitByOwnerId = ownerId;
			this.lastHitByOwnerType = ownerType;
		}

		//create event for clients to notify them of damage
		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertTrackedEntityEvent("gameobject", this.id, {
				"eventName": "characterDamageEffect",
				"id": this.id,
				"damage": damage,
				"srcUserId": ownerId
			});
		}
	}

	applyHealEffect(srcUserId, healAmount) {
		//give the src healer heal points
		var actualHealAmount = Math.min(healAmount, (this.hpMax - this.hpCur));

		if(actualHealAmount > 0) {
			var u = this.gs.um.getUserByID(srcUserId);
			if(u !== null) {
				u.roundHealCount += actualHealAmount;
			}
		}

		this.modHealth(actualHealAmount);

		//create event for clients to notify them of damage
		var userAgents = this.gs.uam.getUserAgents();
		for(var i = 0; i < userAgents.length; i++) {
			userAgents[i].insertTrackedEntityEvent("gameobject", this.id, {
				"eventName": "characterHealEffect",
				"id": this.id,
				"heal": actualHealAmount,
				"srcUserId": srcUserId
			});
		}
	}



	//add a push back to the character for the one frame
	addForceImpulse(xDir, yDir, mag) {
		var pushBackVector = {xDir: xDir, yDir: yDir, mag: mag};
		this.forceImpulses.push(pushBackVector)
	}

	startContactDamage(contactDamage) {
		this.collideOtherTeamCharacters = true;
		this.contactDamage = contactDamage;
	}

	stopContactDamage() {
		this.collideOtherTeamCharacters = false;
		this.contactDamage = 0;
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
			"characterClassResourceId": this.characterClassResourceId,
			"characterShieldMax": this.shieldMax,
			"characterShieldCur": this.shieldCur,
			"characterChargeMax": this.chargeMax,
			"characterChargeCur": this.chargeCur,
			"isCharacterCharging": this.isCharacterCharging
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
			"characterDirection": this.frameInputController.characterDirection.value,
			"up": this.clientInputController.up.state,
			"down": this.clientInputController.down.state,
			"left": this.clientInputController.left.state,
			"right": this.clientInputController.right.state
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


	serializeActiveCharacterShieldUpdateEvent() {
		var eventData = null;
		eventData = {
			"eventName": "activeCharacterShieldUpdate",
			"id": this.id,
			"characterShieldCur": this.shieldCur,
			"characterShieldMax": this.shieldMax
		};

		return eventData;
	}

	serializeUpdateCharacterChargeEvent() {
		var eventData = null;
		eventData = {
			"eventName": "updateCharacterCharge",
			"id": this.id,
			"characterChargeCur": this.chargeCur,
			"isCharacterCharging": this.isCharacterCharging
		};

		return eventData;
	}
}

exports.Character = Character;