import GlobalFuncs from "../global-funcs.js";

export default class Team {
	constructor() {
		this.id = null;
		this.serverId = null;
		this.gc = null;
		this.slotNum = null;
		this.name = "??? team";
		this.globalfuncs = null;
		this.isSpectatorTeam = false;

		this.characterStrokeColor = "#ffffff";
		this.characterFillColor = "#ffffff";
		this.characterTextStrokeColor = "#ffffff";
		this.characterTextFillColor = "#ffffff";
		this.killFeedTextColor = "#ffffff";

		this.phaserCharacterFillColor = 0xffffff;
		this.phaserCharacterStrokeColor = 0xffffff;
	}

	teamInit(gameClient) {
		this.gc = gameClient;
		this.globalfuncs = new GlobalFuncs();
	}

	changeCharacterFillColor(newColor) {
		this.characterFillColor = newColor;
		
		if(newColor[0] === "#")
		{
			newColor = newColor.slice(1, newColor.length);
		}
		
		this.phaserCharacterFillColor = Number.parseInt(newColor, 16);
	}

	changeCharacterStrokeColor(newColor) {
		this.characterStrokeColor = newColor;
		
		if(newColor[0] === "#")
		{
			newColor = newColor.slice(1, newColor.length);
		}
		
		this.phaserCharacterStrokeColor = Number.parseInt(newColor, 16);
	}
}
