import GlobalFuncs from "../global-funcs.js"
import RoundStarting from "../round-states/round-starting.js"
import RoundPlaying from "../round-states/round-playing.js"
import RoundOver from "../round-states/round-over.js"
import ServerEventQueue from "./server-event-queue.js";

export default class Round {
	constructor() {
		this.gc = null;
		this.globalfuncs = null;
		this.serverId = null;
		this.id = null;
		this.seq = null;

		this.state = null;
		this.nextState= null;
		this.roundTime = 0;
		this.roundTimeAcc = 0;

		this.serverEventMapping = {
			"addRound": this.changeState.bind(this),
			"updateRoundState": this.changeState.bind(this)
		}
	}
	
	roundInit(gc) {
		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();

		this.state = new RoundStarting(this.gc, this);
		this.nextState = null;

		this.state.enter();

		this.seq = new ServerEventQueue();
		this.seq.serverEventQueueInit(this.gc);
		this.seq.batchRegisterToEvent(this.serverEventMapping);
	}

	deinit() {
		this.gc = null;
		this.globalfuncs = null;
		
		this.seq.batchUnregisterFromEvent(this.serverEventMapping);
		this.seq.deinit();
		this.seq = null;
	}


	update(dt) {
		//not much going on in round. So just process the events every frame anyway, regardless of state.
		this.seq.processOrderedEvents();
		this.seq.processEvents();

		this.roundTimeAcc += dt;

		this.state.update(dt);

		//change round state if necessary
		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;

			window.dispatchEvent(new CustomEvent("round-state-updated"));
		}	
	}

	getMinutes() {
		return Math.floor((this.roundTime - this.roundTimeAcc) / (60 * 1000));
	}

	getSeconds() {
		return (Math.floor((this.roundTime - this.roundTimeAcc) / 1000) % 60).toString().padStart(2, "0");
	}

	//thss could be 2 different functions...but meh whatever
	changeState(e) {
		var initState = this.gc.gameConstantsInverse["RoundStates"][e.roundState];
		this.roundTime = e.roundTime;
		this.roundTimeAcc = e.roundTimeAcc;
		switch(initState)
		{
			case "STARTING":
				this.nextState = new RoundStarting(this.gc, this);
				break;
			case "PLAYING":
				this.nextState = new RoundPlaying(this.gc, this);
				break;
			case "OVER":
				this.nextState = new RoundOver(this.gc, this);
				break;
		}

		if(e.eventName === "addRound")
		{
			window.dispatchEvent(new CustomEvent("round-added"));
		}
	}
}

