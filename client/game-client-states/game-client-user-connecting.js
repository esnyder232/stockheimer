import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import GameClientUserPlaying from './game-client-user-playing.js';
import UserConnectingScene from "../scenes/user-connecting-scene.js"

export default class GameClientUserConnecting extends GameClientBaseState {
	constructor(gc) {
		super(gc);

		//a mini state machine within this state machine.
		//0 - connecting websocket
		//1 - recieving game server state
		//2 - game server state complete. Now retrieving resources to load into the client
		//3 - came client 
		this.connectionState = 0;
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Connecting...");
		this.gc.userConnectingScene = this.gc.phaserGame.scene.add("user-connecting-scene", UserConnectingScene, true, {
			gc: this.gc
		});
		
		var bFail = this.gc.wsh.createWebSocket();
		
		if(bFail)
		{
			this.websocketErrored();
		}
	}

	update(dt) {
		super.update(dt);

		switch(this.connectionState)
		{
			case 0:
				break;
			case 1:
				this.gc.ep.processServerEvents(null, this.cbPostEvent.bind(this));

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);

				break;
			case 2:

				if(this.gc.userConnectingScene.preloadComplete)
				{
					console.log('UserConnectingScene.preload complete.');
					this.gc.nextGameState = new GameClientUserPlaying(this.gc);
				}

				this.gc.wsh.createPacketForUser();
				this.gc.wsh.update(dt);
				break;
		}
		
		
	}

	exit(dt) {
		super.exit(dt);
		this.gc.phaserGame.scene.stop("user-connecting-scene");
		this.gc.phaserGame.scene.remove("user-connecting-scene");
		this.gc.userConnectingScene = null;
	}

	websocketOpened() {
		this.globalfuncs.appendToLog("Connected.");
		this.globalfuncs.appendToLog("Getting world state...");
		this.connectionState = 1;
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


	//call back for EventProcessor's processServerEvents
	cbPostEvent(e) {
		if(e.eventName == "worldStateDone")
		{
			this.connectionState = 2;
		}
	}
}