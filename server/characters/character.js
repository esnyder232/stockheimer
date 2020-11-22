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
	}

	init(gameServer) {
		this.gs = gameServer;

		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;
		const world = this.gs.world;

		//create a plank box
		var boxShape = pl.Box(0.5, 0.5, Vec2(0, 0));

		this.plBody = world.createBody({
			position: Vec2(2.5, 3.0),
			type: pl.Body.DYNAMIC,
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