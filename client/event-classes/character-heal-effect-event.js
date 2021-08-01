export default class CharacterHealEffectEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var c = this.gc.gom.getGameObjectByServerID(e.id);

		if(c !== null)
		{
			var dmgText = {
				textGraphics: null,
				countdownTimer: 750 //ms
			};

			var textStyle = {
				color: this.gc.mainScene.healTextColor, 
				fontSize: "18px",
				strokeThickness: this.gc.mainScene.healStrokeThickness,
				stroke: this.gc.mainScene.healStrokeColor
			}

			dmgText.textGraphics = this.gc.mainScene.add.text((c.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1)-18, "-" + e.heal, textStyle);

			this.gc.mainScene.damageTexts.push(dmgText);

			//show teammate healing tint if it was you that healed him an enemy
			if(e.srcUserId === this.gc.myUserServerId) {
				c.showHealTint();
			}

			//show self healing tint if it was you that took the heal
			if(c.ownerId === this.gc.myUserServerId) {
				c.showHealTint();
			}
		}
	}
}