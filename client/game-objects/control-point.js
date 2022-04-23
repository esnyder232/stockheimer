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

		this.ownerTeamId = 0;
		this.capturingTeamId = 0;
		this.capturingTimeAcc = 0;
		this.capturingRate = 0;
		this.capturingTimeRequired = 0;
		this.capturingRateCoeff = 0;

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
		//dispatch event so the UI can keep up
		window.dispatchEvent(new CustomEvent("control-point-activated", {detail: {serverId: this.serverId}}));
	}



	deactivated() {
		if(this.spriteGraphics !== null) {
			this.spriteGraphics.destroy();
			this.spriteGraphics = null;
		}

		//dispatch event so the UI can keep up
		window.dispatchEvent(new CustomEvent("control-point-deactivated", {detail: {serverId: this.serverId}}));
	}

	deinit() {
		this.gc = null;
		this.projectileResource = null;
	}

	updateControlPoint(e) {
		this.ownerTeamId = e.ownerTeamId;
		this.capturingTeamId = e.capturingTeamId;
		this.capturingTimeAcc = e.capturingTimeAcc;
		this.capturingRate = e.capturingRate;
		this.capturingRateCoeff = e.capturingRateCoeff;

		//dispatch event so the UI can keep up
		window.dispatchEvent(new CustomEvent("control-point-updated", {detail: {serverId: this.serverId}}));
	}


	update(dt) {
		this.seq.processOrderedEvents();
		this.seq.processEvents();
	}
}
