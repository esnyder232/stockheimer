import GlobalFuncs from "../global-funcs.js"
import ServerEventQueue from "./server-event-queue.js"
import $ from "jquery"

export default class User {
	constructor() {
		this.gc = null;
		this.globalfuncs = null;
		this.serverId = null;
		this.id = null;
		this.userId = null;
		this.username = null;
		this.userKillCount = 0;		//total kills
		this.userDeathCount = 0;	//total deaths
		this.roundUserKillCount = 0;//kills in current round
		this.roundUserDeathCount = 0;	//deaths in current round

		this.userRtt = 0;
		this.teamId = null;

		this.userListItem = null;
		this.playingStateEnum = null;
		this.playingStateName = "";

		this.respawnTimer = 0;
		this.respawnTimerAcc = 0;

		this.seq = null;
		this.serverEventMapping = {
			"updateUserInfo": this.updateUserInfoEvent.bind(this),
			"updateUserPlayingState": this.updateUserPlayingState.bind(this),
			"updateUserRtt": this.updateUserRttEvent.bind(this),
			
		}
	}
	
	userInit(gc) {
		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();

		this.seq = new ServerEventQueue();
		this.seq.serverEventQueueInit(this.gc);
		this.seq.batchRegisterToEvent(this.serverEventMapping);

		this.playingStateEnum = this.gc.gameConstants["UserPlayingStates"]["SPECTATING"];
		this.playingStateName = this.gc.gameConstantsInverse["UserPlayingStates"][this.playingStateEnum];
	}

	activated() {
	}

	deactivated() {
	}

	deinit() {
		this.gc = null;
		this.globalfuncs = null;
		this.userPlayingState = null;

		this.seq.batchUnregisterFromEvent(this.serverEventMapping);
		this.seq.deinit();
	}

	update(dt) {
		this.seq.processOrderedEvents();
		this.seq.processEvents();

		if(this.playingStateName === "RESPAWNING") {
			this.respawnTimerAcc += dt;
		}
	}

	updateUserInfoEvent(e) {
		this.userKillCount = e.userKillCount;
		this.teamId = e.teamId;
		this.roundUserKillCount = e.roundUserKillCount;
		this.userDeathCount = e.userDeathCount;
		this.roundUserDeathCount = e.roundUserDeathCount;

		window.dispatchEvent(new CustomEvent("user-info-updated", {detail: {serverId: this.serverId}}));
	}

	updateUserRttEvent(e) {
		this.userRtt = e.userRtt;
		
		window.dispatchEvent(new CustomEvent("user-rtt-updated", {detail: {serverId: this.serverId}}));
	}

	updateUserPlayingState(e) {
		this.playingStateEnum = e.userPlayingState;
		this.playingStateName = this.gc.gameConstantsInverse["UserPlayingStates"][this.playingStateEnum];
		this.respawnTimer = e.userRespawnTime;
		this.respawnTimerAcc = e.userRespawnTimeAcc;

		window.dispatchEvent(new CustomEvent("user-playing-state-updated", {detail: {serverId: this.serverId}}));
	}

	getRespawnSeconds() {
		return (Math.floor((this.respawnTimer - this.respawnTimerAcc) / 1000) % 60);
	}
}

