const {GlobalFuncs} = require('../global-funcs.js');


class Team {
	constructor() {
		this.gs = null;
		this.globalfuncs = null;
		this.id = null;
		this.name = "??? team";
		this.slotNum = 0;
		this.isSpectatorTeam = false;
		this.characterStrokeColor = "#ffffff";
		this.characterFillColor = "#ffffff";
		this.characterTextStrokeColor = "#ffffff";
		this.characterTextFillColor = "#ffffff";
		this.killFeedTextColor = "#ffffff";
		this.projectileStrokeColor = "#000000";
		this.roundPoints = 0;
	}

	teamInit(gameServer) {
		this.gs = gameServer;

		this.globalfuncs = new GlobalFuncs();
		this.roundPoints = 0;
		this.teamDirtyEvent = false;
	}

	modRoundPoints(modRoundPoints) {
		this.roundPoints += modRoundPoints;
		this.teamDirtyEvent = true;
	}

	setRoundPoints(newRoundPoints) {
		this.roundPoints = newRoundPoints;
		this.teamDirtyEvent = true;
	}

	update(dt) {
		if(this.teamDirtyEvent) {

			//send the round points update to all user agents
			var teamUpdateEvent = this.serializeUpdateTeam();

			var userAgents = this.gs.uam.getUserAgents();
			for(var i = 0; i < userAgents.length; i++) {
				userAgents[i].insertTrackedEntityEvent("team", this.id, teamUpdateEvent);
			}

			this.teamDirtyEvent = false;
		}
	}

	serializeUpdateTeam() {
		return {
			"eventName": "updateTeam",
			"id": this.id,
			"roundPoints": this.roundPoints
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
			"roundPoints": this.roundPoints
		};
	}

	//this is never actually used...but its here if needed i guess
	serializeRemoveTeamEvent() {
		return {
			"eventName": "removeTeam",
			"id": this.id
		};
	}
}

exports.Team = Team;