import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import MainScene from "../scenes/main-scene.js"


export default class GameClientUserPlaying extends GameClientBaseState {
	constructor(gc) {
		super(gc);
		this.ep = this.gc.ep;
		this.ms = null;
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Now playing.");
		this.ms = this.gc.phaserGame.scene.add("main-scene", MainScene, true, {
			gc: this.gc
		});

		//tell the server you are ready to play
		this.gc.wsh.clientToServerEvents.push({
			"eventName": "fromClientReadyToPlay"
		});
	}

	update(dt) {
		super.update(dt);

		this.gc.ep.processServerEvents(this.cbPreEvent.bind(this), this.cbPostEvent.bind(this));

		this.gc.wsh.createPacketForUser();
		this.gc.wsh.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		this.gc.phaserGame.scene.stop("main-scene");
		this.gc.phaserGame.scene.remove("main-scene");
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

	cbPreEvent(e) {
		switch(e.eventName)
			{
				case "userDisconnected":
					this.ms.userDisconnected(e.userId);
					break;

				case "removeActiveCharacter":
					this.ms.removeActiveCharacter(e.characterId);
					break;

				case "removeProjectile":
					this.ms.removeProjectile(e);
					break;

				default:
					//intentionally blank
					break;
			}
	}

	cbPostEvent(e) {
		switch(e.eventName)
			{
				case "userConnected":
					this.ms.userConnected(e.userId);
					break;
			
				case "existingUser":
					this.ms.existingUser(e.userId);
					break;

				case "fromServerChatMessage":
					this.ms.fromServerChatMessage(e);
					break;
				
				case "addActiveCharacter":
					this.ms.addActiveCharacter(e.characterId);
					break;

				case "activeCharacterUpdate":
					this.ms.activeCharacterUpdate(e);
					break;

				case "addProjectile":
					this.ms.addProjectile(e);
					break;

				case "projectileUpdate":
					this.ms.projectileUpdate(e);
					break;
				default:
					//intentionally blank
					break;
			}
	}
}