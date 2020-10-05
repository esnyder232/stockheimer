const path = require('path');
const webpack = require('webpack');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
	mode: 'production',
	entry: {
		app: './client/client.js'
	},
	output: {
		path: path.resolve(__dirname, 'client-dist'),
		filename: '[name].bundle.js'
	},
	plugins: [
		new CleanWebpackPlugin(),
		new webpack.DefinePlugin({
			'typeof CANVAS_RENDERER': JSON.stringify(true),
			'typeof WEBGL_RENDERER': JSON.stringify(true)
		})
	],
	devServer: {
		contentBase: path.join(__dirname, 'dist'),
		hot: false,
		liveReload: false
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				commons: {
					test: /[\\/]node_modules[\\/]/,
					name: 'vendors',
					chunks: 'all'
				}
			}
		}
	}
}


