const {GlobalFuncs} = require('../global-funcs.js');
const {RoundStarting} = require('../round-states/round-starting.js');

class Round {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = 123; //hardcoded for now
		this.roundTimer = 0;
		this.roundTimeAcc = 0;

		this.stateName = "";
		this.stateEnum = 0;

		this.state = null;
		this.nextState = null;
	}

	roundInit(gameServer) {
		this.gs = gameServer;

		this.globalfuncs = new GlobalFuncs();

		this.state = new RoundStarting(this.gs, this);
		this.nextState = null;

		this.state.enter();
	}

	deinit() {
		this.state = null;
		this.nextState = null;
		this.globalfuncs = null;
	}


	update(dt) {
		this.state.update(dt);

		//change round state if necessary
		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;

			//tell users about the round's changed state
			var userAgents = this.gs.uam.getUserAgents();
			var event = this.serializeUpdateRoundStateEvent();

			for(var i = 0; i < userAgents.length; i++)
			{
				userAgents[i].insertTrackedEntityOrderedEvent("round", this.id, event)
			}
		}
	}

	getStateEnum() {
		return this.stateEnum;
	}

	serializeAddRoundEvent() {
		return {
			"eventName": "addRound",
			"id": this.id,
			"roundState": this.stateEnum,
			"roundTime": this.roundTimer,
			"roundTimeAcc": this.roundTimeAcc
		};
	}
	
	serializeUpdateRoundStateEvent() {
		return {
			"eventName": "updateRoundState",
			"id": this.id,
			"roundState": this.stateEnum,
			"roundTime": this.roundTimer,
			"roundTimeAcc": this.roundTimeAcc
		};
	}
}

exports.Round = Round;