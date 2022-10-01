import GlobalFuncs from "../global-funcs.js"
import ClientConfig from '../client-config.json';
import AddActiveCharacterEvent from "../event-classes/add-active-character-event.js"
import RemoveActiveCharacterEvent from "../event-classes/remove-active-character-event.js"
import ActiveCharacterUpdateEvent from "../event-classes/active-character-update-event.js"
import ActiveCharacterShieldUpdateEvent from "../event-classes/active-character-shield-update-event.js"
import CharacterDamageEffectEvent from "../event-classes/character-damage-effect-event.js"
import CharacterHealEffectEvent from "../event-classes/character-heal-effect-event.js"
import UpdateUserInfoEvent from "../event-classes/update-user-info-event.js"
import UserConnectedEvent from "../event-classes/user-connected-event.js"
import UserDisconnectedEvent from "../event-classes/user-disconnected-event.js"
import YourUserEvent from "../event-classes/your-user-event.js"
import FromServerChatMessageEvent from "../event-classes/from-server-chat-message-event.js"
import AddCastleEvent from "../event-classes/add-castle-event.js"
import CastleUpdateEvent from "../event-classes/castle-update-event.js"
import RemoveCastleEvent from "../event-classes/remove-castle-event.js"
import CastleDamageEvent from "../event-classes/castle-damage-event.js"
import AddProjectileEvent from "../event-classes/add-projectile-event.js"
import RemoveProjectileEvent from "../event-classes/remove-projectile-event.js"
import WorldStateDoneEvent from "../event-classes/world-state-done-event.js"
import DebugMsgEvent from "../event-classes/debug-msg-event.js"
import AddTeamEvent from "../event-classes/add-team-event.js"
import UpdateTeamEvent from "../event-classes/update-team-event.js"
import RemoveTeamEvent from "../event-classes/remove-team-event.js"
import AddRoundEvent from "../event-classes/add-round-event.js"
import UpdateRoundStateEvent from "../event-classes/update-round-state-event.js"
import UpdateUserPlayingStateEvent from "../event-classes/update-user-playing-state.js"
import KillFeedMsgEvent from "../event-classes/kill-feed-msg-event.js"
import RoundResultsEvent from "../event-classes/round-results-event.js"
import UpdateUserRttEvent from "../event-classes/update-user-rtt-event.js"
import DebugServerCircleEvent from "../event-classes/debug-server-circle-event.js"
import UpdateCharacterStateEvent from "../event-classes/update-character-state-event.js"
import ServerMapLoadedEvent from "../event-classes/server-map-loaded-event.js"
import LeaveGameImmediatelyEvent from "../event-classes/leave-game-immediately-event.js"
import AddPersistentProjectileEvent from "../event-classes/add-persistent-projectile-event.js"
import UpdatePersistentProjectileEvent from "../event-classes/update-persistent-projectile-event.js"
import RemovePersistentProjectileEvent from "../event-classes/remove-persistent-projectile-event.js"
import PersistentProjectileDamageEffectEvent from "../event-classes/persistent-projectile-damage-effect-event.js"
import UpdateTeamKothEvent from "../event-classes/update-team-koth-event.js"
import AddControlPointEvent from "../event-classes/add-control-point-event.js"
import UpdateControlPointEvent from "../event-classes/update-control-point-event.js"
import RemoveControlPointEvent from "../event-classes/remove-control-point-event.js"
import CharacterOnControlPointEvent from "../event-classes/character-on-control-point-event.js"
import CharacterOffControlPointEvent from "../event-classes/character-off-control-point-event.js"
import AddWallEvent from "../event-classes/add-wall-event.js"
import RemoveWallEvent from "../event-classes/remove-wall-event.js"
import DebugServerRaycastEvent from "../event-classes/debug-server-raycast-event.js"

