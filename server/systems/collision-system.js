const {GlobalFuncs} = require('../global-funcs.js');

class CollisionSystem {
	constructor() {
		this.gs = null;
		this.globalfuncs = new GlobalFuncs();

		this.colList = []; //permutations of collision types
		this.colFullTypeIndex = {}; //index of colList based on type1 + type2 (fullType)
	}

	init(gs) {
		this.gs = gs;

		this.colList = [
			// {type1: "character", 	type2:"character", 	beginFunc: this.beginCharacterCharacterCollision.bind(this), 	endFunc: this.endCharacterCharacterCollision.bind(this)},
			// {type1: "character", 	type2:"projectile", beginFunc: this.beginCharacterProjectileCollision.bind(this), 	endFunc: this.endCharacterProjectileCollision.bind(this)},
			// {type1: "character", 	type2:"wall", 		beginFunc: this.beginCharacterWallCollision.bind(this), 		endFunc: this.endCharacterWallCollision.bind(this)},
			{type1: "character", 	type2:"user", 		beginFunc: this.beginCharacterUserCollision.bind(this), 		endFunc: this.endCharacterUserCollision.bind(this)},
			//{type1: "projectile", 	type2:"projectile", beginFunc: this.beginProjectileProjectileCollision.bind(this), 	endFunc: this.endProjectileProjectileCollision.bind(this)},
			{type1: "projectile", 	type2:"user", 		beginFunc: this.beginProjectileUserCollision.bind(this), 		endFunc: this.endProjectileUserCollision.bind(this)},
			//{type1: "projectile", 	type2:"wall", 		beginFunc: this.beginProjectileWallCollision.bind(this), 		endFunc: this.endProjectileWallCollision.bind(this)},
			//{type1: "user", 	type2:"wall", 			beginFunc: this.beginUserWallCollision.bind(this), 				endFunc: this.endUserWallCollision.bind(this)}
		]

		//calculate fullType and make index
		for(var i = 0; i < this.colList.length; i++)
		{
			this.colList[i].fullType = this.colList[i].type1 + this.colList[i].type2;
			this.colFullTypeIndex[this.colList[i].fullType] = this.colList[i];
		}

		//register callbacks with planck
		this.gs.world.on("begin-contact", this.handleBeginCollision.bind(this));
		this.gs.world.on("end-contact", this.handleEndCollision.bind(this));
	}


