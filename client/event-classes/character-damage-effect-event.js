export default class CharacterDamageEffectEvent {
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

			//show enemy damage tint if it was you that hit an enemy
			if(e.srcUserId === this.gc.myUserServerId) {
				c.showEnemyDamageTint();
			}

			//show self damage tint if it was you that took damage
			if(c.ownerId === this.gc.myUserServerId) {
				c.showSelfDamageTint();
			}
		}
	}
}