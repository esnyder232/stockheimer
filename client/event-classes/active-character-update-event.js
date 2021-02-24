export default class ActiveCharacterUpdateEvent {
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
			c.x = e.characterPosX;
			c.y = e.characterPosY;
			c.hpCur = e.characterHpCur;

			//just to make it equivalent to the old "architecture"
			c.boxGraphics.setX(c.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
			c.boxGraphics.setY(c.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);
			c.textGraphics.setX((c.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-18)
			c.textGraphics.setY((c.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1) + 18)

			c.pvpGraphics.setX((c.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-10)
			c.pvpGraphics.setY((c.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1) - 36)

			c.hpTextGraphics.setX((c.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio)-18)
			c.hpTextGraphics.setY((c.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1) + 34)
			c.hpTextGraphics.setText(c.hpCur + "/" + c.hpMax);
		}
	}
}