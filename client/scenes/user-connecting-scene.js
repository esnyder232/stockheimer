import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';

export default class UserConnectingScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();

		this.connectingErrorList = null;
		this.connectingErrorItemTemplate = null;
		this.connectingMessage = null;
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');

		this.phaserEventMapping = [
			{event: 'shutdown', func: this.shutdown.bind(this), target: this.sys.events},
			{event: 'sleep', func: this.sleep.bind(this), target: this.sys.events},
			{event: 'wake', func: this.wake.bind(this), target: this.sys.events},
		];
		this.windowsEventMapping = [
			{event: 'resource-load-error', func: this.resourceLoadError.bind(this)}
		];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		this.connectingErrorList = $("#connecting-error-list");
		this.connectingErrorItemTemplate = $("#connecting-error-item-template");
		this.connectingMessage = $("#connecting-message");

		this.connectingErrorList.empty();

		this.gc = data.gc;
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');
		$("#user-connecting-scene-root").removeClass("hide");
	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
		
		this.connectingErrorList = null;
		this.connectingErrorItemTemplate = null;

		$("#user-connecting-scene-root").addClass("hide");
	}

	sleep() {
		console.log('sleep on ' + this.scene.key);
		$("#user-connecting-scene-root").addClass("hide");
	}

	wake() {
		console.log('wake on ' + this.scene.key);
		$("#user-connecting-scene-root").removeClass("hide");
	}


	resourceLoadError(e) {
		//if the event is an error, put the error somewhere on the screen here
		var newItem = this.connectingErrorItemTemplate.clone();
		newItem.removeClass("hide");
		newItem.removeAttr("id");

		newItem.text(e.detail.message);

		this.connectingErrorList.append(newItem);
	}

	updateConnectingMessage(msg) {
		this.connectingMessage.text(msg);
	}
	
	update(timeElapsed, dt) {
		
	}
}

