import GlobalFuncs from "../global-funcs.js"

export default class Character {
	constructor() {
		this.gc = null;
		this.id = null;
		this.serverId = null;
		this.type = "character";
		this.ownerId = null;
		this.ownerType = "";
		
		this.globalfuncs = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.hpMax = 100;
		this.hpCur = 100;
		this.isDirty = false;
	}

	characterInit(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();
	}

	deinit() {
		this.gc = null;
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

exports.Character = Character;