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

		//reset to initial state
		this.menu.addClass("hide");
		this.isVisible = false;
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

	openMenu() {
		if(this.gc.mainScene !== null)
		{
			this.gc.mainScene.closeMenuGroup();
		}
		this.menu.removeClass("hide");
		this.isVisible = true;
	}

	closeMenu() {
		this.menu.addClass("hide");
		window.dispatchEvent(new CustomEvent("main-menu-closed"));
		this.isVisible = false;
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}
}