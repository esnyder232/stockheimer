const {GlobalFuncs} = require('../global-funcs.js');

class PrioritySystem {
	constructor() {
		this.gs = null;
		this.pl = null;
		this.world = null;
		this.globalfuncs = new GlobalFuncs();
	}

	init(gs) {
		this.gs = gs;

		this.pl = this.gs.pl;
		this.world = this.gs.world;
	}

	update(dt) {
		var activeUsers = this.gs.um.getActiveUsers();

		for(var i = 0; i < activeUsers.length; i++)
		{
			//process any transactions that occured this frame
			var u = activeUsers[i];
			
			if(u.isTrackedObjectsDirty)
			{
				if(u.trackedObjectsTransactions.length > 0)
				{
					for(var j = 0; j < u.trackedObjectsTransactions.length; j++)
					{
						var t = u.trackedObjectsTransactions[j];
						switch(t.transaction)
						{
							//insert the object to be tracked
							case "insert":
								//check if the object is already tracked
								var index = u.trackedObjects.findIndex((x) => {return x.id == t.id;});
								var obj = null;

								if(t.type == "character")
								{
									obj = this.gs.cm.getCharacterByID(t.id);
								}
								else if(t.type == "projectile")
								{
									obj = this.gs.pm.getProjectileByID(t.id);
								}
								//cheating
								if(t.type == "wall")
								{
									obj = {id: t.id, type: "wall"};
								}

								if(index < 0 && obj !== null)
								{
									u.trackedObjects.push({
										id: t.id,
										type: t.type,
										priorityAccumulator: 0.0
									});

									
									//create a tracked event for the gameobject
									if(t.type == "character")
									{
										var temp = {
											"eventName": "addActiveCharacter",
											"userId": obj.userId,
											"characterId": obj.id,
											"activeCharacterId": obj.activeId,
											"characterPosX": 0,
											"characterPosY": 0,
											"characterState": "",
											"characterType": ""
										}

										if(obj.plBody !== null)
										{
											var p = obj.plBody.getPosition();
											temp.characterPosX = p.x;
											temp.characterPosY = p.y;
										}

										u.trackedEvents.push(temp);

									}
									else if(t.type == "projectile")
									{
										u.trackedEvents.push({
											"eventName": "addProjectile",
											"id": obj.id,
											"x": obj.xStarting,
											"y": obj.yStarting,
											"angle": obj.angle,
											"size": obj.size
										});
									}
								}


								break;

							//remove the object to be tracked
							case "delete":
								var index = u.trackedObjects.findIndex((x) => {return x.id == t.id;});
								var obj = null;

								if(t.type == "character")
								{
									obj = this.gs.cm.getCharacterByID(t.id);
								}
								else if(t.type == "projectile")
								{
									obj = this.gs.pm.getProjectileByID(t.id);
								}
								//cheating
								else if(t.type == "wall")
								{
									obj = {id: t.id, type: "wall"};
								}

								if(index >= 0 && obj !== null)
								{
									//create a tracked event for the gameobject
									if(t.type == "character")
									{
										u.trackedEvents.push({
											"eventName": "removeActiveCharacter",
											"characterId": obj.id
										});
									}
									else if(t.type == "projectile")
									{
										u.trackedEvents.push({
											"eventName": "removeProjectile",
											"id": obj.id
										});
									}


									u.trackedObjects.splice(index, 1);
								}
								break;
							default:
								//intentionally blank
								break;
						}
					}

					//delete all transactions when done with processing them
					u.trackedObjectsTransactions.length = 0;
					u.isTrackedObjectsDirty = false;

					console.log('priority system: userId: ' + u.id + ", trackedObjects: " + u.trackedObjects.length);
				}
			}
		
			//update priority accumulator. Keep it simple for now, just add dt.
			for(var j = 0; j < u.trackedObjects.length; j++)
			{
				u.trackedObjects[j].priorityAccumulator += dt;
			}

			//sort the tracked object array
			u.trackedObjects.sort((a, b) => {return a.priorityAccumulator-b.priorityAccumulator});

			//create a packet 
			//STOPPED HERE - 
			// do i create a packet HERE and queue it up for the packet system (requires a "simulate" packet where I have to simulate bytes written)
			// Or do i create the packet in the PACKET SYSTEM right then and there. That way I know exactly how many bytes i'm writing out (because I am writing the packet at that point).


		}
	}
}

exports.PrioritySystem = PrioritySystem;
