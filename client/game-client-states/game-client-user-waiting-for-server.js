import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import GameClientUserJoiningGame from './game-client-user-joining-game.js';

export default class GameClientUserWaitingForServer extends GameClientBaseState {
	constructor(gc) {
		super(gc);
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Waiting for server response...");
		this.gc.userConnectingScene.updateConnectingMessage("Waiting for server response...");
		this.gc.mainMenu.enableExitServerButton();

		this.gc.ep.setAllEventEnable(false);
		this.gc.ep.setEventEnable("serverMapLoaded", true);
		this.gc.ep.setEventEnable("leaveGameImmediately", true);
	}

	update(dt) {
		super.update(dt);
		
		//send pakcets to keep the stream alive
		this.gc.wsh.processServerPackets();
		this.gc.ep.processServerEvents();
		this.gc.ep.insertEventsIntoPacket();
		this.gc.wsh.createPacketForUser();
		this.gc.wsh.sendPacketForUser();
		this.gc.wsh.update(dt);

		if(this.gc.bServerMapLoaded) {
			this.gc.nextGameState = new GameClientUserJoiningGame(this.gc);
		}
		
		if(this.gc.bDisconnect || !this.gc.wsConnected) {
			this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
		}
	}

	exit(dt) {
		super.exit(dt);
	}

	serverMapLoaded() {
		this.gc.bServerMapLoaded = true;
	}
}