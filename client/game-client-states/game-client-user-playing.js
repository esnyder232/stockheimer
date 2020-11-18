import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import MainScene from "../scenes/main-scene.js"

export default class GameClientUserPlaying extends GameClientBaseState {
	constructor(gc) {
		super(gc);

		this.ms = null;
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Now playing.");
		this.ms = this.gc.phaserGame.scene.add("main-scene", MainScene, true, {
			gc: this.gc
		});
	}

	update(dt) {
		super.update(dt);

		this.processServerEvents();

		this.gc.wsh.createPacketForUser();
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

	processServerEvents() {
		for(var i = this.gc.wsh.serverToClientEvents.length - 1; i >= 0; i--)
		{
			var e = this.gc.wsh.serverToClientEvents[i];
			switch(e.eventName)
			{
				case "userConnected":
					this.gc.users.push({
						userId: e.userId,
						username: e.username
					});

					this.ms.userConnected(e);
					break;
				case "userDisconnected":
					this.ms.userDisconnected(e);

					var userIndex = this.gc.users.findIndex((x) => {
						return x.userId == e.userId;
					})

					if(userIndex >= 0)
					{
						this.gc.users.splice(userIndex, 1);
					}

					break;

				case "existingUser":
					this.gc.users.push({
						userId: e.userId,
						username: e.username
					});

					this.ms.existingUser(e);
					break;
				
				default:
					//intentionally blank
					break;
			}

			this.gc.wsh.serverToClientEvents.splice(i, 1);
		}
	}
}