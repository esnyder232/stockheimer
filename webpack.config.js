const commonConfig = require('./webpack.common.js');
const productionConfig = require('./webpack.prod.js');
const developmentConfig = require('./webpack.dev.js');
const {merge} = require('webpack-merge');

module.exports = env => {
	console.log('env is: ' + env.env);
  	switch(env.env) {
    	case 'dev':
		console.log('Using dev webpack config (merging webpack.common.js and webpack.dev.js)')
      	return merge(commonConfig, developmentConfig);
	default:
		console.log('Using prod webpack config (merging webpack.common.js and webpack.prod.js)')
		return merge(commonConfig, productionConfig);
  }
}