const {GlobalFuncs} = require('../global-funcs.js');
const logger = require('../../logger.js');

class CollisionSystem {
	constructor() {
		this.gs = null;
		this.globalfuncs = new GlobalFuncs();
		this.pl = null;

		this.colList = []; //permutations of collision types
		this.colFullTypeIndex = {}; //index of colList based on type1 + type2 (fullType)
	}

	init(gs) {
		this.gs = gs;
		this.pl = this.gs.pl;

		this.colList = [
			{type1: "ai-agent", 	type2:"character", 	beginFunc: this.beginAIAgentCharacterCollision.bind(this), 		endFunc: this.endAIAgentCharacterCollision.bind(this)},
			// {type1: "ai-agent", 	type2:"aibody", 	beginFunc: this.beginAIAgentAiBodyCollision.bind(this), 		endFunc: this.endAIAgentAiBodyCollision.bind(this)},
			{type1: "castle", 		type2:"projectile",	beginFunc: this.beginCastleProjectileCollision.bind(this), 		endFunc: this.endCastleProjectileCollision.bind(this)},
			{type1: "castle", 		type2:"user", 		beginFunc: this.beginCastleUserCollision.bind(this), 			endFunc: this.endCastleUserCollision.bind(this)},
			{type1: "character", 	type2:"character", 	beginFunc: this.beginCharacterCharacterCollision.bind(this), 	endFunc: this.endCharacterCharacterCollision.bind(this)},
			{type1: "character", 	type2:"projectile", beginFunc: this.beginCharacterProjectileCollision.bind(this), 	endFunc: this.endCharacterProjectileCollision.bind(this)},
			// {type1: "character", 	type2:"wall", 		beginFunc: this.beginCharacterWallCollision.bind(this), 		endFunc: this.endCharacterWallCollision.bind(this)},
			{type1: "character", 	type2:"user", 		beginFunc: this.beginCharacterUserCollision.bind(this), 		endFunc: this.endCharacterUserCollision.bind(this)},
			{type1: "projectile", 	type2:"projectile", beginFunc: this.beginProjectileProjectileCollision.bind(this), 	endFunc: this.endProjectileProjectileCollision.bind(this)},
			{type1: "projectile", 	type2:"user", 		beginFunc: this.beginProjectileUserCollision.bind(this), 		endFunc: this.endProjectileUserCollision.bind(this)},
			{type1: "projectile", 	type2:"wall", 		beginFunc: this.beginProjectileWallCollision.bind(this), 		endFunc: this.endProjectileWallCollision.bind(this)},
			//{type1: "user", 	type2:"wall", 			beginFunc: this.beginUserWallCollision.bind(this), 				endFunc: this.endUserWallCollision.bind(this)}
		]

		//calculate fullType and make index
		for(var i = 0; i < this.colList.length; i++)
		{
			this.colList[i].fullType = this.colList[i].type1 + this.colList[i].type2;
			this.colFullTypeIndex[this.colList[i].fullType] = this.colList[i];
		}
	}

	activate() {
		//register callbacks with planck
		if(this.gs.world !== null) {
			this.gs.world.on("begin-contact", this.handleBeginCollision.bind(this));
			this.gs.world.on("end-contact", this.handleEndCollision.bind(this));
		}
	}

	deactivate() {
		if(this.gs.world !== null) {
			this.gs.world.off("begin-contact", this.handleBeginCollision.bind(this));
			this.gs.world.off("end-contact", this.handleEndCollision.bind(this));
		}
	}




	handleBeginCollision(contactObj)
	{
		//logger.log("info", 'beginContact!');

		//first, we need to get the user data objects from the collision so we know what types of game objects collided
		var uda = this.getUserData(contactObj.getFixtureA());
		var udb = this.getUserData(contactObj.getFixtureB());

		if(uda !== null && udb !== null)
		{
			uda.origIndex = 0; //used for sorting later
			udb.origIndex = 1; //used for sorting later

			var udArray = [uda, udb];

			//sort types alphabetically
			udArray.sort((a, b) => {
				return (a.type < b.type) ? -1 : (a.type > b.type) ? 1 : 0;
			});

			//second, we need to call a function based on the collision between the game object types
			var colObj = this.colFullTypeIndex[udArray[0].type + udArray[1].type];

			if(colObj)
			{
				colObj.beginFunc(udArray[0], udArray[1], contactObj, udArray[0].origIndex == 0)
			}
		}
	}

