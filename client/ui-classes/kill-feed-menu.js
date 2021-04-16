import $ from "jquery"
import GlobalFuncs from "../global-funcs.js"

export default class KillFeedMenu {
	constructor() {
		this.reset();
	}

	reset() {
		this.gc = null;
		this.globalfuncs = null;
		this.isVisible = true;

		this.menu = null;
		this.killFeedHistory = null;
		this.killFeedItemTemplate = null;

		this.killFeedDestroyTimeoutMs = 15000;
	}

	init(gc) {
		this.reset();
		this.gc = gc;

		this.globalfuncs = new GlobalFuncs();
	}

	activate() {
		//register window event mapping
		this.windowsEventMapping = [];

		//grab all the ui elements
		this.menu = $("#kill-feed-menu");
		this.killFeedHistory = $("#kill-feed-history");
		this.killFeedItemTemplate = $("#kill-feed-item-template");

		//reset to initial state
		this.isVisible = true;
	}

	deactivate() {
		this.globalfuncs.unregisterWindowEvents(this.windowsEventMapping);
	}

	deinit() {
		this.reset();
	}

	
	killFeedMsgEvent(e) {
		var newKillFeed = this.killFeedItemTemplate.clone();
		var newKillFeedInner = newKillFeed.find("span[name='kill-feed-item-inner-wrapper']");
		var newKillFeedKiller = newKillFeed.find("span[name='kill-feed-killer']");
		var newKillFeedAction = newKillFeed.find("span[name='kill-feed-action']");
		var newKillFeedVictim = newKillFeed.find("span[name='kill-feed-victim']");

		// <div class="kill-feed-item hide" id="kill-feed-item-template">
		// <div class="kill-feed-item-inner-wrapper" name="kill-feed-item-inner-wrapper">
		// 	<span class="kill-feed-killer" name="kill-feed-killer"></span>
		// 	<span class="kill-feed-action" name="kill-feed-action">killed</span>
		// 	<span class="kill-feed-victim" name="kill-feed-victim"></span>
		// </div>

		newKillFeed.removeClass("hide");
		newKillFeed.removeAttr("id");
		newKillFeedKiller.text(e.killerName);
		newKillFeedAction.text("killed");
		newKillFeedVictim.text(e.victimName);

		window.setTimeout(() => {
			newKillFeed.addClass("fade-out");
		}, 100);

		//meh...might as well use a timeout
		window.setTimeout(() => {
			newKillFeed.remove();
		}, this.killFeedDestroyTimeoutMs)

		this.killFeedHistory.append(newKillFeed);
	}
}