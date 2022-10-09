import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';
import ClientConstants from "../client-constants.js"

//this scene is just to register call backs for phaser's loader
export default class MainUiScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');

		this.phaserEventMapping = [];
		this.windowsEventMapping = [];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		this.gc = data.gc;

		///////////////////////////
		// Sniper charge bar variables
		this.chargeBarGraphic = null;
		this.chargeBarStrokeThickness = 2;	//thickness of border around charge meter, in pixels
		this.chargeBarHeight = 14;			//inner height of charge bar, in pixels
		this.chargeBarWidth = 200;			//inner width of charge bar, in pixels
		this.chargeBarFill = 0.0;			//how much to draw the filled part of the bar, in percentage
		this.chargeBarScreenX = 300;
		this.chargeBarScreenY = 100;

		this.innerChargeBarOffsetX = 0;	//calculated offset x of left of the inner bar offset from the cursor position, in pixels
		this.innerChargeBarOffsetY = 0;		//calcualted offset y of top of the inner bar from the cursor position, in pixels
		this.outerChargeBarOffsetX = this.innerChargeBarOffsetX - this.chargeBarStrokeThickness;
		this.outerChargeBarOffsetY = this.innerChargeBarOffsetY - this.chargeBarStrokeThickness;
		this.outerChargeBarWidth = this.chargeBarWidth + 2*this.chargeBarStrokeThickness;
		this.outerChargeBarHeight = this.chargeBarHeight + 2*this.chargeBarStrokeThickness;

		this.chargeBarOuterColor = 0xffffff;
		this.chargeBarInnerColor = 0x000000;
		this.chargeBarMeterColor = 0xdd0000;
		this.chargeBarFlashingColor = 0xffffff;
		this.chargeBarFlashingFreq = 10;
		this.chargeBarFlashTimeAcc = 0.00;
		this.bChargeBarFlashShow = false;

		this.chargeBarText = null;
		this.chargeBarTextScreenX = this.chargeBarScreenX;
		this.chargeBarTextScreenY = this.chargeBarScreenY + 36;

		//
		///////////////////////////

		this.currentTick = 0;
		this.previousTick = 0;
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
	}

	stockheimerActivate(dt) {
		console.log('stockheimerActivate on ' + this.scene.key + ' start');

		//charge meter for sniper
		this.createSniperChargeBarGraphic();
		this.createSniperChargeBarText();
		
	}


	update(timeElapsed, fakeDt) {		
		this.currentTick = performance.now();
		var dt = this.currentTick - this.previousTick;

		this.updateSniperChargeBarGraphic(dt);
		this.drawSniperChargeBarGraphic(dt);
		this.drawSniperChargeBarText(dt);

		this.previousTick = this.currentTick;
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		this.destroySniperChargeBarGraphic();
		this.destroySniperChargeBarText();
	}


	createSniperChargeBarGraphic() {
		if(this.chargeBarGraphic === null) {
			this.chargeBarGraphics = this.add.graphics();
			this.chargeBarGraphics.setDepth(ClientConstants.PhaserDrawLayers.UILayer);

			//draw white box for the 'border' first
			this.chargeBarGraphics.fillStyle(this.chargeBarOuterColor);
			this.chargeBarGraphics.fillRect(this.outerChargeBarOffsetX, this.outerChargeBarOffsetY, this.outerChargeBarWidth, this.outerChargeBarHeight);

			//draw black box for the 'inner' bar
			this.chargeBarGraphics.fillStyle(this.chargeBarInnerColor);
			this.chargeBarGraphics.fillRect(this.innerChargeBarOffsetX, this.innerChargeBarOffsetY, this.chargeBarWidth, this.chargeBarHeight);
			
			this.chargeBarGraphics.visible = false;
		}
	}

	createSniperChargeBarText() {
		if(this.chargeBarText === null) {
			var textStyle = {
				color: "#ffffff", 
				fontSize: "36px",
				strokeThickness: 4,
				stroke: "#000000"
			}

			this.chargeBarText = this.add.text(this.chargeBarTextScreenX, this.cameras.main.height - this.chargeBarTextScreenY, "Charge", textStyle);
			this.chargeBarText.setDepth(ClientConstants.PhaserDrawLayers.UILayer);
			this.chargeBarText.visible = false;
		}
	}

	showSniperChargeBar(bShow) {
		if(this.chargeBarGraphics !== null) {
			this.chargeBarGraphics.visible = bShow;
		}
		
		if(this.chargeBarText !== null) {
			this.chargeBarText.visible = bShow;
		}
	}

	setSniperMeterColor(colorHex) {
		this.chargeBarMeterColor = colorHex;
	}

	setSniperChargeBarFill(fillPerc) {
		this.chargeBarFill = fillPerc;
	}


	updateSniperChargeBarGraphic(dt) {
		//the meter is charging up
		if(this.chargeBarFill < 1.0) {
			//draw black box for the 'inner' bar
			this.chargeBarGraphics.fillStyle(this.chargeBarInnerColor);
			this.chargeBarGraphics.fillRect(this.innerChargeBarOffsetX, this.innerChargeBarOffsetY, this.chargeBarWidth, this.chargeBarHeight);

			//now draw the meter
			this.chargeBarGraphics.fillStyle(this.chargeBarMeterColor);
			this.chargeBarGraphics.fillRect(this.innerChargeBarOffsetX, this.innerChargeBarOffsetY, this.chargeBarWidth * this.chargeBarFill, this.chargeBarHeight);
		}
		//the meter is at 100%, show it flashing
		else {
			//add to the timer
			this.chargeBarFlashTimeAcc += dt;
			if(this.chargeBarFlashTimeAcc >= this.chargeBarFlashingFreq) {
				this.chargeBarFlashTimeAcc = 0;
				this.bChargeBarFlashShow = !this.bChargeBarFlashShow;
			}
			
			//show the flashing color this frame
			if(this.bChargeBarFlashShow) {
				this.chargeBarGraphics.fillStyle(this.chargeBarFlashingColor);
				this.chargeBarGraphics.fillRect(this.innerChargeBarOffsetX, this.innerChargeBarOffsetY, this.chargeBarWidth, this.chargeBarHeight);
			}
			//show the meter color this frame
			else {
				this.chargeBarGraphics.fillStyle(this.chargeBarMeterColor);
				this.chargeBarGraphics.fillRect(this.innerChargeBarOffsetX, this.innerChargeBarOffsetY, this.chargeBarWidth, this.chargeBarHeight);
			}
		}
	}

	drawSniperChargeBarGraphic() {
		this.chargeBarGraphics.setX(this.chargeBarScreenX);
		this.chargeBarGraphics.setY(this.cameras.main.height - this.chargeBarScreenY);
	}

	drawSniperChargeBarText() {
		this.chargeBarText.setX(this.chargeBarTextScreenX);
		this.chargeBarText.setY(this.cameras.main.height - this.chargeBarTextScreenY);
	}
	
	destroySniperChargeBarGraphic() {
		if(this.chargeBarGraphic !== null) {
			this.chargeBarGraphic.destroy();
			this.chargeBarGraphic = null;
		}
	}

	destroySniperChargeBarText() {
		if(this.chargeBarText !== null) {
			this.chargeBarText.destroy();
			this.chargeBarText = null;
		}
	}
}
