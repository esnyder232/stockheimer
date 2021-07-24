import ClientConstants from "../client-constants"

export default class DebugServerCircleEvent {
	constructor() {
		this.gc = null;
	}

	init(gc) {
		this.gc = gc;
	}

	processEvent(e) {
		// console.log('DebugServerCircleEvent called!!!!!');
		// console.log(e);

		//see if there exists an server circle already
		var o = this.gc.mainScene.debugServerCircles.find((x) => {return x.gameObjectId === e.gameObjectId;});
		if(o === undefined) {
			//create an object 
			o = {
				gameObjectId: e.gameObjectId,
				x: e.x,
				y: e.y,
				r: e.r,
				boxGraphics: null
			}

			//create a circle for phaser to draw
			var boxGraphics = this.gc.mainScene.add.graphics();
			boxGraphics.setX(e.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio);
			boxGraphics.setY(e.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1);
			boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.serverHitboxLayer);

			var circleShape = new Phaser.Geom.Circle(0, 0, this.gc.mainScene.planckUnitsToPhaserUnitsRatio * e.r);
			boxGraphics.lineStyle(1, 0xff00ff);
			boxGraphics.strokeCircleShape(circleShape);
			
			o.boxGraphics = boxGraphics;
			this.gc.mainScene.debugServerCircles.push(o);
		}
		else {
			o.x = e.x * this.gc.mainScene.planckUnitsToPhaserUnitsRatio;
			o.y = e.y * this.gc.mainScene.planckUnitsToPhaserUnitsRatio * -1;
		}
		
		//redraw the circle at its location
		o.boxGraphics.setX(o.x);
		o.boxGraphics.setY(o.y);
	}
}