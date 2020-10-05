import GlobalFuncs from "../global-funcs.js"
import PlayerGroundIdleState from "./player-ground-idle-state.js";
import PlayerDamagedBaseState from "./player-damaged-base-state.js";

//the player class
export default class Player {
	constructor(scene) {
		this.scene = scene;
		this.globalfuncs = new GlobalFuncs();

		//mapping of actions to keyboard key codes. Export this to external file and load in on game startup.
		this.playerInputKeyboardMap = {
			left: 37,
			right: 39,
			up: 38,
			down: 40,
			jump: 90,
			attackWeak: 88,
			attackStrong: 67,
			start: 13,
			select: 32
		};

		//mapping of actions to gamepad buttons. Export this to external file and load in on game startup.
		this.playerInputGamepadMap = {
			jump: 'a',
			attackWeak: 'x',
			attackStrong: 'y',
			start: 'start',
			select: 'select'
		};

		//The actual controller used to control the player.
		this.playerController = {};

		//other variables
		this.debugCounter = 0;

		this.state = null; 
		this.nextState = null;

		this.walkSpeed = 100;

		//player physics variables
		this.moveVelTarget = 0;
		this.moveHysteresis = 0.5;
		this.moveVelVector = {
			x: 0,
			y: 0
		};
		this.physVelVectorFinal = {
			x: 0,
			y: 0
		}
		this.moveAccMagnitude = 50;
		this.moveFrictionCoeff = 0.1;
		
	}


	//this is a seperate function that is called by player states, and we may not want to ALWAYS call it (for example, if the player is damaged, we do not want to call the normal physics)	
	applyPlayerPhysics(dt)
	{


		/////////////////////////////////////////////
		//calculate movement acceleration and speed//
		var lowerBound = this.moveVelTarget - this.moveHysteresis;
		var upperBound = this.moveVelTarget + this.moveHysteresis;

		//determine if the player is within the target + hysteresis. If it is, snap the speed to the target.
		if(this.moveVelVector.x >= lowerBound && this.moveVelVector.x <= upperBound)
		{
			this.moveVelVector.x = this.moveVelTarget;
		}
		//apply acceleration to the direction of the target
		else
		{
			var accDirection = (this.moveVelTarget - this.moveVelVector.x) >= 0 ? 1 : -1;
			var velToAdd = (this.moveAccMagnitude * accDirection * this.moveFrictionCoeff) * dt/1000;
			var velPrediction = this.moveVelVector.x + velToAdd;

			//if the acceleration would cause the velocity to overshoot, snap velocity to the target
			if((accDirection > 0 && velPrediction >= lowerBound) || 
				(accDirection < 0 && velPrediction <= upperBound))
			{
				this.moveVelVector.x = this.moveVelTarget;
			}
			//if it undershoots, add acceleration like normal
			else
			{
				this.moveVelVector.x += velToAdd;
			}
		}
		
		this.physVelVectorFinal.x = this.moveVelVector.x;

		//apply velocities to rigid body
		//rb.velocity = physVelVectorFinal;





		//original
		// /////////////////////////////////////////////
		// //calculate movement acceleration and speed//
		// var lowerBound = moveVelTarget - moveHysteresis;
		// var upperBound = moveVelTarget + moveHysteresis;
		
		// //determine if the player is within the target + hysteresis. If it is, snap the speed to the target.
		// if(moveVelVector.x >= lowerBound && moveVelVector.x <= upperBound)
		// {
		// 	moveVelVector.x = moveVelTarget;
		// }
		// //apply acceleration to the direction of the target
		// else
		// {
		// 	var accDirection = (moveVelTarget - moveVelVector.x) >= 0 ? 1 : -1;
		// 	var velToAdd = (moveAccMagnitude * accDirection * moveFrictionCoeff) * dt;
		// 	var velPrediction = moveVelVector.x + velToAdd;

		// 	//if the acceleration would cause the velocity to overshoot, snap velocity to the target
		// 	if((accDirection > 0 && velPrediction >= lowerBound) || 
		// 		(accDirection < 0 && velPrediction <= upperBound))
		// 	{
		// 		moveVelVector.x = moveVelTarget;
		// 	}
		// 	//if it undershoots, add acceleration like normal
		// 	else
		// 	{
		// 		moveVelVector.x += velToAdd;
		// 	}
		// }
		
		// physVelVectorFinal.x = moveVelVector.x;
		// physVelVectorFinal.y = rb.velocity.y;

		// //apply velocities to rigid body
		// rb.velocity = physVelVectorFinal;
	}



