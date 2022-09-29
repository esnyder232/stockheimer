import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConstants from "../client-constants.js"
import ServerEventQueue from "../classes/server-event-queue.js"

export default class Wall {
	constructor() {
		this.gc = null;
		this.id = null;
		this.serverId = null;
		this.type = "wall";
		this.isStatic = true;

		this.plBody = null;

		this.x = 0;
		this.y = 0;
		this.size = 1;

		this.impassable = true; //default is impassable
		this.collideProjectiles = true; //default is blocking projectiles
		this.collideProjectilesAllDirections = true;
		
		this.bShow = false;
		this.spriteGraphics = null;
	}

	wallInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
	}

	//actually creates the wall in client side planck
	createWall() {
		const Vec2 = this.gc.pl.Vec2;
		var wallShape = this.gc.pl.Box(this.size/2, this.size/2, Vec2(0,0));

		this.plBody = this.gc.world.createBody({
			position: Vec2(this.x, this.y),
			type: this.gc.pl.Body.STATIC,
			userData: {
				type:"wall", 
				id: this.id,
				collideProjectiles: this.collideProjectiles
			}
		});

		this.plBody.createFixture({
			shape: wallShape,
			density: 0.0,
			friction: 0.0
		});

		//STOPPED HERE
		//...make the graphic show up on the scene next? idk

	}

	//this creats the wall in phaser (normally not shown. Just for debugging)
	createWallGraphic() {
		if(this.spriteGraphics === null) {
			this.spriteGraphics = this.ms.add.graphics();
			this.spriteGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
			this.spriteGraphics.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);
			this.spriteGraphics.setDepth(ClientConstants.PhaserDrawLayers.serverHitboxLayer);
	
			var ph = this.ms.planckUnitsToPhaserUnitsRatio * this.size;
			var pw = this.ms.planckUnitsToPhaserUnitsRatio * this.size;
			var px = 0 - pw/2;
			var py = 0 - ph/2;
			var rectShape = new Phaser.Geom.Rectangle(px, py, pw, ph);
			this.spriteGraphics.lineStyle(1, 0xff00ff);
			this.spriteGraphics.strokeRectShape(rectShape);

			this.spriteGraphics.visible = this.bShow;
		}
	}

	deinit() {
		if(this.plBody !== null) {
			this.gc.world.destroyBody(this.plBody);
			this.plBody = null;
		}

		if(this.spriteGraphics !== null) {
			this.spriteGraphics.destroy();
			this.spriteGraphics = null;
		}

		this.gc = null;
	}

	showCollisions(bShow) {
		this.bShow = bShow;
		this.spriteGraphics.visible = this.bShow;
	}
}
