import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConstants from "../client-constants.js"

export default class Castle {
	constructor() {
		this.gc = null;
		this.id = null;
		this.serverId = null;
		this.serverOwnerId = null;
		this.type = "character";
		this.ownerId = null;
		this.ownerType = "";
		this.x = 0;
		this.y = 0;
		
		this.globalfuncs = null;

		this.stateName = "";
		this.state = null;
		this.nextState = null;

		this.hpMax = 100;
		this.hpCur = 100;
		this.isDirty = false;

		this.textGraphics = null;
		this.hpTextGraphics = null;
	}

	castleInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
	}

	activated() {
		var usernameText = this.name;

		var textStyle = {
			color: this.ms.castleTextColor, 
			fontSize: "18px",
			strokeThickness: this.ms.castleStrokeThickness,
			stroke: this.ms.castleStrokeColor
		}

		this.textGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-18, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, textStyle);
		this.hpTextGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-18, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 34 , this.hpCur + "/" + this.hpMax, textStyle);

		this.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.hpTextGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);

		this.castleImage = this.ms.add.image((32 * this.ms.planckUnitsToPhaserUnitsRatio), (-32 * this.ms.planckUnitsToPhaserUnitsRatio * -1), "data/sprites/castle.json");
		this.castleImage.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.castleImage.setScale(2, 2);
	}

	deactivated() {
		this.textGraphics.destroy();
		this.hpTextGraphics.destroy();
		this.castleImage.destroy();
	}

	deinit() {
		this.gc = null;
		this.ownerId = null;
		this.ownerType = null;
	}

	//update called by state
	update(dt) {
		//change state
		// if(this.nextState)
		// {
		// 	this.state.exit();
		// 	this.nextState.enter();

		// 	this.state = this.nextState;
		// 	this.nextState = null;
		// }
	}

	postPhysicsUpdate(dt) {
		
	}

	
	//update called by mainScene
	sceneUpdate(dt) {

	}

	castleUpdate(e) {
		this.castleHpMax = e.castleHpMax;
		this.castleHpCur = e.castleHpCur;

		this.hpTextGraphics.setText(this.castleHpCur + "/" + this.castleHpMax);
	}
}
