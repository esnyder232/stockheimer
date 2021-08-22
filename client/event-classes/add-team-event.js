export default class AddTeamEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var t = this.gc.tm.createTeam(e.id);
		t.teamInit(this.gc);
		t.slotNum = e.slotNum;
		t.name=  e.name;
		t.characterTextStrokeColor = e.characterTextStrokeColor;
		t.characterTextFillColor = e.characterTextFillColor;
		t.killFeedTextColor = e.killFeedTextColor;
		t.isSpectatorTeam = e.isSpectatorTeam;
		t.roundPoints = e.roundPoints;

		t.changeCharacterFillColor(e.characterFillColor);
		t.changeCharacterStrokeColor(e.characterStrokeColor);
		t.changeProjectileStrokeColor(e.projectileStrokeColor);
		t.changeCharacterTintColor(e.characterTintColor);
		t.changeCharacterPrimaryColor(e.characterPrimaryColor);
		t.changeCharacterPrimaryColorReplace(e.characterPrimaryColorReplace);
		t.changeCharacterSecondaryColor(e.characterSecondaryColor);
		t.changeCharacterSecondaryColorReplace(e.characterSecondaryColorReplace);

		t.createTeamShader();

		if(e.isSpectatorTeam) {
			this.gc.tm.assignSpectatorTeamByServerId(t.serverId);
		}
	}
}