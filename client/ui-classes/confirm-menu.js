import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class ConfirmMenu {
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
		this.cbAnswer = null;

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
			{event: 'confirm-menu-yes', func: this.confirmMenuYes.bind(this)},
			{event: 'confirm-menu-no', func: this.confirmMenuNo.bind(this)}
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.menu = $("#confirm-menu");
		this.menuTitle = $("#confirm-title");
		this.menuInfo = $("#confirm-info");
		this.menuConfirmButton = $("#confirm-button");
		this.menuCancelButton = $("#cancel-button");

		//reset to initial state
		this.menu.addClass("hide");
		this.isVisible = false;
	}

	openMenu(message, cbAnswer, title, confirmText, cancelText) {
		var finalMessage = "Are you sure?";
		var finalTitle = "Confirm";
		var finalConfirmText = "Ok";
		var finalCancelText = "Cancel";

		if(message)	{
			finalMessage = message;
		}

		if(title)	{
			finalTitle = title;
		}

		if(confirmText)	{
			finalConfirmText = confirmText;
		}

		if(cancelText)	{
			finalCancelText = cancelText;
		}

		this.menu.removeClass("hide");
		this.isVisible = true;

		this.menuTitle.text(finalTitle);
		this.menuInfo.text(title);
		this.menuConfirmButton.prop("value", confirmText);
		this.menuCancelButton.prop("value", cancelText);

		this.menuInfo.text(message);

		this.cbAnswer = cbAnswer;
	}



	confirmMenuYes() {
		if(typeof this.cbAnswer === "function")
		{
			this.cbAnswer(true);
		}

		this.cbAnswer = null;
		this.closeMenu();
	}

	confirmMenuNo() {
		if(typeof this.cbAnswer === "function")
		{
			this.cbAnswer(false);
		}

		this.cbAnswer = null;
		this.closeMenu();
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