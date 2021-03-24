import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';

export default class GameClientUserPlaying extends GameClientBaseState {
	constructor(gc) {
		super(gc);
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Now playing.");

		//tell the server you are ready to play
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientReadyToPlay"
		});

		this.gc.mainScene.scene.wake();
		this.gc.mainScene.stockheimerActivate();
	}

	update(dt) {
		super.update(dt);

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
	}

	exit(dt) {
		super.exit(dt);
	}


	websocketErrored() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}

	websocketClosed() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}

	exitGameClick() {
		this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
	}
}