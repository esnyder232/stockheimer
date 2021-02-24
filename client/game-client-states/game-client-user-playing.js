import GameClientBaseState from './game-client-base-state.js';
import GameClientUserDisconnecting from './game-client-user-disconnecting.js';
import MainScene from "../scenes/main-scene.js"


export default class GameClientUserPlaying extends GameClientBaseState {
	constructor(gc) {
		super(gc);
	}
	
	enter(dt) {
		super.enter(dt);
		this.globalfuncs.appendToLog("Now playing.");
		this.gc.mainScene = this.gc.phaserGame.scene.add("main-scene", MainScene, true, {
			gc: this.gc
		});

		//tell the server you are ready to play
		this.gc.ep.insertClientToServerEvent({
			"eventName": "fromClientReadyToPlay"
		});
	}

	update(dt) {
		super.update(dt);

		this.gc.ep.processServerEvents(this.cbPreEvent.bind(this), this.cbPostEvent.bind(this));

		//put the packet algorithm here (insert from clientToServerEvents 1st, then fragmented events 2nd)
		this.gc.ep.insertEventsIntoPacket();

		//send the packet to the server
		this.gc.wsh.createPacketForUser();

		this.gc.wsh.update(dt);
	}

	exit(dt) {
		super.exit(dt);

		this.gc.phaserGame.scene.stop("main-scene");
		this.gc.phaserGame.scene.remove("main-scene");
		this.gc.mainScene = null;
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
				//READ:
				//none

				//WRITE:
				//DOM element manager
				case "userDisconnected":
					this.gc.mainScene.userDisconnected(e.userId);
					break;




				//READS:
				//none

				//WRITES:
				//images manager
				case "removeProjectile":
					this.gc.mainScene.removeProjectile(e);
					break;


				//READS:	
				//none

				//WRITES:
				//images manager
				case "removeCastle":
					this.gc.mainScene.removeCastle(e.id);
					break;

				default:
					//intentionally blank
					break;
			}
	}

	cbPostEvent(e) {
		switch(e.eventName)
			{	
				//READS:
				//jquery
			
				//WRITES:
				//jquery or dom element manager
				case "userDisconnected":
					this.gc.mainScene.userDisconnectedPost();
					break;




				//READS:
				//UM
				//jquery

				//WRITES:
				//jquery or DOM element manager
				case "userConnected":
					this.gc.mainScene.userConnected(e.userId);
					break;			

					

				//READS:
				//UM
				//jquery

				//WRITES:
				//jquery or DOM element manager
				case "fromServerChatMessage":
					this.gc.mainScene.fromServerChatMessage(e);
					break;



							




				//READS:
				//GOM

				//WRITES:
				//images manager
				//maybe main scene
				case "addProjectile":
					this.gc.mainScene.addProjectile(e);
					break;



				//useless...
				case "projectileUpdate":
					this.gc.mainScene.projectileUpdate(e);
					break;






				//READS:
				//GOM
				//UM

				//WRITES:
				//image manager
				//text manager
				case "addCastle":
					this.gc.mainScene.addCastle(e.id);
					break;


					
				//READS:
				//sprite manager
				//GOM

				//WRITES:
				//text manager
				case "castleUpdate":
					this.gc.mainScene.castleUpdate(e);
					break;


				//READS:
				//sprite manager
				//GOM
				
				//WRITES:
				//text manager
				case "castleDamage":
					this.gc.mainScene.castleDamage(e);
					break;

				default:
					//intentionally blank
					break;
			}
	}
}