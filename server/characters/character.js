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
	}

	init(gameServer) {
		this.gs = gameServer;

		//make simple little input controller
		this.inputController.up = {state: false, prevState: false};
		this.inputController.down = {state: false, prevState: false};
		this.inputController.left = {state: false, prevState: false};
		this.inputController.right = {state: false, prevState: false};

		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;
		const world = this.gs.world;

		//create a plank box
		var boxShape = pl.Box(0.5, 0.5, Vec2(0, 0));

		this.plBody = world.createBody({
			position: Vec2(2.5, 3.0),
			type: pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {characterId: this.id}
		});
		
		this.plBody.createFixture({
			shape: boxShape,
			density: 1.0,
			friction: 0.3
		});	
	}

	reset() {
		this.gs.world.destroyBody(this.plBody);
		this.plBody = null;
	}

	update(dt) {
		const Vec2 = this.gs.pl.Vec2;

		//update state
		if(this.isInputDirty)
		{
			console.log('character input diry');

			// b2Vec2 vel = body->GetLinearVelocity();
			// float desiredVel = 0;
			// switch ( moveState )
			// {
			//   case MS_LEFT:  desiredVel = -5; break;
			//   case MS_STOP:  desiredVel =  0; break;
			//   case MS_RIGHT: desiredVel =  5; break;
			// }
			// float velChange = desiredVel - vel.x;
			// float impulse = body->GetMass() * velChange; //disregard time factor
			// body->ApplyLinearImpulse( b2Vec2(impulse,0), body->GetWorldCenter() );


			var currentVelocity = this.plBody.getLinearVelocity();
			var desiredVelocityX = ((this.inputController['left'].state ? -1 : 0) + (this.inputController['right'].state ? 1 : 0)) * this.speedMag;
			var desiredVelocityY = ((this.inputController['down'].state ? -1 : 0) + (this.inputController['up'].state ? 1 : 0)) * this.speedMag;

			var f = this.plBody.getWorldVector(Vec2((desiredVelocityX - currentVelocity.x), (desiredVelocityY - currentVelocity.y)));
			var p = this.plBody.getWorldPoint(Vec2(0.0, 0.0));
			this.plBody.applyLinearImpulse(f, p, true);
		}
		

		//update input
		if(this.isInputDirty)
		{
			for(var key in this.inputController)
			{
				this.inputController[key].prevState = this.inputController[key].state;
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
}

exports.Character = Character;