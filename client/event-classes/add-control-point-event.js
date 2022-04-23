export default class AddControlPointEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e)
	{
		var c = this.gc.gom.createGameObject("control-point", e.id);
		c.controlPointInit(this.gc);
		c.x = e.x;
		c.y = e.y;
		c.width = e.width;
		c.height = e.height;
		c.capturingTimeRequired = e.capturingTimeRequired;
		c.ownerTeamId = e.ownerTeamId;
		c.capturingTeamId = e.capturingTeamId;
		c.capturingTimeAcc= e.capturingTimeAcc;
		c.capturingRate = e.capturingRate;
		c.capturingRateCoeff = e.capturingRateCoeff;
	}
}