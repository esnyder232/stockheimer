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
		this.gc.mainScene.createMap();
	}

	update(dt) {
		super.update(dt);

		this.gc.ep.processServerEvents(this.cbPreEvent.bind(this), this.cbPostEvent.bind(this));

		//put the packet algorithm here (insert from clientToServerEvents 1st, then fragmented events 2nd)
		this.gc.ep.insertEventsIntoPacket();

		//send the packet to the server
		this.gc.wsh.createPacketForUser();

		this.gc.wsh.update(dt);

		//update managers
		this.gc.gom.update(dt);
		this.gc.um.update(dt);
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

	cbPreEvent(e) {
		switch(e.eventName)
			{




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