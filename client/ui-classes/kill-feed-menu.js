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

		this.killFeedDefaultTimer = 5000;
		this.killFeedUserInvolvedTimer = 10000;
		this.killFeedQueueLimit = 10;

		this.killFeedQueue = [];
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

		for(var i = this.killFeedQueue.length-1; i >= 0; i--) {
			this.destroyKillFeedItem(i);
		}
	}

	deinit() {
		this.reset();
	}

	update(dt) {
		var indexesToSplice = [];
		for(var i = 0; i < this.killFeedQueue.length; i++) {
			this.killFeedQueue[i].timeAcc += dt;

			if(this.killFeedQueue[i].timeAcc >= this.killFeedQueue[i].timeLimit) {
				indexesToSplice.push(i);
			}
		}

		//splice off killfeed messages if any
		for(var i = indexesToSplice.length-1; i >= 0; i--) {
			this.destroyKillFeedItem(indexesToSplice[i]);
		}
	}

	
	killFeedMsgEvent(e) {
		//console.log(e);
		var isYourUserInvolved = false;

		//FIRST, check if the user is involved in any of this
		if(e.killerType === this.gc.gameConstants.OwnerTypes["user"] && e.killerId === this.gc.myUser.serverId) {
			isYourUserInvolved = true;
		}
		else if(e.victimType === this.gc.gameConstants.OwnerTypes["user"] && e.victimId === this.gc.myUser.serverId) {
			isYourUserInvolved = true;
		}

		//SECOND, "queue is full" rules
		var indexToSplice = -1;

		//if user is NOT involved, and the queue IS full
		if (!isYourUserInvolved && this.killFeedQueue.length >= this.killFeedQueueLimit) {
			//find the oldest item with the user NOT involved
			indexToSplice = this.killFeedQueue.findIndex((x) => {return x.isYourUserInvolved === false;});
		}
		//if user IS involved, and the queue IS full
		else if (isYourUserInvolved && this.killFeedQueue.length >= this.killFeedQueueLimit) {
			//first find the oldest item with the user NOT involved
			indexToSplice = this.killFeedQueue.findIndex((x) => {return x.isYourUserInvolved === false;});

			//if an old item is not found where the user is NOT involved, find the oldest item where the user IS involved and splice that off instead
			if(indexToSplice < 0) {
				indexToSplice = this.killFeedQueue.findIndex((x) => {return x.isYourUserInvolved === true;});
			}
		}


		//THIRD, splice off the oldest information if needed
		if(indexToSplice >= 0) {
			this.destroyKillFeedItem(indexToSplice);
		}
		

		//FOURTH, if the queue is no longer full, append the html element and push on the new killfeed message
		if(this.killFeedQueue.length < this.killFeedQueueLimit) {
			var timeLimit = this.killFeedDefaultTimer;
			if(isYourUserInvolved) {
				timeLimit = this.killFeedUserInvolvedTimer;
			}
	
			//create html element
			var newKillFeed = this.killFeedItemTemplate.clone();
			var newKillFeedInner = newKillFeed.find("div[name='kill-feed-item-inner-wrapper']");
			var newKillFeedKiller = newKillFeed.find("span[name='kill-feed-killer']");
			var newKillFeedAction = newKillFeed.find("span[name='kill-feed-action']");
			var newKillFeedVictim = newKillFeed.find("span[name='kill-feed-victim']");
	
			newKillFeed.removeClass("hide");
			newKillFeed.removeAttr("id");
			newKillFeedKiller.text(e.killerName);
			newKillFeedAction.text("killed");
			newKillFeedVictim.text(e.victimName);

			//apply team colors
			var killerColor = this.getTeamKillFeedColor(e.killerTeam, e.killerType);
			var victimColor = this.getTeamKillFeedColor(e.victimTeam, e.victimType);

			newKillFeedKiller.css("color", killerColor);
			newKillFeedVictim.css("color", victimColor);
	
			//highlight the item if the user is involved
			if(isYourUserInvolved) {
				newKillFeedInner.addClass("kill-feed-highlight");
			}
	
			this.killFeedHistory.append(newKillFeed);
	
			var item = {
				killFeedItem: newKillFeed,
				isYourUserInvolved: isYourUserInvolved,
				timeAcc: 0,
				timeLimit: timeLimit
			}

			this.killFeedQueue.push(item);
		}
	}

	getTeamKillFeedColor(teamId, ownertype) {
		var color = "#ffffff";

		if(ownertype === this.gc.gameConstants.OwnerTypes["ai"]) {
			color = "#ffffff";
		}
		else {
			var team = this.gc.tm.getTeamByServerID(teamId);
			if(team !== null) {
				color = team.killFeedTextColor;
			}
		}

		return color;
	}

	destroyKillFeedItem(killFeedQueueIndex) {
		if(killFeedQueueIndex < 0 && killFeedQueueIndex >= this.killFeedQueue.length) {
			return;
		}
		
		var item = this.killFeedQueue[killFeedQueueIndex];

		item.killFeedItem.remove();
		this.killFeedQueue.splice(killFeedQueueIndex, 1);
	}
}