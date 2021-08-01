import ClientConstants from "../client-constants.js"

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

		if(c !== null) {
			//show teammate healing tint if it was you that healed him an enemy
			if(e.srcUserId === this.gc.myUserServerId) {
				c.showHealTint();
				this.createTextGraphic(e, c);
			}

			//show self healing tint if it was you that took the heal
			if(c.ownerId === this.gc.myUserServerId) {
				c.showHealTint();
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
			color: this.gc.mainScene.healTextColor, 
			fontSize: "18px",
			strokeThickness: this.gc.mainScene.healStrokeThickness,
			stroke: this.gc.mainScene.healStrokeColor
		}

		dmgText.textGraphics = this.gc.mainScene.add.text((character.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-18, (character.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1)-18, "+" + event.heal, textStyle);
		dmgText.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.myTextLayer);

		this.gc.mainScene.damageTexts.push(dmgText);
	}
}