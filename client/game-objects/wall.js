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

		this.x = 0;
		this.y = 0;
		this.size = 1;

		this.impassable = true; //default is impassable
		this.collideProjectiles = true; //default is blocking projectiles
		this.collideProjectilesAllDirections = true;

		this.windowsEventMapping = [];

		this.plBody = null;
		this.bShowPlanckSprite = false;
		this.planckSpriteGraphics = null;
	}

	wallInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
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

		//register window event mapping
		this.windowsEventMapping = [
			{event: 'toggle-display-client-collisions',  func: this.toggleDisplayClientCollisions.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

	}

	//this creats the wall in phaser (normally not shown. Just for debugging)
	createWallGraphic() {
		if(this.planckSpriteGraphics === null) {
			this.planckSpriteGraphics = this.ms.add.graphics();
			this.planckSpriteGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
			this.planckSpriteGraphics.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);
			this.planckSpriteGraphics.setDepth(ClientConstants.PhaserDrawLayers.serverHitboxLayer);
	
			var ph = this.ms.planckUnitsToPhaserUnitsRatio * this.size;
			var pw = this.ms.planckUnitsToPhaserUnitsRatio * this.size;
			var px = 0 - pw/2;
			var py = 0 - ph/2;
			var rectShape = new Phaser.Geom.Rectangle(px, py, pw, ph);
			this.planckSpriteGraphics.lineStyle(1, 0xff00ff);
			this.planckSpriteGraphics.strokeRectShape(rectShape);

			this.planckSpriteGraphics.visible = this.bShowPlanckSprite;
		}
	}

	deinit() {
		if(this.plBody !== null) {
			this.gc.world.destroyBody(this.plBody);
			this.plBody = null;
		}

		if(this.planckSpriteGraphics !== null) {
			this.planckSpriteGraphics.destroy();
			this.planckSpriteGraphics = null;
		}

		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);

		this.gc = null;
	}

	toggleDisplayClientCollisions(e) {
		this.bShowPlanckSprite = e.detail.bDisplayClientCollisions;
		if(this.planckSpriteGraphics !== null) {
			this.planckSpriteGraphics.visible = this.bShowPlanckSprite;
		}
	}
}
