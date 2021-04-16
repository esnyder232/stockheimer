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
	}

	teamInit(gameServer) {
		this.gs = gameServer;

		this.globalfuncs = new GlobalFuncs();
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
			"killFeedTextColor": this.killFeedTextColor
		};
	}
}

exports.Team = Team;