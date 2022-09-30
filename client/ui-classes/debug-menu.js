import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class DebugMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;

		this.windowsEventMapping = [];
		this.cbDisplayServerSightlines = null;
		this.cbDisplayServerSightlinesContainer = null;
	}

	init(gc) {
		this.reset();

		this.gc = gc;
		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [
			{event: 'toggle-debug-menu',  func: this.toggleMenu.bind(this)},
			{event: 'close-debug-menu', func: this.closeMenu.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#debug-menu");
		
		//reset to initial state
		this.menu.addClass("hide");

		//create ai controls
		this.cbDisplayServerSightlines = $("#display-server-sightlines");
		this.cbDisplayServerSightlinesContainer = $("#display-server-sightlines-container");
		this.cbDisplayClientCollisions = $("#display-client-collisions");
		this.cbDisplayClientCollisionsContainer = $("#display-client-collisions-container");
	}

	populateDebugMenu() {
		this.cbDisplayServerSightlinesContainer.removeClass("hide");
		this.cbDisplayServerSightlines.on("click", this.cbDisplayServerSightlinesClick.bind(this));

		this.cbDisplayClientCollisionsContainer.removeClass("hide");
		this.cbDisplayClientCollisions.on("click", this.cbDisplayClientCollisionsClick.bind(this));
	}

	clearDebugMenu() {
		this.cbDisplayServerSightlinesContainer.addClass("hide");
		this.cbDisplayServerSightlines.off("click");

		this.cbDisplayClientCollisionsContainer.addClass("hide");
		this.cbDisplayClientCollisions.off("click");
	}


	cbDisplayServerSightlinesClick(e) {
		this.gc.bDisplayServerSightlines = this.cbDisplayServerSightlines[0].checked;
	}

	cbDisplayClientCollisionsClick(e) {
		this.gc.bDisplayClientCollisions = this.cbDisplayClientCollisions[0].checked;
		window.dispatchEvent(new CustomEvent("toggle-display-client-collisions", {detail: {bDisplayClientCollisions: this.gc.bDisplayClientCollisions}}));
	}

	toggleMenu() {
		if(this.isVisible) {
			this.closeMenu();
		}
		else {
			this.openMenu();
			window.dispatchEvent(new CustomEvent("debug-menu-opened"));
		}
	}

	openMenu() {
		this.menu.removeClass("hide");		
		this.isVisible = true;
	}

	closeMenu() {
		this.menu.addClass("hide");
		window.dispatchEvent(new CustomEvent("debug-menu-closed"));
		this.isVisible = false;
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}
}