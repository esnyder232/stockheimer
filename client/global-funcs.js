import $ from "jquery"

export default class GlobalFuncs {
	constructor(gc) {
		this.gc = gc;
	}

	
	//Helper function to register events to emitters in phaser.
	//scene - the scene
	//eventMapping - array of mappings for events
	// Each mapping needs the following format:
	// eventMapping = [
	// {
	//	 	event: 'progress',
	//	 	func: this.loadProgress
	//	 	target: this.sys.events,
	// },
	// {}...
	// ]
	//		event - the name of the event
	//		func - the function to call
	// 		target - the event emitter in phaser. Its usually scene.sys.events

	registerPhaserEvents(eventMapping) {
		for(var i = 0; i < eventMapping.length; i++)
		{
			eventMapping[i].target.on(eventMapping[i].event, eventMapping[i].func)
		}
	}

	//Helper function to unregister events from emitters in phaser. This is the opposite of GlobalFuncs.registerPhaserEvents().
	//This is to be called in the "shutdown" event.
	unregisterPhaserEvents(eventMapping) {
		for(var i = 0; i < eventMapping.length; i++)
		{
			eventMapping[i].target.off(eventMapping[i].event, eventMapping[i].func)
		}
	}

	//Helper function to register to custom events in the browser.
	//eventMapping - array of mappings for events
	// Each mapping needs the following format:
	// eventMapping = [
	// {
	//	 	event: 'my-custom-event',
	//	 	func: this.loadProgress
	// },
	// {}...
	// ]
	//		event - the name of the event
	//		func - the function to call

	registerWindowEvents(eventMapping) {
		for(var i = 0; i < eventMapping.length; i++)
		{
			window.addEventListener(eventMapping[i]["event"], eventMapping[i]["func"]);
		}
	}




	//Helper function to unregister custom events from the browser. 
	//This is meant to be paried with registerWindowsEvents function.
	//This is to be called in the "shutdown" event in phaser, but can be called anywhere when your down with the eventMapping.
	unregisterWindowEvents(eventMapping) {
		for(var i = 0; i < eventMapping.length; i++)
		{
			window.removeEventListener(eventMapping[i]["event"], eventMapping[i]["func"]);
		}
	}

	createAnimsFromAseprite(phaserGame, asepriteSpritesheetKey, asepriteJsonKey) {
		//console.log('now creating anims for ' + asepriteSpritesheetKey);
		//console.log(phaserGame);

		//find the aseprite json file to parse from
		var json = phaserGame.cache.json.get(asepriteJsonKey);
		var anims = phaserGame.anims;

		//console.log(sprite);
		// console.log(anims);

		//parse through the frameTags for the animations and create an animation for each one
		for(var i = 0; i < json.meta.frameTags.length; i++) {
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

	removeAnimsFromAseprite(phaserGame, asepriteSpritesheetKey, asepriteJsonKey) {
		//console.log('now removing anims for ' + asepriteSpritesheetKey + ", " + asepriteJsonKey);

		//find the aseprite json file to parse from
		
		var json = phaserGame.cache.json.get(asepriteJsonKey);
		var anims = phaserGame.anims;

		//console.log(sprite);
		// console.log(anims);

		//parse through the frameTags for the animations and create an animation for each one
		if(json !== undefined) {
			for(var i = 0; i < json.meta.frameTags.length; i++) {
				var f = json.meta.frameTags[i];
				var key = asepriteSpritesheetKey + "-" + f.name;

				anims.remove(key);
			}
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

	//if the object is an array, it returns it. Otherwise, it returns a blank array.
	getDataArray(arr) {
		return Array.isArray(arr) ? arr : [];
	}

	//if the object is a json object, it returns it. Otherwise it returns a blank object.
	getDataObject(obj) {
		return typeof obj === 'object' ? obj : {};
	}

	//this gets the specific object from the data array. Returns a blank object otherwise.
	getDataObjectFromArray(arr, i) {
		var result = {};

		if(Array.isArray(arr) && arr.length > i)
		{
			result = arr[i];
		}

		return result;
	}

	//https://stackoverflow.com/questions/511761/js-function-to-get-filename-from-url/48554885
	//sick
	getFilenameFromUrl(url) {
		return url.split('/').pop();
	}
	

	
	appendToLog(msg) {		
		var timestamp = new Date().toLocaleTimeString('en-US', {hour12: false});
		var msgWithTimestamp = timestamp + ": " + msg;

		console.log(msgWithTimestamp);

		var s = document.createElement('div');
		s.textContent = msgWithTimestamp;

		var log = $("#debug-log")[0];
		log.appendChild(s)
		log.scrollTop = log.scrollHeight;
		
	}

	//https://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
	isNumeric(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}

	
	//Helper function used to check if a nested value in a root object is not undefined or null.
	//The null conditional operator is not yet implemented in Node as of the current version I'm using. So this is a quick hacky function to accomplish the same thing.
	nestedValueCheck(root, strNestedValue) {
		// console.log('inside prop check');
		// console.log(strNestedValue);

		var propsSplit = strNestedValue.split(".");
		var propExists = false;
		
		if(root) {
			propExists = true;
		}

		if(propExists) {
			var context = root;
			for(var i = 0; i < propsSplit.length; i++) {
				var nextContext = context[propsSplit[i]];
				if(nextContext === undefined || nextContext === null) {
					propExists = false;
					break;
				}
				else {
					context = nextContext;
				}
			}
		}
		return propExists;
	}

	getValueDefault(value, defaultValue) {
		var retVal = null;
		if(value === undefined || value === null) {
			retVal = (defaultValue === undefined) ? null : defaultValue;
		}
		else {
			retVal = value;
		}

		return retVal;
	}
	
	
	clamp(num, min, max) {
		return Math.min(Math.max(num, min), max);
	};

	//this builds a string for glsl shaders. The output will be in this format:
	// "vec4(r.0/255.0, g.0/255.0, b.0/255.0, a.0/255.0)"
	glslBuildVec4RGBA(r, g, b, a) {
		if(typeof r !== "number") {r = 0;};
		if(typeof g !== "number") {g = 0;};
		if(typeof b !== "number") {b = 0;};
		if(typeof a !== "number") {a = 255;};

		var vec4Final = "";
		var vec4InternalStr = "";
		var vec4InternalArr = [];

		vec4InternalArr.push(r.toString() + ".0/255.0");
		vec4InternalArr.push(g.toString() + ".0/255.0");
		vec4InternalArr.push(b.toString() + ".0/255.0");
		vec4InternalArr.push(a.toString() + ".0/255.0");
		vec4InternalStr = vec4InternalArr.join(", ");

		vec4Final = "vec4(" + vec4InternalStr + ")";
		return vec4Final;
	}
	
	chatMessageValidation(chatMsg) {
		var isValidated = true;
		if(chatMsg.length > this.gc.gameConstants.Chat["MAX_CHAT_LENGTH_CHAR"]) {
			isValidated = false;
		}

		return isValidated;
	}
}