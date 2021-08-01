import ClientConstants from "../client-constants.js"

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

		if(c !== null) {
			//show enemy damage tint if it was you that hit an enemy
			if(e.srcUserId === this.gc.myUserServerId) {				
				c.showEnemyDamageTint();
				this.createTextGraphic(e, c);
			}

			//show self damage tint if it was you that took damage
			if(c.ownerId === this.gc.myUserServerId) {
				c.showSelfDamageTint();
				this.createTextGraphic(e, c);
			}
		}
	}


	createTextGraphic(event, character) {
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

		dmgText.textGraphics = this.gc.mainScene.add.text((character.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-18, (character.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1)-18, "-" + event.damage, textStyle);
		dmgText.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.myTextLayer);

		this.gc.mainScene.damageTexts.push(dmgText);
	}
}