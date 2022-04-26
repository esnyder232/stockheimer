const {GlobalFuncs} = require('../global-funcs.js');
const logger = require("../../logger.js")

class Team {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.name = "??? team";
		this.slotNum = 0;
		this.isSpectatorTeam = false;
		this.characterStrokeColor = "#ffffff";
		this.characterFillColor = "#ffffff";		//glow graphics
		this.characterTextStrokeColor = "#ffffff";
		this.characterTextFillColor = "#ffffff";
		this.killFeedTextColor = "#ffffff";
		this.projectileStrokeColor = "#000000"; //pretty sure i'm not using this anymore. But i don't want to break everything lol.
		this.characterTintColor = "#ffffff"; 	//pretty sure i'm not using this anymore. But i don't want to break everything lol.
		this.characterPrimaryColor = "#37946eff";
		this.characterPrimaryColorReplace = "#37946eff";
		this.characterSecondaryColor = "#6abe30ff";
		this.characterSecondaryColorReplace = "#6abe30ff";
		this.projectileColor1 = "#ffffffff";
		this.projectileColor1Replace = "#000000ff";
		this.projectileColor2 = "#ffffffff";
		this.projectileColor2Replace = "#000000ff";
		this.projectileColor3 = "#ffffffff";
		this.projectileColor3Replace = "#000000ff";
		this.projectileColor4 = "#ffffffff";
		this.projectileColor4Replace = "#000000ff";
		this.controlPointOwnerColor = "#ffffffff";
		this.controlPointCaptureColor = "#ffffffff";


		this.teamDirty = true;
		this.usersAliveDirty = true;
		this.roundPoints = 0;
		this.roundWins = 0;
		this.usersAlive = 0;

		this.kothDirty = true;
		this.kothTime = 0;
		this.kothTimeAcc = 0;
		this.kothTimerOn = false;
		this.kothSyncTimer = 3000;
		this.kothSyncTimeAcc = 0;

