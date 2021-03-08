const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const GameConstants = require('../../shared_files/game-constants.json');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');
const logger = require("../../logger.js");

class Mage {
	constructor() {
		this.gs = null;
		this.id = null;
		this.isActive = false;
		this.type = "character";
		this.globalfuncs = null;

		this.ownerId = null;
		this.ownerType = ""; //translated to an integer when sent to the client. Integer mapping in game-constants.json.

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.plBody = null;
		this.isDirty = false;
		
		this.hpMax = 100;
		this.hpCur = 100;
		this.xStarting = 15;
		this.yStarting = -15.0;
		this.forceImpulses = [];
		this.lastHitByOwnerId = null;
		this.lastHitByOwnerType = null;
	}

	//called only once when the character is first created. This is only called once ever.
	characterInit(gameServer) {
		this.gs = gameServer;
		this.globalfuncs = new GlobalFuncs();
	}

	//called after the character is activated. Put things in here that other systems will depend on.
	activated() {
	}

	//called right before the character is officially deactivated with the characterManager.
	deactivated() {
	}

	//called right before the character is officially deleted by the characterManager.
	deinit() {
		this.gs = null;
		this.inputController = null;
		this.forceImpulses.length = 0;
		this.ownerId = null;
		this.ownerType = null;
	}

	update(dt) {

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

exports.Mage = Mage;