import ClientConstants from "../client-constants"

export default class DebugServerRaycastEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e) {
		console.log("Server raycast results: id: " + e.gameObjectId + 
		". x1: " + e.x1 +
		". y1: " + e.y1 +
		". x2: " + e.x2 +
		". y2: " + e.y2);

		//create a line
		var lineGraphics = this.gc.mainScene.add.graphics();
		var line = new Phaser.Geom.Line(
			e.x1 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio,
			e.y1 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1,
			e.x2 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio,
			e.y2 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1
		);
		lineGraphics.strokeLineShape(line);
	}
}