	handleEndCollision(contactObj)
	{
		//logger.log("info", 'endContact!');

		//first, we need to get the user data objects from the collision so we know what types of game objects collided
		var uda = this.getUserData(contactObj.getFixtureA());
		var udb = this.getUserData(contactObj.getFixtureB());

		if(uda !== null && udb !== null)
		{
			uda.origIndex = 0; //used for sorting later
			udb.origIndex = 1; //used for sorting later

			var udArray = [uda, udb];

			//sort types alphabetically
			udArray.sort((a, b) => {
				return (a.type < b.type) ? -1 : (a.type > b.type) ? 1 : 0;
			});

			//second, we need to call a function based on the collision between the game object types
			var colObj = this.colFullTypeIndex[udArray[0].type + udArray[1].type];

			if(colObj)
			{
				colObj.endFunc(udArray[0], udArray[1], contactObj, udArray[0].origIndex == 0)
			}
		}
	}

	//Get the user data if it exists on the fixture.
	//If it doesn't exist on the fixture, get the user data if it exists on the body.
	//If it doesn't exist on the body, return null.
	getUserData(fixture)
	{
		var userData = fixture.getUserData();
		if(userData === null)
		{
			userData = fixture.getBody().getUserData();
		}

		return userData;
	}


	///////////////////////////
	// AI Agent collilsions  //
	///////////////////////////
	beginAIAgentCharacterCollision(AIAgentUserData, characterUserData, contactObj, isAIAgentA)
	{
		//logger.log("info", 'begin character projectile Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + projectileUserData.type + " " + projectileUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var ai = this.gs.aim.getAIAgentByID(AIAgentUserData.id);
		var c = this.gs.gom.getGameObjectByID(characterUserData.id);

		if(ai !== null && c !== null)
		{
			ai.characterEnteredVision(c);
		}
	}

	endAIAgentCharacterCollision(AIAgentUserData, characterUserData, contactObj, isAIAgentA)
	{
		//logger.log("info", 'begin character projectile Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + projectileUserData.type + " " + projectileUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var ai = this.gs.aim.getAIAgentByID(AIAgentUserData.id);
		var c = this.gs.gom.getGameObjectByID(characterUserData.id);

		if(ai !== null && c !== null)
		{
			ai.characterExitedVision(c);
		}
	}


	// STOPPED HERE - just make the "character" body for every character the same. And just filter for the team on the aiagent level.


	beginAIAgentAiBodyCollision(AIAgentUserData, aiBodyUserData, contactObj, isAIAgentA)
	{
		//logger.log("info", 'begin character projectile Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + projectileUserData.type + " " + projectileUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var ai = this.gs.aim.getAIAgentByID(AIAgentUserData.id);
		var c = this.gs.gom.getGameObjectByID(aiBodyUserData.id);

		if(ai !== null && c !== null)
		{
			ai.aiBodyEnteredVision(c);
		}
	}

	endAIAgentAiBodyCollision(AIAgentUserData, aiBodyUserData, contactObj, isAIAgentA)
	{
		//logger.log("info", 'begin character projectile Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + projectileUserData.type + " " + projectileUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var ai = this.gs.aim.getAIAgentByID(AIAgentUserData.id);
		var c = this.gs.gom.getGameObjectByID(aiBodyUserData.id);

		if(ai !== null && c !== null)
		{
			ai.aiBodyExitedVision(c);
		}
	}

	////////////////////////
	// Castle collilsions //
	////////////////////////
	beginCastleProjectileCollision(castleUserData, projectileUserData, contactObj, isCastleA)
	{
		var c = this.gs.castleObject;
		var p = this.gs.gom.getGameObjectByID(projectileUserData.id);

		if(c !== null && p !== null)
		{
			var processDamage = true;

			//if the bullet is from a user, don't damage the castle
			if(p.ownerType === "user")
			{
				processDamage = false;
			}

			if(processDamage)
			{
				c.isHit(2);
			}

			//destroy the projectile
			p.timeLength = 0; //cheap and easy
		}
	}

	endCastleProjectileCollision(castleUserData, projectileUserData, contactObj, isCastleA)
	{
		
	}

	beginCastleUserCollision(castleUserData, userData, contactObj, isCastleA)
	{
		var ua = this.gs.uam.getUserAgentByID(userData.userAgentId);
		if(ua !== null)
		{
			ua.insertTrackedEntity("gameobject", castleUserData.id);
		}
	}