export default class EventProcessor {
	constructor() {
		this.gc = null;
		this.wsh = null;
		
		this.globalfuncs = new GlobalFuncs();
		this.fragmentedServerToClientEvents = [];
		this.fragmentedClientToServerEvents = []; //events that are to be sent to the server in fragments

		this.serverToClientEvents = []; //event queue to be processed by the main loop
		this.clientToServerEvents = []; //event queue to be processed by the main loop for events going from client to server
		
		this.fragmentIdCounter = 0;
		this.fragmentationLimit = Math.round(ClientConfig.max_packet_event_bytes_until_fragmentation);

		this.eventClassesMapping = []; //mapping of eventNames to eventClasses
		this.eventFunctions = {}; //Actual event functions to be called. keys are event_ids from event schema, and values are the eventClasses.processEvent (built from event schema and eventClassesMapping). 
								  //This is ultimately to make event function lookups more efficient by looking up the event_id instead of the eventName
		this.eventFunctionsDirty = false;
	}
	
	init(gc, wsh) {
		this.gc = gc;
		this.wsh = wsh;

		this.eventClassesMapping = [
			{eventName: "addActiveCharacter", eventClass: new AddActiveCharacterEvent(), enabled: false},
			{eventName: "removeActiveCharacter", eventClass: new RemoveActiveCharacterEvent(), enabled: false},
			{eventName: "activeCharacterUpdate", eventClass: new ActiveCharacterUpdateEvent(), enabled: false},
			{eventName: "activeCharacterShieldUpdate", eventClass: new ActiveCharacterShieldUpdateEvent(), enabled: false},
			{eventName: "characterDamageEffect", eventClass: new CharacterDamageEffectEvent(), enabled: false},
			{eventName: "characterHealEffect", eventClass: new CharacterHealEffectEvent(), enabled: false},
			{eventName: "updateUserInfo", eventClass: new UpdateUserInfoEvent(), enabled: false},
			{eventName: "userConnected", eventClass: new UserConnectedEvent(), enabled: false},
			{eventName: "userDisconnected", eventClass: new UserDisconnectedEvent(), enabled: false},
			{eventName: "yourUser", eventClass: new YourUserEvent(), enabled: false},
			{eventName: "fromServerChatMessage", eventClass: new FromServerChatMessageEvent(), enabled: false},
			{eventName: "addCastle", eventClass: new AddCastleEvent(), enabled: false},
			{eventName: "castleUpdate", eventClass: new CastleUpdateEvent(), enabled: false},
			{eventName: "removeCastle", eventClass: new RemoveCastleEvent(), enabled: false},
			{eventName: "castleDamage", eventClass: new CastleDamageEvent(), enabled: false},
			{eventName: "addProjectile", eventClass: new AddProjectileEvent(), enabled: false},
			{eventName: "removeProjectile", eventClass: new RemoveProjectileEvent(), enabled: false},
			{eventName: "worldStateDone", eventClass: new WorldStateDoneEvent(), enabled: false},
			{eventName: "debugMsg", eventClass: new DebugMsgEvent(), enabled: false},
			{eventName: "addTeam", eventClass: new AddTeamEvent(), enabled: false},
			{eventName: "updateTeam", eventClass: new UpdateTeamEvent(), enabled: false},
			{eventName: "removeTeam", eventClass: new RemoveTeamEvent(), enabled: false},
			{eventName: "addRound", eventClass: new AddRoundEvent(), enabled: false},
			{eventName: "updateRoundState", eventClass: new UpdateRoundStateEvent(), enabled: false},
			{eventName: "updateUserPlayingState", eventClass: new UpdateUserPlayingStateEvent(), enabled: false},
			{eventName: "killFeedMsg", eventClass: new KillFeedMsgEvent(), enabled: false},
			{eventName: "roundResults", eventClass: new RoundResultsEvent(), enabled: false},
			{eventName: "updateUserRtt", eventClass: new UpdateUserRttEvent(), enabled: false},
			{eventName: "debugServerCircle", eventClass: new DebugServerCircleEvent(), enabled: false},
			{eventName: "updateCharacterState", eventClass: new UpdateCharacterStateEvent(), enabled: false},
			{eventName: "serverMapLoaded", eventClass: new ServerMapLoadedEvent(), enabled: false},
			{eventName: "leaveGameImmediately", eventClass: new LeaveGameImmediatelyEvent(), enabled: false},
			{eventName: "addPersistentProjectile", eventClass: new AddPersistentProjectileEvent(), enabled: false},
			{eventName: "removePersistentProjectile", eventClass: new RemovePersistentProjectileEvent(), enabled: false},
			{eventName: "updatePersistentProjectile", eventClass: new UpdatePersistentProjectileEvent(), enabled: false},
			{eventName: "persistentProjectileDamageEffect", eventClass: new PersistentProjectileDamageEffectEvent(), enabled: false},
			{eventName: "updateTeamKoth", eventClass: new UpdateTeamKothEvent(), enabled: false},
			{eventName: "addControlPoint", eventClass: new AddControlPointEvent(), enabled: false},
			{eventName: "updateControlPoint", eventClass: new UpdateControlPointEvent(), enabled: false},
			{eventName: "removeControlPoint", eventClass: new RemoveControlPointEvent(), enabled: false},
			{eventName: "characterOnControlPoint", eventClass: new CharacterOnControlPointEvent(), enabled: false},
			{eventName: "characterOffControlPoint", eventClass: new CharacterOffControlPointEvent(), enabled: false},
			{eventName: "addWall", eventClass: new AddWallEvent(), enabled: false},
			{eventName: "removeWall", eventClass: new RemoveWallEvent(), enabled: false},
			{eventName: "debugServerRaycast", eventClass: new DebugServerRaycastEvent(), enabled: false},
		];
	}

