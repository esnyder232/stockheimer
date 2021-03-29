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
			{event: 'chat-menu-opened', func: this.chatMenuOpened.bind(this)},
			{event: 'chat-menu-closed', func: this.chatMenuClosed.bind(this)},
			{event: 'user-list-menu-opened', func: this.userListMenuOpened.bind(this)},
			{event: 'user-list-menu-closed', func: this.userListMenuClosed.bind(this)},
			{event: 'debug-menu-opened', func: this.debugMenuOpened.bind(this)},
			{event: 'debug-menu-closed', func: this.debugMenuClosed.bind(this)},
		];

		this.globalfuncs.registerWindowEvents(this.windowsEventMapping);

		//grab all the ui elements
		this.mainMenuIcon = $("#quick-menu-main-menu");
		this.teamMenuIcon = $("#quick-menu-team");
		this.chatIcon = $("#quick-menu-chat");
		this.userListIcon = $("#quick-menu-user-list");
		this.debugIcon = $("#quick-menu-debug");

		//reset to initial state
		this.mainMenuClosed();
		this.teamMenuClosed();
		this.chatMenuClosed();
		this.debugMenuClosed();
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




	chatMenuOpened() {
		this.chatIcon.addClass("quick-menu-icon-visible");
	}

	chatMenuClosed() {
		this.chatIcon.removeClass("quick-menu-icon-visible");
	}



	userListMenuOpened() {
		this.userListIcon.addClass("quick-menu-icon-visible");
	}

	userListMenuClosed() {
		this.userListIcon.removeClass("quick-menu-icon-visible");
	}


	debugMenuOpened() {
		this.debugIcon.addClass("quick-menu-icon-visible");
	}

	debugMenuClosed() {
		this.debugIcon.removeClass("quick-menu-icon-visible");
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