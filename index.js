const express = require('express');
const path = require('path');
const websocket = require('ws');
const cookieParser = require('cookie-parser');
const {GameServer} = require("./server/game-server.js");
const serverConfig = require('./server/server-config.json');
const {GlobalFuncs}= require('./server/global-funcs.js');
const logger = require("./logger.js");

const globalfuncs = new GlobalFuncs();
const app = express();
const port = 7000;


//create headless websocket server
const wssConfig = {
	noServer: true,
	clientTracking: true
}

const wss = new websocket.Server(wssConfig);

//create http server
const expressServer = app.listen(port, () => {logger.log("info", 'Webserver listening on port ' + port)});

//make the game server
var gs = new GameServer();
gs.init();
gs.startGame();

//add middleware to pipeline
app.use(express.json()); //for parsing application/json
app.use(express.urlencoded({extended: false})); //for parsing application/x-www-form-urlencoded
app.use(cookieParser(serverConfig.session_cookie_secret)); //for sessions

//adding basic http endpoints
app.get('/', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/index.html', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});

//static files
app.use('/assets', express.static(path.join(__dirname, "assets")));
app.use('/client-dist', express.static(path.join(__dirname, "client-dist")));
app.use('/css', express.static(path.join(__dirname, "css")));
app.use('/shared_files', express.static(path.join(__dirname, "shared_files")));
app.use('/changelog', express.static(path.join(__dirname, "CHANGELOG.md")));
app.use('/changelog.md', express.static(path.join(__dirname, "CHANGELOG.md")));
app.use('/my-test.txt', express.static(path.join(__dirname, "my-test.txt")));


//other apis
app.get('/api/get-user-session', gs.getUserSession.bind(gs));
app.get('/api/get-server-details', gs.getServerDetails.bind(gs));
app.post('/api/join-request', gs.joinRequest.bind(gs));
app.post('/api/clear-user-session', gs.clearUserSession.bind(gs));
app.get('/api/get-resources', gs.getFesources.bind(gs));




//create http upgrade endpoint to do websocket handshake
expressServer.on('upgrade', (req, socket, head) => {
	var authResult = gs.wsAuthenticate(req, socket, head);

	//something bad happened in authentication process. Destroy socket and cancel the connection process.
	if(authResult.bError)
	{
		logger.log("info", "Error when authenticating: " + authResult.errorMessage);
		//logger.log("info", 'destorying socket now');
		socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); //I don't know how to send "result.userMessage" back. So I'll just send unauthorized for now.
		return;
	}
	//user is authenticated and is in result
	else
	{
		//let the game server handle the websocket callbacks
		//logger.log("info", 'handling updgrade');
		return wss.handleUpgrade(req, socket, head, gs.onopen.bind(gs, authResult.user));
	}
})




