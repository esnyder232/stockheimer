export default class CharacterClassState {
	constructor(gameClient, character, characterClassStateResource, timeAcc) {
		this.gc = gameClient;
		this.character = character;
		this.characterClassStateResource = characterClassStateResource;
		this.timeAcc = timeAcc;
		this.isIdleState = true;

		//Animation data
		this.animationSetKey = "idle";
		this.timeLength = 1000;
		this.repeatNum = -1;
		this.frameTagDirection = "frameTagDown";
		this.isFrameTagDirectionDirty = false;
		this.isAnimationSetKeyDirty = false;
		this.preserveAnimationProgress = false;
		this.canLook = false;
		this.cooldownTimeLength = 0;
	}

	enter(dt) {
		

		//if the resource is null, it is the "idle or moving" state
		if(this.characterClassStateResource === null) {
			this.isIdleState = true;
			this.animationSetKey = "idle";
			this.timeLength = 800;
			this.repeatNum = -1;
			this.preserveAnimationProgress = false;
			this.frameTagDirection = "frameTagDown";
		} 
		//other wise, its likely an "attacking" state of some kind.
		else {
			//get data from resource
			this.isIdleState = false;
			this.animationSetKey = this.gc.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.animationSet, this.animationSetKey);
			this.timeLength = this.gc.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.timeLength, this.timeLength);
			this.cooldownTimeLength = this.gc.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.cooldownTimeLength, this.cooldownTimeLength);
			this.canLook = this.gc.globalfuncs.getValueDefault(this?.characterClassStateResource?.data?.canLook, this.canLook);
			this.repeatNum = 0;
			this.preserveAnimationProgress = true;
			this.frameTagDirection = "frameTagDown";
			
			//Major Hack reporting in, sir!
			if(this.cooldownTimeLength >= 1500) {
				this.character.showCooldownGraphics(this.cooldownTimeLength);
			}
		}

		this.updateLookDirection();
		this.setSpriteGraphics(true);
		
	}

	update(dt) {

		if(this.isIdleState || this.canLook) {
			this.updateLookDirection();
			this.updateAnimationSetKey();

			if(this.isFrameTagDirectionDirty || this.isAnimationSetKeyDirty) {
				this.setSpriteGraphics();
				this.isFrameTagDirectionDirty = false;
				this.isAnimationSetKeyDirty = false;
			}
		}
		else {

		}
		
	}

	exit(dt) {
		//nothing else for now

		//deinitializing
		this.character = null;
		this.gc = null;
		this.characterClassStateResource = null;
	}

	updateLookDirection() {
		var xDirection = 0;
		var yDirection = 0;

		//if its the idle state and its this client's character, use the client's sight line (animation is smoother that way to the player)
		if(this.isIdleState && this.character.gc.myCharacter !== null && this.character.id === this.character.gc.myCharacter.id) {
			xDirection = Math.cos(this.character.gc.mainScene.angle);
			yDirection = Math.sin(-this.character.gc.mainScene.angle);
		} else {
			xDirection = Math.cos(this.character.serverCharacterDirection);
			yDirection = Math.sin(-this.character.serverCharacterDirection);
		}
		var newFrameTagDirection = this.frameTagDirection;
		

		//yup, this. There is a probably a better way to do this though. One that doesn't require any if statements.
		if(xDirection >= 0.707) {
			newFrameTagDirection = "frameTagRight";
		} else if (xDirection <= -0.707) {
			newFrameTagDirection = "frameTagLeft";
		} else if (yDirection >= 0.707) {
			newFrameTagDirection = "frameTagUp";
		} else {
			newFrameTagDirection = "frameTagDown";
		}

		//see if the direction of the sprite needs to change
		if(this.frameTagDirection !== newFrameTagDirection) {
			this.frameTagDirection = newFrameTagDirection;
			this.isFrameTagDirectionDirty = true;
		}
	}

	//this just checks to see if the animation should be "idle" or "move"
	updateAnimationSetKey() {
		var isInputPressed = this.character.clientInputs.up.state || this.character.clientInputs.down.state || this.character.clientInputs.left.state || this.character.clientInputs.right.state;

		if(this.animationSetKey == "idle" && isInputPressed) {
			this.animationSetKey = "move";
			this.isAnimationSetKeyDirty = true;
		}
		else if(this.animationSetKey == "move" && !isInputPressed) {
			this.animationSetKey = "idle";
			this.isAnimationSetKeyDirty = true;
		}
	}

	setSpriteGraphics(forceRestartProgress) {
		var spriteKey = this?.character?.characterClassResource?.data?.animationSets?.[this.animationSetKey]?.spriteKey;
		var frameTag = this?.character?.characterClassResource?.data?.animationSets?.[this.animationSetKey]?.[this.frameTagDirection];
		var progress = this.character.spriteGraphics.anims.getProgress();
		var msPerFrame = 1000;

		this.character.spriteGraphics.anims.play(spriteKey + "-" + frameTag);
		
		//calculate msPerFrame by the new animation playing and timeLength
		var totalFrames = this.character.spriteGraphics.anims.getTotalFrames();
		if(totalFrames > 0) {
			msPerFrame = this.timeLength/totalFrames;

			this.character.spriteGraphics.anims.msPerFrame = msPerFrame;
			this.character.spriteGraphics.anims.setRepeat(this.repeatNum);
			
			if(!forceRestartProgress && this.preserveAnimationProgress) {
				this.character.spriteGraphics.anims.setProgress(progress);
			}
			else{
				this.character.spriteGraphics.anims.restart();
			}			
		}
	}
}
