import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConstants from "../client-constants.js"

export default class Projectile {
	constructor() {
		this.gc = null;
		this.id = null;
		this.serverId = null;
		this.serverOwnerId = null;
		this.type = "character";
		this.ownerId = null;
		this.ownerType = "";
		this.teamId = 0;
		this.x = 0;
		this.y = 0;
		this.size = 1;
		this.sizeScaleFactor = 0.05/0.1; //scales the image based on the size given from the server
		this.offsetFactor = -50; //offsets the image based on the velocity trajectory. Units are: pixels/velocity
		this.pngUnitsToPlanckUnitsRatio = 1/75;
		this.offsetX = 0;
		this.offsetY = 0;
		this.angle = 0;
		
		this.globalfuncs = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.isDirty = false;

		this.boxGraphics = null;
		this.fireballGraphics = null;

		this.projectileResourceId = null;
		this.projectileResource = null;

		this.boxGraphics = null;
		this.boxGraphicsStrokeColor = 0;
		this.boxGraphicsBorderThickness = 1;

		this.spriteGraphics = null;

		//resource variables
		this.plShape = "circle";
		this.plRadius = 1;
		this.originX = 0.5;
		this.originY = 0.5;
		this.scaleX = 1;
		this.scaleY = 1;
		this.size = 1;
		this.spriteKey = "";
		this.hideSprite = false;
	}

	projectileInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
	}

	activated() {
		//get resource data
		this.projectileResource = this.gc.rm.getResourceByServerId(this.projectileResourceId);

		this.plShape = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plShape, this.plShape);
		this.plRadius = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.planckData?.plRadius, this.plRadius);
		this.originX = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.phaserData?.originX, this.originX);
		this.originY = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.phaserData?.originY, this.originY);
		this.scaleX = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.phaserData?.scaleX, this.scaleX);
		this.scaleY = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.phaserData?.scaleY, this.scaleY);
		this.size = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.size, this.size);
		this.spriteKey = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.renderData?.spriteKey, this.spriteKey);
		this.hideSprite = this.globalfuncs.getValueDefault(this?.projectileResource?.data?.renderData?.hideSprite, this.hideSprite);

		//calculate stuff
		this.x = this.x * this.ms.planckUnitsToPhaserUnitsRatio;
		this.y = this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1

		//calculate the xSpeed and ySpeed components for phaser units
		this.xSpeedPhaser = (this.speed * this.ms.planckUnitsToPhaserUnitsRatio) * Math.cos(this.angle);
		this.ySpeedPhaser = (this.speed * this.ms.planckUnitsToPhaserUnitsRatio) * Math.sin(this.angle);

		//get colors sorted out
		this.calculateColors();

		//create the graphics objects
		this.createBoxGraphics();
		this.createSpriteGraphics();

		//draw the graphics objects on activation
		this.drawBoxGraphics();
		this.drawSpriteGraphics();
	}


	calculateColors() {
		var team = this.gc.tm.getTeamByServerID(this.teamId);
	
		if(team !== null) {
			this.boxGraphicsStrokeColor = team.phaserCharacterStrokeColor;
		}
	}


	createBoxGraphics() {
		this.boxGraphics = this.ms.add.graphics();
		this.boxGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.boxGraphics.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);
		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.hitboxLayer);
	}

	drawBoxGraphics() {
		// var circleShape = new Phaser.Geom.Circle(0, 0, this.ms.planckUnitsToPhaserUnitsRatio * this.plRadius * this.size);
		// this.boxGraphics.lineStyle(this.boxGraphicsBorderThickness, this.boxGraphicsStrokeColor);
		// this.boxGraphics.strokeCircleShape(circleShape);
	}

	createSpriteGraphics() {
		if(!this.hideSprite) {
			this.spriteGraphics = this.ms.add.sprite((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), this.spriteKey);
			this.spriteGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
			this.spriteGraphics.setOrigin(this.originX, this.originY);
			this.spriteGraphics.setScale(this.size * this.scaleX, this.size * this.scaleY);
			this.spriteGraphics.setAngle(this.angle * (180/Math.PI));
		}
	}

	drawSpriteGraphics() {
		
	}


	deactivated() {
		if(this.boxGraphics !== null) {
			this.boxGraphics.destroy();
			this.boxGraphics = null;
		}
		if(this.spriteGraphics !== null) {
			this.spriteGraphics.destroy();
			this.spriteGraphics = null;
		}

		////////////////////////////////////////
		//temp for debugging hitbox
		// var debugCircle = this.ms.debugServerCircles.find((x) => {return x.gameObjectId === this.serverId;});
		// if(debugCircle !== undefined) {
		// 	// console.log("===FOUND DEBUG CIRCLE===");
		// 	// console.log("serverId: " + this.serverId + ", x: " + this.x + ", serverX: " + debugCircle.x + ", diff: " + this.x - debugCircle.x);
		// 	var diff = this.x - debugCircle.x;
		// 	console.log("serverId: " + this.serverId);
		// 	console.log("x: " + this.x);
		// 	console.log("serverX: " + debugCircle.x);
		// 	console.log("diff: " + diff);
		// }
		
		////////////////////////////////////////
	}

	deinit() {
		this.gc = null;
		this.ownerId = null;
		this.ownerType = null;
		this.projectileResource = null;
	}

	update(dt) {
		this.x += this.xSpeedPhaser * (dt/1000);
		this.y += this.ySpeedPhaser * (dt/1000);

		// this.boxGraphics.setX(this.x);
		// this.boxGraphics.setY(this.y);
		
		if(this.spriteGraphics !== null) {
			this.spriteGraphics.setX(this.x);
			this.spriteGraphics.setY(this.y);
		}
	}
}
