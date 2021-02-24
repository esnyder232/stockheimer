export default class CharacterDamageEvent {
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
				color: this.gc.mainScene.damageTextColor, 
				fontSize: "18px",
				strokeThickness: this.gc.mainScene.damageStrokeThickness,
				stroke: this.gc.mainScene.damageStrokeColor
			}

			dmgText.textGraphics = this.gc.mainScene.add.text((c.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-18, (c.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1)-18, "-" + e.damage, textStyle);

			this.gc.mainScene.damageTexts.push(dmgText);
		}
	}
}