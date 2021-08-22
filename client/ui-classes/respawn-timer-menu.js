import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class RespawnTimerMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.menu = null;

		this.windowsEventMapping = [];

		this.internalSampleTimer = 250; //sample timer so i don't run jquery 60 times a second
		this.updateMessageOnUpdate = false;
	}

	init(gc) {
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();

		//create window event mapping
		this.windowsEventMapping = [
			{event: 'user-playing-state-updated', func: this.userPlayingStateUpdated.bind(this)},
		];
	}

	activate() {
		//register event mappings
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#respawn-menu");
		this.respawnMessage = $("#respawn-message");

		//reset to initial state
		this.menu.removeClass("hide");
		this.respawnMessage.text("Spectating");
	}

	userPlayingStateUpdated(e) {
		if(this.gc.myUserServerId!== null && e.detail.serverId === this.gc.myUserServerId) {
			this.updateRespawnMessage();
		}
	}

	updateRespawnMessage() {
		if(this.gc.myUser !== null) {
			if (this.gc.theRound.stateName === "MAPSTART") {
				this.menu.removeClass("hide");
				this.updateMessageOnUpdate = true;
				this.respawnMessage.text("Waiting for players to join");
			}
			else if (this.gc.theRound.stateName === "MAPEND") {
				this.menu.removeClass("hide");
				this.updateMessageOnUpdate = true;
				this.respawnMessage.text("Server is changing maps");
			}
			else {
				switch(this.gc.myUser?.playingStateName) {
					case "SPECTATING":
						this.menu.removeClass("hide");
						this.respawnMessage.text("Spectating");
						this.updateMessageOnUpdate = false;
						break;
					case "CLASS_PICKING":
						this.menu.removeClass("hide");
						this.respawnMessage.text("Pick a class to respawn");
						break;
	
					case "RESPAWNING":
					case "DEAD":
						this.menu.removeClass("hide");
						if(this.gc.theRound.stateName === "PLAYING" || this.gc.theRound.stateName === "STARTING") {
							this.updateMessageOnUpdate = true;
							var secondsLeft = this.gc.myUser?.getRespawnSeconds();
							if(secondsLeft <= 0) {
								secondsLeft = 0;
							}
							this.respawnMessage.text("Respawning in " + secondsLeft + " seconds");
						}
						else if (this.gc.theRound.stateName === "OVER") {
							this.updateMessageOnUpdate = false;
							this.respawnMessage.text("Waiting for the round to restart");
						}
						break;
					case "PLAYING":
						this.menu.addClass("hide");
						this.updateMessageOnUpdate = false;
						break;
					default:
						this.menu.addClass("hide");
						break;
				}
			}
		}
	}

	update(dt) {
		// if(this.updateMessageOnUpdate)
		// {
		// 	this.internalSampleTimer -= dt;
		// 	if(this.internalSampleTimer <= 0)
		// 	{
		// 		this.updateRespawnMessage();
		// 		this.internalSampleTimer = 250;
		// 	}
		// }
		this.internalSampleTimer -= dt;
		if(this.internalSampleTimer <= 0)
		{
			this.updateRespawnMessage();
			this.internalSampleTimer = 250;
		}
	}

	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}


}