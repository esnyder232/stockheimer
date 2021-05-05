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
		
		this.globalfuncs = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.isDirty = false;

		this.boxGraphics = null;
	}

	projectileInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
	}

	activated() {
		this.boxGraphics = this.ms.add.graphics();
		
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

		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
	}

	deactivated() {
		this.boxGraphics.destroy();
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
	}
}
