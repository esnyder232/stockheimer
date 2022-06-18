const {GlobalFuncs} = require('../global-funcs.js');
const logger = require('../../logger.js');

//This system is mainly to calculate values that would be more efficient to cache and retrieve later, such as LOS and "distance squared" calculations.
//This was intended only for the ai consideration calculations, but can really be used for anything.
class CachingSystem {
	constructor() {
		this.gs = null;
		this.globalfuncs = new GlobalFuncs();
		this.cache = {};
		this.pruneTimer = 1000;
		this.pruneTimerAcc = 0;
		this.pruneTtlMs = 3000;
		this.cacheKeyLength = 0; //for reporting purposes

		// this.cacheExample = {
		// 	"calcLOS=123=456": 	{res:0.5, ts:77777},
		// 	"calcLOS=123=333": 	{res:0.5, ts:77777},
		// 	"calcLOS=98=123": 	{res:0.5, ts:77777},
		// 	"calcLOS=98=123":	 	{res:0.5, ts:77777},
		// 	"calcLOS=33=44":	 	{res:0.2, ts:88888},
		// 	"calcLOS=22=45":	 	{res:0.8, ts:88998},
		// 	"calcHPPerc=123": 		{res:0.5, ts:77777},
		// 	"calcHPPerc=33":	 	{res:0.2, ts:88888},
		// 	"calcHPPerc=22":	 	{res:0.8, ts:88998},
		// 	"calcCpOwnedByTeam=123=5": 		{res:0.5, ts:77777},
		// 	"calcCpOwnedByTeam=123=6": 		{res:0.5, ts:77777},
		// 	"calcCpOwnedByTeam=123=7": 		{res:0.5, ts:77777},
		// 	"calcCpOwnedByTeam=33=6":	 	{res:0.2, ts:88888},
		// 	"calcCpOwnedByTeam=22=7":	 	{res:0.8, ts:88998}
		// }
	}

	init(gs) {
		this.gs = gs;
	}

	//clears all cached values
	clearCache() {
		this.cache = {};
		this.cacheKeyLength = 0;
	}

	setCacheValue(key, value) {
		// console.log("CACHE: setting cache value for: " + key + ", " + value);
		var cacheObj = this.cache[key];
		if(cacheObj === undefined) {
			this.cache[key] = new CacheEntry();
			this.cacheKeyLength++;
		}

		this.cache[key].key = key;
		this.cache[key].ts = this.gs.currentTick;
		this.cache[key].value = value;

		
	}

	getCacheValue(key) {
		
		var result = this.cache[key];
		if(result === undefined) {
			result = null;
		} 

		// console.log("CACHE: get cache value for: " + key + ", " + result);
		return result;
	}

	pruneCache() {
		//for now, just loop through EVERY entry in the cache and check the TTL
		var tsCutoff = this.gs.currentTick - this.pruneTtlMs;

		var keysToRemove = [];
		//loop through the cached entry params (the key)
		for (const key in this.cache) {
			if (this.cache.hasOwnProperty(key)) {
				var ce = this.cache[key];
				if(ce.ts <= tsCutoff) {
					keysToRemove.push(key);
				}
			}
		}
		
		//remote the keys in the cache
		for(var i = 0; i < keysToRemove.length; i++) {
			// console.log("CACHE: Found old key: " + keysToRemove[i]);
			delete this.cache[keysToRemove[i]];
			this.cacheKeyLength--;
		}
	}
	
	update(dt) {
		this.pruneTimerAcc += dt;

		if(this.pruneTimerAcc >= this.pruneTimer){
			this.pruneTimerAcc = 0;

			this.pruneCache();
		}
	}
}

class CacheEntry {
	key = "";
	ts = 0;
	value = null;
}

exports.CachingSystem = CachingSystem;