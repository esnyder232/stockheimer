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
		this.offsetX = 0;
		this.offsetY = 0;
		
		this.globalfuncs = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.isDirty = false;

		this.boxGraphics = null;
		this.fireballGraphics = null;
	}

	projectileInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
	}

	activated() {
		this.boxGraphics = this.ms.add.graphics();
		this.fireballGraphics = this.ms.add.image((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), "fireball");
		this.fireballGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.fireballGraphics.setScale(this.size * this.sizeScaleFactor, this.size * this.sizeScaleFactor);
		this.fireballGraphics.setAngle(this.angle * (180/Math.PI));

		this.offsetX = this.size * this.sizeScaleFactor * this.offsetFactor * Math.cos(this.angle);
		this.offsetY = this.size * this.sizeScaleFactor * this.offsetFactor * Math.sin(this.angle);
		
		console.log('ANGLE: ' + this.angle + ", spriteAngle: " + this.fireballGraphics.angle + ", size: " + this.size);
		
		var projectileColor = 0x000000;
		// this.boxGraphics.lineStyle(1, this.ms.projectileColor, 1);

		var team = this.gc.tm.getTeamByServerID(this.teamId);
		if(team !== null) {
			projectileColor = team.phaserProjectileStrokeColor;
		}
		
		this.boxGraphics.lineStyle(1, projectileColor, 1);
		this.boxGraphics.moveTo(-this.size * this.ms.planckUnitsToPhaserUnitsRatio, -this.size * this.ms.planckUnitsToPhaserUnitsRatio); //top left
		this.boxGraphics.lineTo(this.size * this.ms.planckUnitsToPhaserUnitsRatio, -this.size * this.ms.planckUnitsToPhaserUnitsRatio); //top right
		this.boxGraphics.lineTo(this.size * this.ms.planckUnitsToPhaserUnitsRatio, this.size * this.ms.planckUnitsToPhaserUnitsRatio); //bottom right
		this.boxGraphics.lineTo(-this.size * this.ms.planckUnitsToPhaserUnitsRatio, this.size * this.ms.planckUnitsToPhaserUnitsRatio); //bottom left
		this.boxGraphics.lineTo(-this.size * this.ms.planckUnitsToPhaserUnitsRatio, -this.size * this.ms.planckUnitsToPhaserUnitsRatio); //top left

		this.boxGraphics.closePath();
		this.boxGraphics.strokePath();

		//calculate the xSpeed and ySpeed components (in phaser units)
		this.xSpeedPhaser = (this.speed * this.ms.planckUnitsToPhaserUnitsRatio) * Math.cos(this.angle);
		this.ySpeedPhaser = (this.speed * this.ms.planckUnitsToPhaserUnitsRatio) * Math.sin(this.angle);

		this.x = this.x * this.ms.planckUnitsToPhaserUnitsRatio;
		this.y = this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1

		this.boxGraphics.setX(this.x);
		this.boxGraphics.setY(this.y);

		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.hitboxLayer);
	}

	deactivated() {
		this.boxGraphics.destroy();
		this.fireballGraphics.destroy();

		this.boxGraphics = null;
		this.fireballGraphics = null;
	}

	deinit() {
		this.gc = null;
		this.ownerId = null;
		this.ownerType = null;
	}

	update(dt) {

		this.x += this.xSpeedPhaser * (dt/1000);
		this.y += this.ySpeedPhaser * (dt/1000);

		this.boxGraphics.setX(this.x);
		this.boxGraphics.setY(this.y);

		this.fireballGraphics.setX(this.x + this.offsetX);
		this.fireballGraphics.setY(this.y + this.offsetY);
	}
}