	setEventEnable(eventName, bEnabled) {
		var ei = this.eventClassesMapping.findIndex((x) => {return x.eventName === eventName;});

		if(ei >= 0) {
			this.eventClassesMapping[ei].enabled = bEnabled;
			this.eventFunctionsDirty = true;
		}
	}

	setAllEventEnable(bEnabled) {
		for(var i = 0; i < this.eventClassesMapping.length; i++) {
			this.eventClassesMapping[i].enabled = bEnabled;
		}
		this.eventFunctionsDirty = true;
	}

	buildEventFunctions() {
		//clear out eventFunctions
		for(var key in this.eventFunctions) {
			if (this.eventFunctions.hasOwnProperty(key)) {
				delete this.eventFunctions[key];
			}
		}

		//build the eventFunctions (map the event id to an event function)
		for(var i = 0; i < this.eventClassesMapping.length; i++) {
			if(this.eventClassesMapping[i].enabled) {
				var e = this.wsh.eventNameIndex[this.eventClassesMapping[i].eventName];
				if(e !== undefined) {
					this.eventFunctions[e.event_id] = this.eventClassesMapping[i].eventClass;
					this.eventFunctions[e.event_id].init(this.gc); //just init it here, whatever
				}
			}
		}

		//always add special fragment functions
		this.eventFunctions[this.wsh.eventNameIndex["fragmentStart"].event_id] = {processEvent: this.fragmentStart.bind(this)};
		this.eventFunctions[this.wsh.eventNameIndex["fragmentContinue"].event_id] = {processEvent: this.fragmentContinue.bind(this)};
		this.eventFunctions[this.wsh.eventNameIndex["fragmentEnd"].event_id] = {processEvent: this.fragmentEnd.bind(this)};
		this.eventFunctions[this.wsh.eventNameIndex["fragmentError"].event_id] = {processEvent: this.fragmentError.bind(this)};
	}

	reset() {
		this.fragmentedServerToClientEvents = [];
		this.fragmentedClientToServerEvents = []; //events that are to be sent to the server in fragments

		this.serverToClientEvents = []; //event queue to be processed by the main loop
		this.clientToServerEvents = []; //event queue to be processed by the main loop for events going from client to server
		this.eventFunctions = [];

		this.fragmentIdCounter = 0;
		this.eventFunctionsDirty = false;
	}

