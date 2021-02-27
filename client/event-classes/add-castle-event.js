export default class AddCastleEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var c = this.gc.gom.createGameObject("castle", e.id);
		c.castleInit(this.gc);
		c.x = e.x;
		c.y = e.y;
		c.size = e.size;
		c.hpCur = e.castleHpCur;
		c.hpMax = e.castleHpMax;
		c.name = e.castleName;
	}
}