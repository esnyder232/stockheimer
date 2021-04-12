import GlobalFuncs from "../global-funcs.js"
import EventQueue from "./event-queue.js"
import $ from "jquery"

export default class User {
	constructor() {
		this.gc = null;
		this.globalfuncs = null;
		this.serverId = null;
		this.id = null;
		this.userId = null;
		this.username = null;
		this.userKillCount = null;
		this.userRtt = 0;
		this.teamId = null;
		this.userPvp = true;

		this.userListItem = null;

		this.eq = null;
		this.eventMapping = {
			"updateUserInfo": this.updateUserInfoEvent.bind(this),
			"updateUserPlayingState": this.updateUserPlayingState.bind(this)
		}
	}
	
	userInit(gc) {
		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();

		this.eq = new EventQueue();
		this.eq.eventQueueInit(this.gc);
		this.eq.batchRegisterToEvent(this.eventMapping);
	}

	activated() {
	}

	deactivated() {
	}

	deinit() {
		this.gc = null;
		this.globalfuncs = null;

		this.eq.batchUnregisterFromEvent(this.eventMapping);
		this.eq.deinit();
	}

	update(dt) {
		this.eq.processOrderedEvents();
		this.eq.processEvents();
	}

	updateUserInfoEvent(e) {
		this.userKillCount = e.userKillCount;
		this.userRtt = e.userRtt;
		this.userPvp = e.userPvp;
		this.teamId = e.teamId;
	
		var c = this.gc.gom.getActiveGameObjects().find((x) => {return x.ownerType === "user" && x.ownerId === e.userId;});
		//DEBUG: this should be out of here
		if(c)
		{
			//c.pvpGraphics.setText(pvpPart);
		}
	}

	updateUserPlayingState(e) {
		//console.log('INSIDE USER: updating user playing state');
		
	}
}