		this.eventCallbackMapping = [];
	}

	teamInit(gameServer) {
		this.gs = gameServer;

		this.globalfuncs = new GlobalFuncs();
		this.roundPoints = 0;
		this.teamDirty = false;

		this.eventCallbackMapping = [ 
			{eventName: "character-activated", cb: this.cbCharacterActivated.bind(this), handleId: null},
			{eventName: "character-deactivated", cb: this.cbCharacterDeactivated.bind(this), handleId: null}
		];

		this.gs.em.batchRegisterForEvent(this.eventCallbackMapping);
	}

	deinit() {
		this.gs.em.batchUnregisterForEvent(this.eventCallbackMapping);
		this.globalfuncs = null;
		this.gs = null;
	}

	modRoundPoints(modRoundPoints) {
		if(!this.isSpectatorTeam) {
			this.roundPoints += modRoundPoints;
			this.teamDirty = true;
		}
	}

	setRoundPoints(newRoundPoints) {
		if(!this.isSpectatorTeam) {
			this.roundPoints = newRoundPoints;
			this.teamDirty = true;
		}
	}

	setRoundWins(newRoundWins) {
		if(!this.isSpectatorTeam) {
			this.roundWins = newRoundWins;
			this.teamDirty = true;
		}
	}

	modRoundWins(modRoundWins) {
		if(!this.isSpectatorTeam) {
			this.roundWins += modRoundWins;
			this.teamDirty = true;
		}
	}

	updateUsersAlive() {
		if(!this.isSpectatorTeam) {
			this.usersAliveDirty = true;
		}
	}

	cbCharacterActivated(eventName, owner, eventData) {
		if(!this.isSpectatorTeam && eventData.teamId === this.id) {
			this.updateUsersAlive();
		}
	}

	cbCharacterDeactivated(eventName, owner, eventData) {
		if(!this.isSpectatorTeam && eventData.teamId === this.id) {
			this.updateUsersAlive();
		}
	}

	setKothTime(newKothTime) {
		if(!this.isSpectatorTeam) {
			this.kothTime = newKothTime;
			this.kothDirty = true;
		}
	}

	resetKothTimeAcc() {
		if(!this.isSpectatorTeam) {
			this.kothTimeAcc = 0;
			this.kothDirty = true;
		}
	}

	setKothTimerOn(isOn) {
		if(!this.isSpectatorTeam) {
			this.kothTimerOn = isOn;
			this.kothDirty = true;

			if(this.kothTimerOn) {
				this.kothSyncTimerAcc = 0;
			}
		}
	}

	modKothTimeAcc(dt) {
		if(!this.isSpectatorTeam) {
			this.kothTimeAcc += dt;

			if(this.kothTimeAcc >= this.kothTime) {
				this.kothTimeAcc = this.kothTime;
			}

			this.kothSyncTimerAcc += dt;
			if(this.kothSyncTimerAcc >= this.kothSyncTimer) {
				this.kothSyncTimerAcc = 0;
				this.kothDirty = true;
			}
		}
	}
	

	update(dt) {

		if(this.usersAliveDirty) {
			this.usersAliveDirty = false;
			var userSummary = this.gs.um.getUserAliveSummary();
			if(userSummary.teamIndex[this.id] !== undefined) {
				this.usersAlive = userSummary.teamIndex[this.id].usersAlive;
				this.teamDirty = true;
			}
		}

		//update the koth time if its turned on
		if(this.kothTimerOn) {
			this.modKothTimeAcc(dt);
		}


		if(this.teamDirty) {

			//send the round points update to all user agents
			var teamUpdateEvent = this.serializeUpdateTeam();

			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++) {
				userAgents[i].insertTrackedEntityEvent("team", this.id, teamUpdateEvent);
			}

			this.teamDirty = false;
		}


		if(this.kothDirty) {
			//send the koth update to all user agents
			var teamUpdateEvent = this.serializeUpdateTeamKoth();

			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++) {
				userAgents[i].insertTrackedEntityEvent("team", this.id, teamUpdateEvent);
			}

			this.kothDirty = false;
		}
	}

	serializeUpdateTeam() {
		return {
			"eventName": "updateTeam",
			"id": this.id,
			"roundPoints": this.roundPoints,
			"roundWins": this.roundWins,
			"usersAlive": this.usersAlive
		};
	}
	
	serializeAddTeamEvent() {
		return {
			"eventName": "addTeam",
			"id": this.id,
			"slotNum": this.slotNum,
			"name": this.name,
			"isSpectatorTeam": this.isSpectatorTeam,
			"characterStrokeColor": this.characterStrokeColor,
			"characterFillColor": this.characterFillColor,
			"characterTextStrokeColor": this.characterTextStrokeColor,
			"characterTextFillColor": this.characterTextFillColor,
			"killFeedTextColor": this.killFeedTextColor,
			"projectileStrokeColor": this.projectileStrokeColor,
			"characterTintColor": this.characterTintColor,
			"characterPrimaryColor": this.characterPrimaryColor,
			"characterPrimaryColorReplace": this.characterPrimaryColorReplace,
			"characterSecondaryColor": this.characterSecondaryColor,
			"characterSecondaryColorReplace": this.characterSecondaryColorReplace,
			"projectileColor1": this.projectileColor1,
			"projectileColor1Replace": this.projectileColor1Replace,
			"projectileColor2": this.projectileColor2,
			"projectileColor2Replace": this.projectileColor2Replace,
			"projectileColor3": this.projectileColor3,
			"projectileColor3Replace": this.projectileColor3Replace,
			"projectileColor4": this.projectileColor4,
			"projectileColor4Replace": this.projectileColor4Replace,
			"controlPointOwnerColor": this.controlPointOwnerColor,
			"controlPointCaptureColor": this.controlPointCaptureColor,
			"roundPoints": this.roundPoints,
			"roundWins": this.roundWins,
			"usersAlive": this.usersAlive,
			"kothTime": this.kothTime,
			"kothTimeAcc": this.kothTimeAcc,
			"kothTimeOn": this.kothTimerOn
		};
	}

	//this is never actually used...but its here if needed i guess
	serializeRemoveTeamEvent() {
		return {
			"eventName": "removeTeam",
			"id": this.id
		};
	}

	serializeUpdateTeamKoth() {
		return {
			"eventName": "updateTeamKoth",
			"id": this.id,
			"kothTime": this.kothTime,
			"kothTimeAcc": this.kothTimeAcc,
			"kothTimeOn": this.kothTimerOn
		};
	}
}

exports.Team = Team;