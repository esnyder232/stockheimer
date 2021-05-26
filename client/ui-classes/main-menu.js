import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class MainMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;

		this.windowsEventMapping = [];
		this.activated = false;
	}

	init(gc) {
		this.reset();
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'toggle-main-menu',  func: this.toggleMenu.bind(this)},
			{event: 'close-main-menu', func: this.closeMenu.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#main-menu");
		this.exitServerButton = $("#main-menu-exit-server-button");

		//reset to initial state
		this.menu.addClass("hide");
		this.isVisible = false;
		this.activated = true;
	}

	toggleMenu() {
		if(this.isVisible) {
			this.closeMenu();
		}
		else {
			this.openMenu();
			window.dispatchEvent(new CustomEvent("main-menu-opened"));
		}
	}

	enableExitServerButton() {
		this.exitServerButton.prop("disabled", false)
	}

	disableExitServerButton() {
		this.exitServerButton.prop("disabled", true)
	}

	openMenu() {
		if(this.gc.mainScene !== null)
		{
			this.gc.mainScene.closeMenuGroup();
		}
		this.menu.removeClass("hide");
		this.isVisible = true;
	}

	closeMenu() {
		if(this.activated) {
			this.menu.addClass("hide");
			window.dispatchEvent(new CustomEvent("main-menu-closed"));
			this.isVisible = false;
		}
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
		this.activated = false;
	}

	deinit() {
		this.reset();
	}
}