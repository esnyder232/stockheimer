import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConstants from "../client-constants.js"
import ServerEventQueue from "../classes/server-event-queue.js"

export default class ControlPoint {
	constructor() {
		this.gc = null;
		this.id = null;
		this.type = "control-point";
		this.x = 0;
		this.y = 0;
		this.globalfuncs = null;

		this.isDirty = false;
		this.spriteGraphics = null;

		this.serverEventMapping = {
			"updateControlPoint": this.updateControlPoint.bind(this)
		}
	}

	controlPointInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
		this.seq = new ServerEventQueue();
		this.seq.serverEventQueueInit(this.gc);
		this.seq.batchRegisterToEvent(this.serverEventMapping);
	}

	activated() {

	}



	deactivated() {
		if(this.spriteGraphics !== null) {
			this.spriteGraphics.destroy();
			this.spriteGraphics = null;
		}
	}

	deinit() {
		this.gc = null;
		this.projectileResource = null;
	}

	updateControlPoint(e) {
		// console.log("CONTROL POINT UPDATE");
		// console.log(e);
	}


	update(dt) {
		this.seq.processOrderedEvents();
		this.seq.processEvents();
	}
}
