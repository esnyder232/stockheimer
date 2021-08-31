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
		t.projectileColor1 = e.projectileColor1;
		t.projectileColor1Replace = e.projectileColor1Replace;
		t.projectileColor2 = e.projectileColor2;
		t.projectileColor2Replace = e.projectileColor2Replace;
		t.projectileColor3 = e.projectileColor3;
		t.projectileColor3Replace = e.projectileColor3Replace;
		t.projectileColor4 = e.projectileColor4;
		t.projectileColor4Replace = e.projectileColor4Replace;
		t.roundWins = e.roundWins;
		t.usersAlive = e.usersAlive;

		t.changeCharacterFillColor(e.characterFillColor);
		t.changeCharacterStrokeColor(e.characterStrokeColor);
		t.changeProjectileStrokeColor(e.projectileStrokeColor);
		t.changeCharacterTintColor(e.characterTintColor);
		t.changeCharacterPrimaryColor(e.characterPrimaryColor);
		t.changeCharacterPrimaryColorReplace(e.characterPrimaryColorReplace);
		t.changeCharacterSecondaryColor(e.characterSecondaryColor);
		t.changeCharacterSecondaryColorReplace(e.characterSecondaryColorReplace);

		t.createTeamShader();
		t.createProjectileShader();

		if(e.isSpectatorTeam) {
			this.gc.tm.assignSpectatorTeamByServerId(t.serverId);
		}
	}
}