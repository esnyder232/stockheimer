const commonConfig = require('./webpack.common.js');
const productionConfig = require('./webpack.prod.js');
const developmentConfig = require('./webpack.dev.js');
const {merge} = require('webpack-merge');
const logger = require("./logger.js");

module.exports = env => {
	logger.log("info", 'env is: ' + env.env);
  	switch(env.env) {
    	case 'dev':
		logger.log("info", 'Using dev webpack config (merging webpack.common.js and webpack.dev.js)')
      	return merge(commonConfig, developmentConfig);
	default:
		logger.log("info", 'Using prod webpack config (merging webpack.common.js and webpack.prod.js)')
		return merge(commonConfig, productionConfig);
  }
}