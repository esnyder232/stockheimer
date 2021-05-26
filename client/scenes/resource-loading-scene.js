import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"
import config from '../client-config.json';

//this scene is just to register call backs for phaser's loader
export default class ResourceLoadingScene extends Phaser.Scene {
	constructor() {
		super(config);
		this.globalfuncs = new GlobalFuncs();
	}

	init(data) {
		console.log('init on ' + this.scene.key + ' start');

		this.phaserEventMapping = [
			{event: 'load', func: this.fileLoad.bind(this), target: this.load},
			{event: 'loaderror', func: this.fileLoadError.bind(this), target: this.load},
			{event: 'filecomplete', func: this.fileComplete.bind(this), target: this.load},
			{event: 'complete', func: this.actualComplete.bind(this), target: this.load}
		];
		this.windowsEventMapping = [];

		this.globalfuncs.registerPhaserEvents(this.phaserEventMapping);
		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		this.gc = data.gc;
	}

	preload() {
		console.log('preload on ' + this.scene.key + ' start');
	}
	  
	create() {
		console.log('create on ' + this.scene.key + ' start');

	}

	shutdown() {
		console.log('shutdown on ' + this.scene.key);
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.globalfuncs.unregisterPhaserEvents(this.phaserEventMapping);
	}

	fileLoad(file) {
		// console.log('!========================= fileLoad called! =================================');
		// console.log(file);
		// window.dispatchEvent(new CustomEvent("load", {detail: {file: file}}));
	}

	fileLoadError(file, a, b, c) {
		// console.log('!========================= fileLoadError called! =================================');
		// console.log(file);
		window.dispatchEvent(new CustomEvent("loaderror", {detail: {file: file}}));
	}

	fileComplete(key, type, data) {
		// console.log('!========================= fileComplete called! =================================');
		// console.log(key);
		// console.log(type);
		// console.log(data);
		
		window.dispatchEvent(new CustomEvent("filecomplete", {detail: {key: key, type: type, data: data}}));
	}

	actualComplete(load, totalComplete, totalFailed) {
		// console.log('!========================= actualComplete called! =================================');
		// console.log(load);
		// console.log(totalComplete);
		// console.log(totalFailed);

		window.dispatchEvent(new CustomEvent("complete", {detail: {load: load, totalComplete: totalComplete, totalFailed: totalFailed}}));
	}
}

