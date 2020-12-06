const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {UserDisconnectedState} = require("./user-disconnected-state.js");

class User {
	constructor() {
		this.gs = null;
		this.id = null;
		this.activeId = null;
		this.isActive = false;

		this.username = "";
		this.wsId = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.serverToClientEvents = []; //event queue to be processed by the packet system
		this.clientToServerEvents = []; //event queue to be processed by the main loop for events coming from the client

		this.characterId = null; //temp character id to establish a relationship between a user and character
		this.bReadyToPlay = false; //flag that gets flipped when the user sends the "readyToPlay" event

		this.inputQueue = [];

		this.trackedObjects = []; //the objects the user needs to be aware of
		this.trackedObjectsTransactions = []; //the changes made to the trackedObjects array

		this.trackedEvents = []; //events that need to eventually be told to the client (based on prioritization)
		this.trackedFragmentEvents = []; //events that need to be fragmented over several packets
		this.plBody = null; //used for tracking when objects are near the user
	}

	userInit(gameServer) {
		this.gs = gameServer;

		this.state = new UserDisconnectedState(this);
		this.state.enter();
	}

	userPostActivated() {
		//nothing for now
	}

	userPostStartPlaying() {
		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;

		//create a tracking sensor
		var trackingSensor = pl.Circle(Vec2(0, 0), 100);

		this.plBody = this.gs.world.createBody({
			position: Vec2(0, 0),
			type: pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {type:"user", id: this.id}
		});

		this.plBody.createFixture({
			shape: trackingSensor,
			density: 0.0,
			friction: 1.0,
			isSensor: true
		});
	}

	userPreStopPlaying() {
		if(this.plBody !== null)
		{
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
	}

	userPreDeactivated() {
		//nothing for now
	}

	userDeinit() {
		this.serverToClientEvents = [];
		this.clientToServerEvents = [];
		this.characterId = null;
		this.bReadyToPlay = false;
		this.inputQueue = [];

		this.trackedObjects = [];
		this.trackedObjectsTransactions = [];
		this.trackedEvents = [];

	}

	insertTrackedObject(userData) {
		var obj = null;

		if(userData.type == "character")
		{
			var o = this.gs.gom.getGameObjectByID(userData.id);
			if(o !== null)
			{
				obj = {transaction: "insert", type: "character", id: o.id};
			}
		}
		else if(userData.type == "projectile")
		{
			var o = this.gs.gom.getGameObjectByID(userData.id);
			if(o !== null)
			{
				obj = {transaction: "insert", type: "projectile", id: o.id};
			}
		}
		else if(userData.type == "wall")
		{
			obj = {transaction: "insert", type: "wall", id: userData.id};
		}

		if(obj !== null)
		{
			this.trackedObjectsTransactions.push(obj);
			this.isTrackedObjectsDirty = true;
		}
	}


	deleteTrackedObject(userData) {
		var obj = null;

		if(userData.type == "character")
		{
			obj = {transaction: "delete", type: "character", id: userData.id};
		}
		else if(userData.type == "projectile")
		{
			obj = {transaction: "delete", type: "projectile", id: userData.id};
		}
		else if(userData.type == "wall")
		{
			obj = {transaction: "delete", type: "wall", id: userData.id};
		}

		if(obj !== null)
		{
			this.trackedObjectsTransactions.push(obj);
			this.isTrackedObjectsDirty = true;
		}
	}


	update(dt) {
		this.state.update();

		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}
}

exports.User = User;
