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
					this.ms.userDisconnected(e.userId);
					break;



				//READS:
				//GOM
				//sprite manager

				//WRITES:
				//sprite manager
				//images manager
				//text manager
				//main scene
				//camera manager
				//DOM element manager
				//maybe jquery
				case "removeActiveCharacter":
					this.ms.removeActiveCharacter(e.id);
					break;


				//READS:
				//none

				//WRITES:
				//images manager
				case "removeProjectile":
					this.ms.removeProjectile(e);
					break;


				//READS:	
				//none

				//WRITES:
				//images manager
				case "removeCastle":
					this.ms.removeCastle(e.id);
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
					this.ms.userDisconnectedPost();
					break;




				//READS:
				//UM
				//jquery

				//WRITES:
				//jquery or DOM element manager
				case "userConnected":
					this.ms.userConnected(e.userId);
					break;			

					

				//READS:
				//UM
				//jquery

				//WRITES:
				//jquery or DOM element manager
				case "fromServerChatMessage":
					this.ms.fromServerChatMessage(e);
					break;



							

				//READS:
				//GOM
				//UM
				//jquery

				//WRITES:
				//sprite manager
				//text manager
				//main scene
				//camera manager
				//jquery or DOM element manager
				case "addActiveCharacter":
					this.ms.addActiveCharacter(e.id);
					break;



				//READS:
				//GOM
				//sprite manager
				//text manager

				//WRITES:
				//sprite manager
				//text manager
				case "activeCharacterUpdate":
					this.ms.activeCharacterUpdate(e);
					break;



				//READS:
				//GOM

				//WRITES:
				//images manager
				//maybe main scene
				case "addProjectile":
					this.ms.addProjectile(e);
					break;



				//useless...
				case "projectileUpdate":
					this.ms.projectileUpdate(e);
					break;




				//READS:
				//GOM (or sprite manager if needed)

				//WRITES
				//text manager
				case "characterDamage":
					this.ms.characterDamage(e);
					break;



				//READS:
				//UM
				//dom element manager
				//text manager
				//sprite manager (maybe? if text references are stored in sprite object)

				//WRITES:
				//dom element manager or jquery
				//text manager
				case "updateUserInfo":
					this.ms.updateUserInfo(e);
					break;


				//READS:
				//GOM
				//UM

				//WRITES:
				//image manager
				//text manager
				case "addCastle":
					this.ms.addCastle(e.id);
					break;


					
				//READS:
				//sprite manager
				//GOM

				//WRITES:
				//text manager
				case "castleUpdate":
					this.ms.castleUpdate(e);
					break;


				//READS:
				//sprite manager
				//GOM
				
				//WRITES:
				//text manager
				case "castleDamage":
					this.ms.castleDamage(e);
					break;

				default:
					//intentionally blank
					break;
			}
	}
}