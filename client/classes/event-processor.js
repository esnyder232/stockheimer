import GlobalFuncs from "../global-funcs.js"
import ClientConfig from '../client-config.json';
import AddActiveCharacterEvent from "../event-classes/add-active-character-event.js"
import RemoveActiveCharacterEvent from "../event-classes/remove-active-character-event.js"
import ActiveCharacterUpdateEvent from "../event-classes/active-character-update-event.js"
import CharacterDamageEvent from "../event-classes/character-damage-event.js"
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
import KillfeedMsgEvent from "../event-classes/killfeed-msg-event.js"
import AddTeamEvent from "../event-classes/add-team-event.js"
import UpdateTeamEvent from "../event-classes/update-team-event.js"
import RemoveTeamEvent from "../event-classes/remove-team-event.js"







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
	}
	
	init(gc, wsh) {
		this.gc = gc;
		this.wsh = wsh;

		this.eventClassesMapping = [
			{eventName: "addActiveCharacter", eventClass: new AddActiveCharacterEvent()},
			{eventName: "removeActiveCharacter", eventClass: new RemoveActiveCharacterEvent()},
			{eventName: "activeCharacterUpdate", eventClass: new ActiveCharacterUpdateEvent()},
			{eventName: "characterDamage", eventClass: new CharacterDamageEvent()},
			{eventName: "updateUserInfo", eventClass: new UpdateUserInfoEvent()},
			{eventName: "userConnected", eventClass: new UserConnectedEvent()},
			{eventName: "userDisconnected", eventClass: new UserDisconnectedEvent()},
			{eventName: "yourUser", eventClass: new YourUserEvent()},
			{eventName: "fromServerChatMessage", eventClass: new FromServerChatMessageEvent()},
			{eventName: "addCastle", eventClass: new AddCastleEvent()},
			{eventName: "castleUpdate", eventClass: new CastleUpdateEvent()},
			{eventName: "removeCastle", eventClass: new RemoveCastleEvent()},
			{eventName: "castleDamage", eventClass: new CastleDamageEvent()},
			{eventName: "addProjectile", eventClass: new AddProjectileEvent()},
			{eventName: "removeProjectile", eventClass: new RemoveProjectileEvent()},
			{eventName: "worldStateDone", eventClass: new WorldStateDoneEvent()},
			{eventName: "killfeedMsg", eventClass: new KillfeedMsgEvent()},
			{eventName: "addTeam", eventClass: new AddTeamEvent()},
			{eventName: "updateTeam", eventClass: new UpdateTeamEvent()},
			{eventName: "removeTeam", eventClass: new RemoveTeamEvent()}
		];

	}

	eventSchemaReady() {
		console.log('building eventFunctions mapping...');
		console.log(this.wsh.eventNameIndex);
		//build the eventFunctions (map the event id to an event function)
		for(var i = 0; i < this.eventClassesMapping.length; i++)
		{
			var e = this.wsh.eventNameIndex[this.eventClassesMapping[i].eventName];
			if(e !== undefined)
			{
				this.eventFunctions[e.event_id] = this.eventClassesMapping[i].eventClass;
				this.eventFunctions[e.event_id].init(this.gc); //just init it here, whatever
			}
		}

		//add special fragment functions seperately
		this.eventFunctions[this.wsh.eventNameIndex["fragmentStart"].event_id] = {processEvent: this.fragmentStart.bind(this)};
		this.eventFunctions[this.wsh.eventNameIndex["fragmentContinue"].event_id] = {processEvent: this.fragmentContinue.bind(this)};
		this.eventFunctions[this.wsh.eventNameIndex["fragmentEnd"].event_id] = {processEvent: this.fragmentEnd.bind(this)};

		console.log('eventFunctions built successfully');
		console.log(this.eventFunctions);
	}

	reset() {
		this.fragmentedServerToClientEvents = [];
		this.fragmentedClientToServerEvents = []; //events that are to be sent to the server in fragments

		this.serverToClientEvents = []; //event queue to be processed by the main loop
		this.clientToServerEvents = []; //event queue to be processed by the main loop for events going from client to server
		
		this.fragmentIdCounter = 0;
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
							eventName: "fragmentStart",
							fragmentLength: fragmentInfo.eventDataView.byteLength,
							fragmentData: fragmentInfo.eventDataBuffer.slice(0, nextBytes),
							fragmentId: fragmentInfo.fragmentId
						};

						//see if the fragment can fit
						var info = this.wsh.canEventFit(fragmentEvent);

						if(info.canEventFit)
						{
							this.wsh.insertEvent(fragmentEvent, this.cbFragmentSendAck.bind(this), null, {fragmentId: fragmentInfo.fragmentId});
							fragmentInfo.n += nextBytes;
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
							eventName: "fragmentContinue",
							fragmentData: fragmentInfo.eventDataBuffer.slice(fragmentInfo.n, fragmentInfo.n + nextBytes),
							fragmentId: fragmentInfo.fragmentId
						};

						//see if the fragment can fit
						var info = this.wsh.canEventFit(fragmentEvent);
						
						if(info.canEventFit)
						{
							this.wsh.insertEvent(fragmentEvent, this.cbFragmentSendAck.bind(this), null, {fragmentId: fragmentInfo.fragmentId});
							fragmentInfo.n += nextBytes;
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
							eventName: "fragmentEnd",
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
			//console.log('fragment found. Increasing now. ' + this.fragmentedClientToServerEvents[index].ackedFragmentNumber);
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

}