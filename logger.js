/*
	Stockheimer uses winston for logging stuff. 
	This "logger.js" file is just a global file for other files to require to get the logger created.
*/
const {createLogger, format, transports} = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const {combine, timestamp, printf} = format;
const serverConfig = require('./server/server-config.json');

var logger = null;

const myFormat = printf(({level, message, timestamp}) => {
	return `${timestamp} ${level}: ${message}`;
})

var myTransport = new transports.DailyRotateFile({
	filename: 'stockheimer-log_%DATE%.log',
	datePattern: 'YYYY-MM-DD',
	zippedArchive: false,
	dirname: serverConfig.log_dir_fullpath
})

myTransport.on("rotate", (oldFilename, newFilename) => {
	console.log("Rotating files now from '" + oldFilename + "' to '" + newFilename + "'.");
})

//rotate transport test
logger = createLogger({
	level: serverConfig.log_level,
	format: combine(
		timestamp(),
		myFormat
	),
	defaultMeta: {service: 'user-service'},
	transports: [
		myTransport,
		new transports.Console()
	],
});

logger.log("info", "Winston logger started.");

module.exports = logger;