	handleBeginCollision(contactObj)
	{
		//console.log('beginContact!');

		//first, we need to get the user data objects from the collision so we know what types of game objects collided
		var uda = contactObj.getFixtureA().getBody().getUserData();
		var udb = contactObj.getFixtureB().getBody().getUserData();

		if(uda !== null && udb !== null)
		{
			uda.origIndex = 0; //used for sorting later
			udb.origIndex = 1; //used for sorting later

			var udArray = [uda, udb];

			//sort types alphabetically
			udArray = udArray.sort((a, b) => {
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
		//console.log('endContact!');

		//first, we need to get the user data objects from the collision so we know what types of game objects collided
		var uda = contactObj.getFixtureA().getBody().getUserData();
		var udb = contactObj.getFixtureB().getBody().getUserData();

		if(uda !== null && udb !== null)
		{
			uda.origIndex = 0; //used for sorting later
			udb.origIndex = 1; //used for sorting later

			var udArray = [uda, udb];

			//sort types alphabetically
			udArray = udArray.sort((a, b) => {
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


	///////////////////////////
	// character collilsions //
	///////////////////////////
	beginCharacterCharacterCollision(characterUserData1, characterUserData2, contactObj, isCharacterA)
	{
		//console.log('begin character character Collision: A: ' + characterUserData1.type + " " + characterUserData1.id + "==== B: " + characterUserData2.type + " " + characterUserData2.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	endCharacterCharacterCollision(characterUserData1, characterUserData2, contactObj, isCharacterA)
	{
		//console.log('end character character Collision: A: ' + characterUserData1.type + " " + characterUserData1.id + "==== B: " + characterUserData2.type + " " + characterUserData2.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}


	beginCharacterProjectileCollision(characterUserData, projectileUserData, contactObj, isCharacterA)
	{
		//console.log('begin character projectile Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + projectileUserData.type + " " + projectileUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	endCharacterProjectileCollision(characterUserData, projectileUserData, contactObj, isCharacterA)
	{
		//console.log('end character projectile Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + projectileUserData.type + " " + projectileUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}


	beginCharacterWallCollision(characterUserData, wallUserData, contactObj, isCharacterA)
	{
		//console.log('begin character wall Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	endCharacterWallCollision(characterUserData, wallUserData, contactObj, isCharacterA)
	{
		//console.log('end character wall Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	beginCharacterUserCollision(characterUserData, userUserData, contactObj, isCharacterA)
	{
		//console.log('begin character user Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + userUserData.type + " " + userUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var u = this.gs.um.getUserByID(userUserData.id);
		if(u !== null)
		{
			u.insertTrackedEntity("gameobject", characterUserData.id);
		}
	}

	endCharacterUserCollision(characterUserData, userUserData, contactObj, isCharacterA)
	{
		//console.log('end character user Collision: A: ' + characterUserData.type + " " + characterUserData.id + "==== B: " + userUserData.type + " " + userUserData.id + "=== ischaracterA: " + isCharacterA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var u = this.gs.um.getUserByID(userUserData.id);
		if(u !== null)
		{
			u.deleteTrackedEntity("gameobject", characterUserData.id);
		}
	}



	////////////////////////////
	// projectile collilsions //
	////////////////////////////
	beginProjectileWallCollision(projectileUserData, wallUserData, contactObj, isProjectileA)
	{
		//console.log('begin projectile wall Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	endProjectileWallCollision(projectileUserData, wallUserData, contactObj, isProjectileA)
	{
		//console.log('end projectile wall Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
	}

	beginProjectileUserCollision(projectileUserData, userUserData, contactObj, isProjectileA)
	{
		//console.log('begin projectile user Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + userUserData.type + " " + userUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var u = this.gs.um.getUserByID(userUserData.id);
		if(u !== null)
		{
			u.insertTrackedEntity("gameobject", projectileUserData.id);
		}
	}

	endProjectileUserCollision(projectileUserData, userUserData, contactObj, isProjectileA)
	{
		//console.log('end projectile user Collision: A: ' + projectileUserData.type + " " + projectileUserData.id + "==== B: " + userUserData.type + " " + userUserData.id + "=== isProjectileA: " + isProjectileA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var u = this.gs.um.getUserByID(userUserData.id);
		if(u !== null)
		{
			u.deleteTrackedEntity("gameobject", projectileUserData.id);
		}
	}

	//////////////////////
	// Wall collilsions //
	//////////////////////
	beginUserWallCollision(userUserData, wallUserData, contactObj, isWallA)
	{
		//console.log('begin user wall Collision: A: ' + userUserData.type + " " + userUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isWallA: " + isWallA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var u = this.gs.um.getUserByID(userUserData.id);
		if(u !== null)
		{
			u.insertTrackedObject(wallUserData);
		}
		
	}

	endUserWallCollision(userUserData, wallUserData, contactObj, isWallA)
	{
		//console.log('end user wall Collision: A: ' + userUserData.type + " " + userUserData.id + "==== B: " + wallUserData.type + " " + wallUserData.id + "=== isWallA: " + isWallA + " === fixtureA type: " + contactObj.getFixtureA().getBody().getUserData().type);
		var u = this.gs.um.getUserByID(userUserData.id);
		if(u !== null)
		{
			u.deleteTrackedObject(wallUserData);
		}
	}
}

exports.CollisionSystem = CollisionSystem;
