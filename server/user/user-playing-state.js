const {UserBaseState} = require('./user-base-state.js');
const {UserDisconnectingState} = require('./user-disconnecting-state.js');
const {CollisionCategories, CollisionMasks} = require('../data/collision-data.js');
const logger = require('../../logger.js');
const ServerConfig = require("../server-config.json");

class UserPlayingState extends UserBaseState {
	constructor(user) {
		super(user);
		this.stateName = "user-playing-state";
	}

	enter(dt) {
		//logger.log("info", this.stateName + ' enter');
		this.user.stateName = this.stateName;

		this.user.gs.um.userStartPlayingId(this.user.id, this.user.userPostStartPlaying());
		const pl = this.user.gs.pl;
		const Vec2 = pl.Vec2;

		//create a tracking sensor
		var trackingSensor = pl.Circle(Vec2(0, 0), 100);

		this.user.plBody = this.user.gs.world.createBody({
			position: Vec2(15, -15),
			type: pl.Body.DYNAMIC,
			fixedRotation: true,
			userData: {type:"user", id: this.user.id, userAgentId: this.user.userAgentId}
		});

		this.user.plBody.createFixture({
			shape: trackingSensor,
			density: 0.0,
			friction: 1.0,
			isSensor: true,
			filterCategoryBits: CollisionCategories["user_sensor"],
			filterMaskBits: CollisionMasks["user_sensor"]
		});

		//if the name is "beepboop", create an ai for it
		if(ServerConfig.allow_simulated_user_ai_agents && this.user.username.indexOf("beepboop") === 0) {
			logger.log("info", "Detected a 'beepboop'. Applying ai controls to user '" + this.user.username + "'");
			var aiAgent = this.user.gs.aim.createAIAgent();
			aiAgent.aiAgentInit(this.user.gs, this.user.id);
			var team = this.globalfuncs.getRandomOpenTeam(this.user.gs);

			this.user.updateTeamId(team.id);
		}
		

		super.enter(dt);
	}

	update(dt) {
		super.update(dt);

		//make the camera follow the character if it exists. If it doesn't allow the camera to be moved around freely


		if(this.user.bDisconnected)
		{
			this.user.nextState = new UserDisconnectingState(this.user);
		}
	}

	exit(dt) {
		//logger.log("info", this.stateName + ' exit');
		if(this.plBody !== null)
		{
			this.user.gs.world.destroyBody(this.user.plBody);
			this.user.plBody = null;
		}
		super.exit(dt);
	}
}



exports.UserPlayingState = UserPlayingState;