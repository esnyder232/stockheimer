import Hitscan from "../game-objects/hitscan.js"

export default class AddHitscanEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e) {
		var hs = new Hitscan();
		hs.x1 = e.x1;
		hs.y1 = e.y1;
		hs.x2 = e.x2;
		hs.y2 = e.y2;
		hs.teamId = e.teamId;
		hs.gameObjectIdHit = e.gameObjectIdHit;
		hs.hitscanResourceId = e.hitscanResourceId;
		hs.hitscanInit(this.gc);

		this.gc.mainScene.hitscanArray.push(hs);


		// //create a line
		// var lineGraphics = this.gc.mainScene.add.graphics();
		// var line = new Phaser.Geom.Line(
		// 	e.x1 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio,
		// 	e.y1 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1,
		// 	e.x2 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio,
		// 	e.y2 * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1
		// );
		// lineGraphics.strokeLineShape(line);


	}
}