var tempGlobalMessages = [];

export default class GlobalFuncs {
	constructor() {
		this.tempGlobalMessages = tempGlobalMessages;
	}

	
	//Helper function to register events to emitters in phaser.
	//scene - the scene
	//eventMapping - array of mappings for events
	// Each mapping needs the following format:
	// eventMapping = [
	// {
	//	 	target: this.load,
	//	 	event: 'progress',
	//	 	delegate: this.loadProgress
	// },
	// {}...
	// ]
	// 		target - the event emitter in phaser
	//		event - the name of the event
	//		delegate - the delegate to call

	registerEvents(scene, eventMapping) {
		for(var i = 0; i < eventMapping.length; i++)
		{
			eventMapping[i].target.on(eventMapping[i].event, eventMapping[i].delegate)
		}
	}

	//Helper function to unregister events from emitters in phaser. This is the opposite of GlobalFuncs.registerEvents().
	//This is to be called in the "shutdown" event.
	unregisterEvents(scene, eventMapping) {
		for(var i = 0; i < eventMapping.length; i++)
		{
			eventMapping[i].target.off(eventMapping[i].event, eventMapping[i].delegate)
		}
	}

	createSceneAnimsFromAseprite(scene, asepriteSpritesheetKey, asepriteJsonKey) {
		//find the aseprite json file to parse from
		var json = scene.cache.json.get(asepriteJsonKey);
		var anims = scene.anims;

		//parse through the frameTags for the animations and create an animation for each one
		for(var i = 0; i < json.meta.frameTags.length; i++)
		{


			var f = json.meta.frameTags[i];
			var key = asepriteSpritesheetKey + "-" + f.name;
			var frames = anims.generateFrameNumbers(asepriteSpritesheetKey, {start: f.from, end: f.to});
			var animObject = {
				key: key,
				frames: frames,
				frameRate: 24,
				repeat: -1
			}

			//console.log(animObject);
			anims.create(animObject);
		}
	}

	//9/10/2020 - This is to fix the arcade sprite when the sprite is created in the update function instead of the create function.
	//This basically realligns the sprite body's hitbox so it doesn't get out of sync with the sprite game object.
	//You only need to call this once, and only after you create the sprite with this.scene.add.sprite(...);
	//This also works with images. 
	//If you need to set the size, scale, and offset of the body on creation, do it after you create the sprite and THEN call this function.
	/*Ex:
		var s = this.scene.physics.add.sprite(50, 50, "spritesheethere", 0);

		s.body.setOffset(5, 5);
		s.setScale(2, 1);
		s.body.setSize(10, 19, false);

		arcadeSpriteFix(s);
	*/
	arcadeSpriteFix(arcadeSprite) {
		var newx = arcadeSprite.x - (0.5 * arcadeSprite.displayWidth) + (arcadeSprite.scaleX * arcadeSprite.body.offset.x);
		var newy = arcadeSprite.y - (0.5 * arcadeSprite.displayHeight) + (arcadeSprite.scaleY * arcadeSprite.body.offset.y);

		arcadeSprite.body.position.x = newx;
		arcadeSprite.body.position.y = newy;
		arcadeSprite.body.prev.x = newx;
		arcadeSprite.body.prev.y = newy;
		arcadeSprite.body.prevFrame.x = newx;
		arcadeSprite.body.prevFrame.y = newy;
		arcadeSprite.body.transform.scaleX = arcadeSprite.scaleX;
		arcadeSprite.body.transform.scaleY = arcadeSprite.scaleY;
		arcadeSprite.body.width = Math.floor(arcadeSprite.body.width * arcadeSprite.scaleX);
		arcadeSprite.body.height = Math.floor(arcadeSprite.body.height * arcadeSprite.scaleY);
	}

}