	endCastleUserCollision(castleUserData, userData, contactObj, isCastleA)
	{
		var ua = this.gs.uam.getUserAgentByID(userData.userAgentId);
		if(ua !== null)
		{
			ua.deleteTrackedEntity("gameobject", castleUserData.id);
		}
	}

	

	///////////////////////////
	// character collilsions //
	///////////////////////////
	beginCharacterCharacterCollision(characterUserData1, characterUserData2, contactObj, isCharacterA)
	{
		//logger.log("info", 'begin character character Collision: A: ' + characterUserData1.type + " " + characterUserData1.id + "==== B: " + characterUserData2.type + " " + characterUserData2.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var c1 = this.gs.gom.getGameObjectByID(characterUserData1.id);
		var c2 = this.gs.gom.getGameObjectByID(characterUserData2.id);

		if(c1 !== null && c2 !== null) {
			var processCollision = false;
	
			//team collision check (i only have a need to detect opposite teams...makes this part easier lol)
			if(c1.teamId !== c2.teamId && (c1.collideOtherTeamCharacters || c2.collideOtherTeamCharacters)) {
				processCollision = true;
			}
				
			if(processCollision) {
				c1.collisionCharacter(c2);
				c2.collisionCharacter(c1);
			}
		}

	}

	endCharacterCharacterCollision(characterUserData1, characterUserData2, contactObj, isCharacterA)
	{
		//logger.log("info", 'end character character Collision: A: ' + characterUserData1.type + " " + characterUserData1.id + "==== B: " + characterUserData2.type + " " + characterUserData2.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}


	beginCharacterProjectileCollision(characterUserData, projectileUserData, contactObj, isCharacterA)
	{
		//logger.log("info", 'begin character projectile Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + projectileUserData.type + " " + projectileUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var c = this.gs.gom.getGameObjectByID(characterUserData.id);
		var p = this.gs.gom.getGameObjectByID(projectileUserData.id);

		if(c !== null && p !== null) {
			var processCollision = false;
	
			//self collision check
			if(c.id === p.characterId) {
				if(p.collideSelf) {
					processCollision = true;
				}
			} 
			//team collision check
			else {
				if(p.collideSameTeamCharacters && p.teamId === c.teamId) {
					processCollision = true;
				}
				else if(p.collideOtherTeamCharacters && p.teamId !== c.teamId) {
					processCollision = true;
				}
			}
	
			if(processCollision) {
				p.collisionCharacter(c, characterUserData, projectileUserData, contactObj, isCharacterA);
				c.collisionProjectile(p, characterUserData, projectileUserData, contactObj, isCharacterA);
			}
		}
	}

	endCharacterProjectileCollision(characterUserData, projectileUserData, contactObj, isCharacterA)
	{
		//logger.log("info", 'end character projectile Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + projectileUserData.type + " " + projectileUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var c = this.gs.gom.getGameObjectByID(characterUserData.id);
		var p = this.gs.gom.getGameObjectByID(projectileUserData.id);

		if(c !== null && p !== null) {
			var processCollision = false;
	
			//self collision check
			if(c.id === p.characterId) {
				if(p.collideSelf) {
					processCollision = true;
				}
			} 
			//team collision check
			else {
				if(p.collideSameTeamCharacters && p.teamId === c.teamId) {
					processCollision = true;
				}
				else if(p.collideOtherTeamCharacters && p.teamId !== c.teamId) {
					processCollision = true;
				}
			}
	
			if(processCollision) {
				p.endCollisionCharacter(c, characterUserData, projectileUserData, contactObj, isCharacterA);
				c.endCollisionProjectile(p, characterUserData, projectileUserData, contactObj, isCharacterA);
			}
		}
	}


	beginCharacterWallCollision(characterUserData, wallUserData, contactObj, isCharacterA)
	{
		//logger.log("info", 'begin character wall Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	endCharacterWallCollision(characterUserData, wallUserData, contactObj, isCharacterA)
	{
		//logger.log("info", 'end character wall Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	beginCharacterUserCollision(characterUserData, userUserData, contactObj, isCharacterA)
	{
		//logger.log("info", 'begin character user Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + userUserData.type + " " + userUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);

		var ua = this.gs.uam.getUserAgentByID(userUserData.userAgentId);
		if(ua !== null)
		{
			ua.insertTrackedEntity("gameobject", characterUserData.id);
		}
	}

	endCharacterUserCollision(characterUserData, userUserData, contactObj, isCharacterA)
	{
		//logger.log("info", 'end character user Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + userUserData.type + " " + userUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);

		var ua = this.gs.uam.getUserAgentByID(userUserData.userAgentId);
		if(ua !== null)
		{
			ua.deleteTrackedEntity("gameobject", characterUserData.id);
		}
	}



	////////////////////////////
	// projectile collilsions //
	////////////////////////////
	beginProjectileProjectileCollision(projectileUserData1, projectileUserData2, contactObj, isProjectileA)
	{
		//logger.log("info", 'begin projectile wall Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var p1 = this.gs.gom.getGameObjectByID(projectileUserData1.id);
		var p2 = this.gs.gom.getGameObjectByID(projectileUserData2.id);

		if(p1 !== null && p2 !== null) {
			var p1Collision = false;
			var p2Collision = false;
	
			//p1 team collision check
			if(p1.collideSameTeamProjectiles && p1.teamId === p2.teamId) {
				p1Collision = true;
			}
			else if(p1.collideOtherTeamProjectiles && p1.teamId !== p2.teamId) {
				p1Collision = true;
			}

			//p2 team collision check
			if(p2.collideSameTeamProjectiles && p1.teamId === p2.teamId) {
				p2Collision = true;
			}
			else if(p2.collideOtherTeamProjectiles && p1.teamId !== p2.teamId) {
				p2Collision = true;
			}
	
			if(p1Collision) {
				p1.collisionProjectile(p2, projectileUserData1, projectileUserData2, contactObj, isProjectileA);
			}

			if(p2Collision) {
				p2.collisionProjectile(p1, projectileUserData1, projectileUserData2, contactObj, isProjectileA);
			}
		}
	}

	endProjectileProjectileCollision(projectileUserData1, projectileUserData2, contactObj, isProjectileA)
	{
		//logger.log("info", 'end projectile wall Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}


	beginProjectileWallCollision(projectileUserData, wallUserData, contactObj, isProjectileA)
	{
		var p = this.gs.gom.getGameObjectByID(projectileUserData.id);
		var w = this.gs.gom.getGameObjectByID(wallUserData.id);

		if(w !== null && p !== null) {
			var processCollision = true;
		
			//basically, only process the colilsion if BOTH the projectile and the wall allow the collision.
			if(!p.collideWalls || !w.collideProjectiles) {
				processCollision = false;
			}
		
			if(processCollision) {
				p.collisionWall(projectileUserData, wallUserData, contactObj, isProjectileA);
			}
		}
	}

	endProjectileWallCollision(projectileUserData, wallUserData, contactObj, isProjectileA)
	{
		//logger.log("info", 'end projectile wall Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	beginProjectileUserCollision(projectileUserData, userUserData, contactObj, isProjectileA)
	{
		//logger.log("info", 'begin projectile user Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + userUserData.type + " " + userUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);

		var ua = this.gs.uam.getUserAgentByID(userUserData.userAgentId);
		if(ua !== null)
		{
			ua.insertTrackedEntity("gameobject", projectileUserData.id);
		}
	}

	endProjectileUserCollision(projectileUserData, userUserData, contactObj, isProjectileA)
	{
		//logger.log("info", 'end projectile user Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + userUserData.type + " " + userUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);

		var ua = this.gs.uam.getUserAgentByID(userUserData.userAgentId);
		if(ua !== null)
		{
			ua.deleteTrackedEntity("gameobject", projectileUserData.id);
		}
	}

	//////////////////////
	// Wall collilsions //
	//////////////////////
	beginUserWallCollision(userUserData, wallUserData, contactObj, isWallA)
	{
		//logger.log("info", 'begin user wall Collision: A: ' + userUserData.type + " " + userUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isWallA: " + isWallA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var u = this.gs.um.getUserByID(userUserData.id);
		if(u !== null)
		{
			u.insertTrackedObject(wallUserData);
		}
		
	}

	endUserWallCollision(userUserData, wallUserData, contactObj, isWallA)
	{
		//logger.log("info", 'end user wall Collision: A: ' + userUserData.type + " " + userUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isWallA: " + isWallA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var u = this.gs.um.getUserByID(userUserData.id);
		if(u !== null)
		{
			u.deleteTrackedObject(wallUserData);
		}
	}
}

exports.CollisionSystem = CollisionSystem;
