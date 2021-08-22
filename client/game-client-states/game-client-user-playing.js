import GameClientBaseState from './game-client-base-state.js';
import GameClientUserLeavingGame from './game-client-user-leaving-game.js';

export default class GameClientUserPlaying extends GameClientBaseState {
	constructor(gc) {
		super(gc);
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Now playing.");

		//sleep the connectin scene, and wkae up the main scene
		this.gc.userConnectingScene.scene.sleep();
		this.gc.mainScene.scene.wake();

		//tell the server you are ready to play
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientReadyToPlay"
		});

		
		this.gc.mainScene.stockheimerActivate();
		this.gc.quickMenu.showMainSceneIcons();

		this.gc.ep.setAllEventEnable(true);
	}

	update(dt) {
		super.update(dt);

		//update stuff
		this.gc.ep.processServerEvents();

		//put the packet algorithm here (insert from clientToServerEvents 1st, then fragmented events 2nd)
		this.gc.ep.insertEventsIntoPacket();

		//send the packet to the server
		this.gc.wsh.createPacketForUser();

		this.gc.wsh.update(dt);

		//update managers
		this.gc.gom.update(dt);
		this.gc.um.update(dt);
		this.gc.tm.update(dt);

		//if a disconnect was requested by the user or an error occured somehow in the websocket, disconnect
		if(this.gc.bDisconnect || !this.gc.wsConnected || !this.gc.bServerMapLoaded) {
			this.gc.nextGameState = new GameClientUserLeavingGame(this.gc);
		}
	}

	exit(dt) {
		super.exit(dt);
		this.gc.quickMenu.hideMainSceneIcon();
		
		//put main sleep to sleep to hide it, and wake up the connecting scene for feedback
		this.gc.mainScene.scene.sleep();
		this.gc.userConnectingScene.scene.wake();
	}

	leaveGameImmediately(e) {
		this.gc.bServerMapLoaded = false;
	}
}