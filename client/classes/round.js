import GlobalFuncs from "../global-funcs.js"
import RoundStarting from "../round-states/round-starting.js"
import RoundPlaying from "../round-states/round-Playing.js"
import RoundOver from "../round-states/round-over.js"

export default class Round {
	constructor() {
		this.gc = null;
		this.globalfuncs = null;
		this.serverId = null;
		this.id = null;

		this.eventQueue = [];
		this.orderedEventQueue = [];

		this.state = null;
		this.nextState= null;

		this.eventMapping = {
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
	}

	deinit() {
		this.gc = null;
		this.globalfuncs = null;
	}

	update(dt) {
		//not much going on in round. So just process the events every frame anyway, regardless of state.
		this.processOrderedEvents();
		this.processEvents();

		this.state.update(dt);

		//change round state if necessary
		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}	
	}

	insertEvent(e) {
		this.eventQueue.push(e);
	}

	insertOrderedEvent(e) {
		this.orderedEventQueue.push(e);
	}

	processOrderedEvents() {
		if(this.orderedEventQueue.length > 0)
		{
			var e = this.orderedEventQueue.shift();
			
			if(this.eventMapping[e.eventName] !== undefined)
			{
				this.eventMapping[e.eventName](e);
			}
		}
	}

	processEvents() {
		for(var i = 0; i < this.eventQueue.length; i++)
		{
			var e = this.eventQueue[i];

			if(this.eventMapping[e.eventName] !== undefined)
			{
				this.eventMapping[e.eventName](e);
			}
		}

		this.eventQueue.length = 0;
	}

	changeState(e) {
		var initState = this.gc.gameConstantsInverse["RoundStates"][e.roundState];
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
	}
}