	insertEventsIntoPacket() {
		//first, process the regular events here
		if(this.clientToServerEvents.length > 0)
		{
			var processedIndexes = [];

			for(var i = 0; i < this.clientToServerEvents.length; i++)
			{
				//check if the websocket handler can fit the event
				var info = this.wsh.canEventFit(this.clientToServerEvents[i].eventData);

				//insert the event, and reset the priority accumulator
				if(!info.isFragment && info.b_size_varies && info.bytesRequired > this.fragmentationLimit)
				{
					this.insertFragmentEvent(this.clientToServerEvents[i].eventData, info, this.clientToServerEvents[i].cbAck, this.clientToServerEvents[i].cbSend, this.clientToServerEvents[i].miscData);

					processedIndexes.push(i); //just push it in this queue so it gets spliced off at the end
				}
				else if(info.canEventFit)
				{
					this.wsh.insertEvent(this.clientToServerEvents[i].eventData, this.clientToServerEvents[i].cbAck, this.clientToServerEvents[i].cbSend, this.clientToServerEvents[i].miscData);
					processedIndexes.push(i);
				}
				else
				{
					//do nothing. The event couldn't fit...maybe next frame it can.
				}
			}

			//splice off any tracked events that were processed
			for(var i = processedIndexes.length - 1; i >= 0; i--)
			{
				this.clientToServerEvents.splice(i, 1);
			}
		}
		
		//second, see if there are any fragmented messages that need to go to the server
		if(this.fragmentedClientToServerEvents.length > 0)
		{
			var processedFragementedEvents = [];

			for(var i = 0; i < this.fragmentedClientToServerEvents.length; i++)
			{
				var fragmentInfo = this.fragmentedClientToServerEvents[i];

				if((fragmentInfo.currentFragmentNumber -1) == fragmentInfo.ackedFragmentNumber)
				{
					//fragment start
					if(fragmentInfo.currentFragmentNumber == 0)
					{
						var nextBytes = this.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.fragmentationLimit);

						var fragmentEvent = {
							eventName: "fromClientFragmentStart",
							fragmentLength: fragmentInfo.eventDataView.byteLength,
							fragmentData: fragmentInfo.eventDataBuffer.slice(0, nextBytes),
							fragmentId: fragmentInfo.fragmentId
						};

						//see if the fragment can fit
						var info = this.wsh.canEventFit(fragmentEvent);

						if(info.canEventFit)
						{
							this.wsh.insertEvent(fragmentEvent, this.cbFragmentSendAck.bind(this), null, {fragmentId: fragmentInfo.fragmentId, bytesAcked: nextBytes});
							fragmentInfo.currentFragmentNumber++;
						}
						else
						{
							//do nothing. The event could not fit the packet. Maybe next frame.
						}
					}
					//fragment continue
					else if(fragmentInfo.currentFragmentNumber < fragmentInfo.maxFragmentNumber)
					{
						//calculate the next bytes
						var nextBytes = this.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.fragmentationLimit);

						//queue up the next fragment 
						var fragmentEvent = {
							eventName: "fromClientFragmentContinue",
							fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes),
							fragmentId: fragmentInfo.fragmentId
						};

						//see if the fragment can fit
						var info = this.wsh.canEventFit(fragmentEvent);
						
						if(info.canEventFit)
						{
							this.wsh.insertEvent(fragmentEvent, this.cbFragmentSendAck.bind(this), null, {fragmentId: fragmentInfo.fragmentId, bytesAcked: nextBytes});
							fragmentInfo.currentFragmentNumber++;
						}
						else
						{
							//do nothing. The event could not fit the packet. Maybe next frame.
						}
					}
					//fragment end
					else if(fragmentInfo.currentFragmentNumber == fragmentInfo.maxFragmentNumber)
					{
						//calculate the next bytes
						var nextBytes = this.calculateNextFragmentBytes(fragmentInfo.n, fragmentInfo.bytesRequired, this.fragmentationLimit);

						//queue up the next fragment 
						var fragmentEvent = {
							eventName: "fromClientFragmentEnd",
							fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes),
							fragmentId: fragmentInfo.fragmentId
						};

						//see if the fragment can fit
						var info = this.wsh.canEventFit(fragmentEvent);

						if(info.canEventFit)
						{
							this.wsh.insertEvent(fragmentEvent, fragmentInfo.cbFinalFragmentAck, fragmentInfo.cbFinalFragmentSend, fragmentInfo.cbFinalFragmentMiscData);

							//the entire fragment has been sent. Splice it off the array.(the internet told me splice was faster)
							// console.log("FRAGMENT END SENT");
							// console.log(fragmentInfo);
							processedFragementedEvents.push(i);
						}
						else
						{
							//do nothing. The event could not fit the packet. Maybe next frame.
						}
					}
				}
			}

			//splice off fragmented messages if we're done with them
			for(var i = processedFragementedEvents.length - 1; i >= 0; i--)
			{
				this.fragmentedClientToServerEvents.splice(processedFragementedEvents[i], 1);
			}
		}
	}

	//inserts the event into the serverToclient array so it can be processed later in the update loop
	insertClientToServerEvent(eventData, cbAck, cbSend, miscData) {
		this.clientToServerEvents.push({
			eventData: eventData,
			cbAck: cbAck,
			cbSend: cbSend,
			miscData: miscData
		});
	}
	
	insertFragmentEvent(event, info, cbFinalFragmentAck, cbFinalFragmentSend, cbFinalFragmentMiscData) {
		var fragmentInfo = {
			bytesRequired: info.bytesRequired,
			eventData: event,
			eventDataBuffer: null,
			eventDataView: null,
			fragmentId: this.getFragmentId(),
			n: 0,						//the current byte of the eventDataBuffer we are on
			currentFragmentNumber: 0, 	//the current fragment number we are trying to send in the "trackedEvents"
			ackedFragmentNumber: -1,  	//the most recent acked fragment number that was sent to the client
			maxFragmentNumber: 0,		//the max number of fragments we need to send
			cbFinalFragmentAck: cbFinalFragmentAck, //the callback for when the final fragment gets acknowledged out
			cbFinalFragmentSend: cbFinalFragmentSend, //the callback for when the final framgnets gets sent out
			cbFinalFragmentMiscData: cbFinalFragmentMiscData //the misc data to be passed back into the cbFinalFragmentAck and cbFinalFragmentSend callbacks

		};

		//calculate the max fragments required and create the buffer
		fragmentInfo.maxFragmentNumber = Math.floor(fragmentInfo.bytesRequired / this.fragmentationLimit);
		fragmentInfo.eventDataBuffer = new ArrayBuffer(fragmentInfo.bytesRequired);
		fragmentInfo.eventDataView = new DataView(fragmentInfo.eventDataBuffer);

		//encode the entire event in the eventDataBuffer
		this.wsh.encodeEventInBuffer(fragmentInfo.eventData, fragmentInfo.eventDataView, 0);

		//push the fragmentInfo into the fragmentedClientToServerEvents so we can keep track of it seperately
		this.fragmentedClientToServerEvents.push(fragmentInfo);
	}



	cbFragmentSendAck(miscData) {
		// console.log('ACK FRAGMENT CALLED');
		// console.log(miscData);

		var index = this.fragmentedClientToServerEvents.findIndex((x) => {return x.fragmentId == miscData.fragmentId;});
		if(index >= 0)
		{
			this.fragmentedClientToServerEvents[index].ackedFragmentNumber++;
			this.fragmentedClientToServerEvents[index].n += miscData.bytesAcked;
			// console.log('fragment found. Increasing now. ' + this.fragmentedClientToServerEvents[index].ackedFragmentNumber + ". bytes acked: " + this.fragmentedClientToServerEvents[index].n);
		}
	}

	calculateNextFragmentBytes(n, totalByteLength, fragmentationLimit)
	{
		var result = 0;

		var bytesRemaining = totalByteLength - n;

		if(Math.floor(bytesRemaining/fragmentationLimit) >= 1)
		{
			result = fragmentationLimit;
		}
		else
		{
			result = bytesRemaining;
		}

		return result;
	}

	getFragmentId() {
		return this.fragmentIdCounter++;
	}



	processServerEvents() {
		if(this.eventFunctionsDirty) {
			this.buildEventFunctions();
			this.eventFunctionsDirty = false;
		}

		for(var i = 0; i < this.serverToClientEvents.length; i++)
		{
			var e = this.serverToClientEvents[i];

			if(this.eventFunctions[e.eventId] !== undefined)
			{
				this.eventFunctions[e.eventId].processEvent(e);
			}
		}
		
		this.serverToClientEvents.length = 0;
	}

	fragmentStart(e) {
		var fragmentInfo = {
			fragmentLength: e.fragmentLength,
			fragmentData: new ArrayBuffer(e.fragmentLength),
			fragmentDataView: null,
			fragmentId: e.fragmentId,
			n: 0
		};

		fragmentInfo.fragmentDataView = new DataView(fragmentInfo.fragmentData);

		//copy the fragment in this message to the fragmentedServeRtoClientEvents
		var dv = new DataView(e.fragmentData);
		for(var j = 0; j < dv.byteLength; j++)
		{
			fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
			fragmentInfo.n++;
		}

		this.fragmentedServerToClientEvents.push(fragmentInfo);
	}

	fragmentContinue(e) {
		var fragmentInfo = this.fragmentedServerToClientEvents.find((x) => {return x.fragmentId === e.fragmentId;});

		if(fragmentInfo)
		{
			//copy the fragment in this message to the fragmentedServeRtoClientEvents
			var dv = new DataView(e.fragmentData);
			for(var j = 0; j < dv.byteLength; j++)
			{
				fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
				fragmentInfo.n++;
			}
		}
	}

	fragmentEnd(e) {
		var fragmentInfoIndex = this.fragmentedServerToClientEvents.findIndex((x) => {return x.fragmentId === e.fragmentId;});

		if(fragmentInfoIndex >= 0)
		{							
			var fragmentInfo = this.fragmentedServerToClientEvents[fragmentInfoIndex];

			//copy the fragment in this message to the fragmentedServeRtoClientEvents
			var dv = new DataView(e.fragmentData);
			for(var j = 0; j < dv.byteLength; j++)
			{
				fragmentInfo.fragmentDataView.setUint8(fragmentInfo.n, dv.getUint8(j));
				fragmentInfo.n++;
			}

			this.wsh.decodeEvent(0, fragmentInfo.fragmentDataView, true);
			this.fragmentedServerToClientEvents.splice(fragmentInfoIndex, 1);
		}
	}

	//this gets called when there is an error in sending a fragmented message from client to server
	fragmentError(e) {
		var errorMsg = "Fragment Error code: " + e.fragmentErrorCode + 
		". Message: " + this.gc.gameConstants.FragmentErrorMessages[this.gc.gameConstantsInverse.FragmentErrorCodes[e.fragmentErrorCode]];

		console.error(errorMsg);

		//if its a serious error, find the fragment in the list and splice it off because it errored on the server
		if(e.fragmentErrorCode === this.gc.gameConstants.FragmentErrorCodes["FRAGMENT_DATA_TOO_LONG"] ||
		   e.fragmentErrorCode === this.gc.gameConstants.FragmentErrorCodes["FRAGMENT_RESULT_TOO_SHORT"] ||
		   e.fragmentErrorCode === this.gc.gameConstants.FragmentErrorCodes["FRAGMENT_RESULT_TOO_LONG"] ||
		   e.fragmentErrorCode === this.gc.gameConstants.FragmentErrorCodes["FRAGMENT_TIMEOUT"]) {
			var index = this.fragmentedClientToServerEvents.findIndex(x => x.fragmentId === e.fragmentId);
			if(index >= 0) {
				this.fragmentedClientToServerEvents.splice(index, 1);
			}
			
			this.gc.modalMenu.openMenu("error", errorMsg);
		}
	}


}