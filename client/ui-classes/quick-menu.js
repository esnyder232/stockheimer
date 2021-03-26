import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class QuickMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.mainMenuIcon = null;
		this.teamMenuIcon = null;
		this.windowsEventMapping = [];
	}

	init(gc) {
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'main-menu-opened', func: this.mainMenuOpened.bind(this)},
			{event: 'main-menu-closed', func: this.mainMenuClosed.bind(this)},
			{event: 'team-menu-opened', func: this.teamMenuOpened.bind(this)},
			{event: 'team-menu-closed', func: this.teamMenuClosed.bind(this)},
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.mainMenuIcon = $("#quick-menu-main-menu");
		this.teamMenuIcon = $("#quick-menu-team");
	}



	mainMenuOpened() {
		this.removeMenuGroupHighlight();
		this.mainMenuIcon.addClass("quick-menu-icon-visible");
	}

	mainMenuClosed() {
		this.removeMenuGroupHighlight();
	}




	teamMenuOpened() {
		this.removeMenuGroupHighlight();
		this.teamMenuIcon.addClass("quick-menu-icon-visible");
	}

	teamMenuClosed() {
		this.removeMenuGroupHighlight();
	}




	removeMenuGroupHighlight() {
		this.mainMenuIcon.removeClass("quick-menu-icon-visible");
		this.teamMenuIcon.removeClass("quick-menu-icon-visible");
	}

	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}


}