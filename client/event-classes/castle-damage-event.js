export default class CastleDamageEvent {
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
				strokeThickness: 1,
				stroke: this.gc.mainScene.damageTextColor
			}
	
			dmgText.textGraphics = this.gc.mainScene.add.text((c.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-10, (c.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1)-28, "-" + e.damage, textStyle);
	
			this.gc.mainScene.damageTexts.push(dmgText)
		}
	}
}