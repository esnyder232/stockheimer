const planck = require('planck-js');
const {GlobalFuncs} = require('../global-funcs.js');
const {CollisionCategories, CollisionMasks} = require('../collision-data.js');
const logger = require('../../logger.js');

class Castle {
	constructor() {
		this.gs = null;
		this.id = null;
		this.ownerId = null;
		this.ownerType = "server";
		this.type = "castle";

		this.plBody = null;
		this.isDirty = false;
		this.hpMax = 100;
		this.hpCur = 100;
		this.prevHpCur = 100;
		this.xStarting = 0;
		this.yStarting = 0;
		this.size = 1;
		this.castleName = "CastleNameHere";
	}

	castleInit(gameServer, xc, yc, castleName) {
		this.gs = gameServer;
		this.xStarting = xc;
		this.yStarting = yc;
		this.castleName = castleName;
	}

	//called only after the castle is activated
	castlePostActivated() {
		const pl = this.gs.pl;
		const Vec2 = pl.Vec2;
		const world = this.gs.world;

		//create a plank object
		var boxShape = pl.Box(this.size/2, this.size/2, Vec2(0, 0));

		this.plBody = world.createBody({
			position: Vec2(this.xStarting, this.yStarting),
			type: this.gs.pl.Body.KINEMATIC,
			fixedRotation: true,
			userData: {type: "castle", id: this.id}
		});
		
		this.plBody.createFixture({
			shape: boxShape,
			density: 0,
			friction: 0.0,
			filterCategoryBits: CollisionCategories["castle_body"],
			filterMaskBits: CollisionMasks["castle_body"]
		});
	}

	cbCastleActivatedFailed(id, errorMessage) {
		//just destroy the castle
		this.gs.destroyGameObject(this.id);
	}

	//called before the castle is officially deactivated with the game object manager.
	castlePredeactivated() {
		if(this.plBody)
		{
			this.gs.world.destroyBody(this.plBody);
			this.plBody = null;
		}
	}

	//callback for successful deactivation...ugh
	cbDeactivateCastleSuccess() {
		this.gs.gom.destroyGameObject(this.id);
		this.castleDeinit();
	}

	//called right before the castle is officially deleted by the game object manager.
	castleDeinit() {
		//lol, whatever
		this.gs.castleObject = null;
		this.gs = null;
	}

	getPlanckPosition() {
		if(this.plBody !== null)
		{
			return this.plBody.getPosition();
		}
		return null;
	}

	update(dt) {
		//for now, just set isDirty to false at the BEGINNING of the update loop
		this.isDirty = false;

		if(this.hpCur !== this.prevHpCur)
		{
			this.isDirty = true;
		}

		if(this.plBody)
		{
			if(this.hpCur <= 0)
			{
				this.gs.gom.deactivateGameObjectId(this.id, this.cbDeactivateCastleSuccess.bind(this));
				this.castlePredeactivated();

				//announce the castle has been killed.
				var broadcastMessage = this.castleName + " has been destroyed!";
				logger.log("info", broadcastMessage);
				var activeUsers = this.gs.um.getActiveUsers();
				for(var j = 0; j < activeUsers.length; j++)
				{
					activeUsers[j].insertServerToClientEvent({
						"eventName": "killfeedMsg",
						"killfeedMsg": broadcastMessage
					});
				}
			}
		}

		this.prevHpCur = this.hpCur;
	}

	checkDirty() {
		return this.isDirty;
	}

	isHit(dmg)	{
		//create event for clients to notify them of damage
		var activeUsers = this.gs.um.getActiveUsers();
		for(var i = 0; i < activeUsers.length; i++)
		{
			activeUsers[i].insertTrackedEntityEvent("gameobject", this.id, {
				"eventName": "castleDamage",
				"id": this.id,
				"damage": dmg
			});
		}
		
		
		this.hpCur -= dmg;
		if(this.hpCur < 0)
		{
			this.hpCur = 0;
		}
	}
	
	///////////////////////////////////
	// EVENT SERIALIZATION FUNCTIONS //
	///////////////////////////////////

	serializeAddCastleEvent() {
		var eventData = null;
		var bodyPos = {x: this.xStarting, y: this.yStarting};
		if(this.plBody !== null)
		{
			bodyPos = this.plBody.getPosition();
		}

		eventData = {
			"eventName": "addCastle",
			"id": this.id,
			"x": bodyPos.x,
			"y": bodyPos.y,
			"size": this.size,
			"castleHpMax": this.hpMax,
			"castleHpCur": this.hpCur,
			"castleName": this.castleName
		};
		
		return eventData;
	}

	serializeCastleUpdateEvent() {
		var eventData = null;

		eventData = {
			"eventName": "castleUpdate",
			"id": this.id,
			"castleHpMax": this.hpMax,
			"castleHpCur": this.hpCur,
		};
		
		return eventData;
	}

	serializeRemoveCastleEvent() {
		return {
			"eventName": "removeCastle",
			"id": this.id,
		};
	}
}

exports.Castle = Castle;