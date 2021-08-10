import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import GameClientUserWaitingForServer from './game-client-user-waiting-for-server.js';
import UserConnectingScene from "../scenes/user-connecting-scene.js"
export default class GameClientUserConnecting extends GameClientBaseState {
	constructor(gc) {
		super(gc);

		this.wsConnected = false;
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Connecting...");
		this.gc.userConnectingScene = this.gc.phaserGame.scene.add("user-connecting-scene", UserConnectingScene, true, {
			gc: this.gc
		});
		
		var error = this.gc.wsh.createWebSocket();
		
		if(error) {
			this.gc.websocketErrored();
		}
		
		this.gc.userConnectingScene.updateConnectingMessage("Connecting to server...");
	}


	update(dt) {
		super.update(dt);

		//if a disconnect was requested by the user or an error occured somehow in the websocket, disconnect
		if(this.gc.bDisconnect) {
			this.gc.nextGameState = new GameClientUserDisconnecting(this.gc);
		}

		//if the websocket connected, move onto the next state
		if(this.gc.wsConnected) {
			this.gc.nextGameState = new GameClientUserWaitingForServer(this.gc);
		}
	}

	exit(dt) {
		super.exit(dt);
	}
}