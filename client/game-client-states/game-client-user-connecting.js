import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import GameClientUserPlaying from './game-client-user-playing.js';
import UserConnectingScene from "../scenes/user-connecting-scene.js"

export default class GameClientUserConnecting extends GameClientBaseState {
	constructor(gc) {
		super(gc);

		//a mini state machine within this state.
		//0 - connecting websocket
		//1 - recieving game server state
		//2 - game server state complete
		this.connectionState = 0;
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Connecting...");
		this.gc.phaserGame.scene.add("user-connecting-scene", UserConnectingScene, true, {
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
				this.globalfuncs.appendToLog("Connected.");
				this.globalfuncs.appendToLog("Getting world state...");
				
				//for now, just go straight to user playing
				this.recievingGameStateSuccess()
				break;
			case 2:
				console.log('User connection complete. Letting the user play now.');
				this.gc.nextGameState = new GameClientUserPlaying(this.gc);
				break;
		}
		
		
	}

	exit(dt) {
		super.exit(dt);
		this.gc.phaserGame.scene.stop("user-connecting-scene");
		this.gc.phaserGame.scene.remove("user-connecting-scene");
	}

	websocketOpened() {
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

	recievingGameStateSuccess() {
		this.connectionState = 2;
	}

}