import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import ClientConstants from "../client-constants.js"

export default class Character {
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

		this.boxGraphics = null;
		this.textGraphics = null;
		this.hpTextGraphics = null;
		this.pvpGraphics = null;
	}

	characterInit(gameClient) {
		this.gc = gameClient;
		this.ms = this.gc.mainScene;
		this.globalfuncs = new GlobalFuncs();
	}

	activated() {

		////////////////////////////////////////////////////////////////////////////////
		//main scene stuff:
		var boxGraphicsColor = this.ms.userColor;
		var boxGraphicsFillColor = this.ms.userFillColor;

		if(this.ownerType === "ai")
		{
			boxGraphicsColor = this.ms.aiColor;
			boxGraphicsFillColor = this.ms.aiFillColor;
		}

		var circleShape = new Phaser.Geom.Circle(0, 0, this.ms.planckUnitsToPhaserUnitsRatio * 0.375);

		this.boxGraphics = this.ms.add.graphics({ 
			fillStyle: { color: boxGraphicsFillColor }, 
			lineStyle: {
				width: this.ms.characterBorderThickness,
				color: boxGraphicsColor}
		});
		this.boxGraphics.fillCircleShape(circleShape);
		this.boxGraphics.strokeCircleShape(circleShape);

		this.boxGraphics.setX(this.x * this.ms.planckUnitsToPhaserUnitsRatio);
		this.boxGraphics.setY(this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1);

		var usernameText = "???";
		var u = this.gc.um.getUserByServerID(this.ownerId);
		
		var textStyle = {
			color: this.ms.userTextColor,
			fontSize: "18px",
			strokeThickness: this.ms.userStrokeThickness,
			stroke: this.ms.userStrokeColor
		}

		var pvpTextStyle = {
			color: this.ms.userTextColor, 
			fontSize: "12px",
			strokeThickness: 4,
			stroke: this.ms.userStrokeColor
		}

		//add username text
		if(this.ownerType === "user")
		{
			if(u)
			{
				usernameText = u.username;
			}
		}
		else if(this.ownerType === "ai")
		{
			usernameText = "AI " + this.ownerId
			textStyle.color = this.ms.aiTextColor;
			textStyle.stroke = this.ms.aiStrokeColor;
			textStyle.strokeThickness = this.ms.aiStrokeThickness;
		}
		


		//add pvp emoji
		var pvpText = "";
		if(u && this.ownerType === "user")
		{
			pvpText = u.userPvp ? this.ms.pvpEmoji : "";
		}

		this.textGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-18, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, textStyle);
		this.hpTextGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-18, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 34 , this.hpCur + "/" + this.hpMax, textStyle);
		this.pvpGraphics = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-10, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) - 36 , pvpText, pvpTextStyle);

		this.boxGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.textGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.hpTextGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		this.pvpGraphics.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);

		//check if this is your character your controlling. If it is, then switch pointer modes
		if(this.gc.myCharacter !== null && this.id === this.gc.myCharacter.id)
		{
			this.ms.switchCameraMode(1);
			this.ms.switchPointerMode(1); //switch to phaser mode
			var createCharacterBtn = $("#create-character");
			var killCharacterBtn = $("#kill-character");

			if(createCharacterBtn.length > 0)
			{
				createCharacterBtn.addClass("hide");
			}
			if(killCharacterBtn.length > 0)
			{
				killCharacterBtn.removeClass("hide");
			}
		}
	}

	deactivated() {
		this.boxGraphics.destroy();
		this.textGraphics.destroy();
		this.hpTextGraphics.destroy();
		this.pvpGraphics.destroy();

		//put gravestone where the character was removed
		var gravestone = {
			gravestoneImage: null,
			gravestoneText: null,
			countdownTimer: 15000 //ms
		};

		gravestone.gravestoneImage = this.ms.add.image((this.x * this.ms.planckUnitsToPhaserUnitsRatio), (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1), "gravestone");
		gravestone.gravestoneImage.setDepth(ClientConstants.PhaserDrawLayers.spriteLayer);
		gravestone.gravestoneImage.setScale(2, 2);

		if(this.ownerType === "ai")
		{
			gravestone.countdownTimer = 5000;
		}
		else if(this.ownerType === "user")
		{
			var u = this.gc.um.getUserByServerID(this.ownerId);
			var usernameText = "???";

			if(u)
			{
				usernameText = u.username;	
			}
			var textStyle = {
				color: this.ms.gravestoneTextColor, 
				fontSize: "18px",
				strokeThickness: this.ms.gravestoneStrokeThickness,
				stroke: this.ms.gravestoneStrokeColor
			}

			gravestone.gravestoneText = this.ms.add.text((this.x * this.ms.planckUnitsToPhaserUnitsRatio)-16, (this.y * this.ms.planckUnitsToPhaserUnitsRatio * -1) + 18 , usernameText, textStyle);
		}

		this.ms.gravestones.push(gravestone);
	}

	deinit() {
		this.gc = null;
		this.ownerId = null;
		this.ownerType = null;
	}

	update(dt) {
		//change state
		if(this.nextState)
		{
			this.state.exit();
			this.nextState.enter();

			this.state = this.nextState;
			this.nextState = null;
		}
	}
}
