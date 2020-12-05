# stockheimer

To run server on your computer:
 - git clone https://github.com/esnyder232/stockheimer
 - cd into the directory
 - npm install
 - npm run build-prod
 - node index.js

At this point, the console should show "Webserver listening on port 7000" somewhere in the console logs. That means the game is running.
Open a browser to "localhost:7000", and you should see the game.

This project is built and ran on:
npm version: 6.13.4
node version: 12.14.1

-------------------------------------------------------------

If you get any errors on the "npm run build-prod" step, such as "SyntaxError: Unexpected token {..." or anything like that, its possible your node/npm version is too far away from my version.
The only thing I can suggest at this point is to either upgrade/downgrade your node version to 12.14.1 or somewhere close to it.
This is totally your call, because I have had troubles in the past when updating node/npm and it broke previous projects.