	create() {
		//create animations
		this.globalfuncs.createSceneAnimsFromAseprite(this.scene, "slime", "slime-json");

		//create sprite
		var xPos = 175;
		var yPos = 80;

		this.sprite = this.scene.physics.add.sprite(xPos, yPos, "slime", 0);
		this.sprite.label = "player";
		this.sprite.setScale(2, 2);
		
		//controls
		//create a virtual button for the playerController
		for(var key in this.playerInputKeyboardMap)
		{
			var virtualButton = {
					keyCode: 0,
					phaserKeyCode: "",
					state: false,
					prevState: false,
					phaserKeyObj: {}
			};

			//find the phaserKeyCode (its innefficent I know. I don't care)
			for(var phaserKeyCode in Phaser.Input.Keyboard.KeyCodes)
			{
				if(Phaser.Input.Keyboard.KeyCodes[phaserKeyCode] == this.playerInputKeyboardMap[key])
				{
					virtualButton.phaserKeyCode = phaserKeyCode;
					break;
				}
			}

			virtualButton.keyCode = this.playerInputKeyboardMap[key];
			virtualButton.phaserKeyObj = this.scene.input.keyboard.addKey(this.playerInputKeyboardMap[key]);

			this.playerController[key] = virtualButton;
		}

		//for each virtual button, create a listener to change the virutal button's state
		for(var key in this.playerController)
		{
			this.scene.input.keyboard.on("keydown-"+this.playerController[key].phaserKeyCode, this.tempDown, this.playerController[key]);
			this.scene.input.keyboard.on("keyup-"+this.playerController[key].phaserKeyCode, this.tempUp, this.playerController[key]);
		}

		//initial state
		this.state = new PlayerGroundIdleState(this.scene, this);
		this.state.enter();

		//main body collision
		this.sprite.body.setSize(12, 12)
		this.sprite.body.setOffset(26, 28);
		this.scene.physics.add.collider(this.sprite, this.scene.layer1);		
		this.scene.physics.add.collider(this.sprite, this.scene.box.group, this.onCollideBox, null, this);

		//other physics stuff
		this.sprite.setDrag(0, 0);
		this.frameNum = 0;
		
		console.log(this);
	}

	
	tempDown(e) {
		this.state = true;
	}

	tempUp(e) {
		this.state = false;
	}
	

	update(timeElapsed, dt) {
		this.frameNum++;

		//testing a movement bug
		// if(this.frameNum == 5)
		// {
		// 	this.playerController.jump.state = true;
		// }
		// else if(this.frameNum == 46)
		// {
		// 	//this.scene.scene.pause(this.scene.scene.key);
		// 	this.playerController.right.state = true;
		// }
		// else if(this.frameNum == 49)
		// {
		// 	//this.scene.scene.pause(this.scene.scene.key);
		// 	this.playerController.right.state = false;
		// }
		// else if(this.frameNum == 70)
		// {
		// 	console.log('PAUSSSEE');
		// 	//this.scene.scene.pause(this.scene.scene.key);
		// 	console.log("jump state: state: %s, prevState: %s", this.playerController.jump.state, this.playerController.jump.prevState);
		// }
		

		this.state.update(timeElapsed, dt);

		//temporary for testing damage state. Press start to go into damage state.
		if(this.playerController.start.state && !this.playerController.start.prevState)
		{
			this.nextState = new PlayerDamagedBaseState(this.scene, this);
		}





		//tsting physics - it works!
		// if(this.frameNum == 10)
		// {
		// 	this.moveVelTarget = 10;
		// }
		// else if(this.frameNum == 100)
		// {
		// 	this.moveVelTarget = 0;
		// }
		// this.applyPlayerPhysics(dt);
		// console.log("FRAMENUM: %s - physVelVectorFinal.x: %s", this.frameNum, this.physVelVectorFinal.x);


		//update the prevState on the virtual controller for the player
		for(var key in this.playerController)
		{
			this.playerController[key].prevState = this.playerController[key].state;
		}

		//change states if needed
		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}

	applyJumpForce() {
		this.sprite.body.setVelocityY(-100);
	}

	applyWalkForce(xDir) {
		this.sprite.body.setVelocityX(xDir * this.walkSpeed);
	}

	applyDamageForce(xDir) {
		this.sprite.body.setVelocity(xDir * 100, -100);
	}

	postUpdate(timeElapsed, dt) {
		console.log('player post update');
	}
}

