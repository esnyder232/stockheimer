import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class ModalMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = false;

		this.menu = null;
		this.menuTitle = null;
		this.menuInfo = null;

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
			{event: 'close-modal-menu', func: this.closeMenu.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#modal-menu");
		this.menuTitle = $("#modal-title");
		this.menuInfo = $("#modal-info");

		//reset to initial state
		this.menu.addClass("hide");
		this.isVisible = false;
	}

	openMenu(messageType, message) {
		this.menu.removeClass("hide");
		this.isVisible = true;

		switch(messageType)
		{
			case "error":
				this.menuTitle.text("Error");
				break;
			
			case "info":
				this.menuTitle.text("Information");
				break;

			case "":
				this.menuTitle.text("");
				break;
		}

		this.menuInfo.text(message)
	}

	closeMenu() {
		this.menu.addClass("hide");
		this.isVisible = false;
	}
	
	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}
}