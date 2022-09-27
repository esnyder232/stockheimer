# Change log

## Version - 2022.9.27
* Chat message validation added to server and client side.
  - Finally was able to add chat message validation. Max character length is currently 400 characters.


## Version - 2022.9.27
* Packet validation added to server side. 
  - This decreases the severity of someone fuzzing the packets and sending garbage to the server.
  - This is also even MORE preparation for chat message validation.


## Version - 2022.9.25
* Fragment validation added to server side. 
  - This decreases the severity of someone fuzzing the packets and sending garbage to the server.
  - This is also for preparation for chat message validation.


## Version - 2022.9.24
* Too many things have changed. I have been working on it on/off for the past year or so. Here is the gist of it:
* More map modes
  - Elimination - Teams have rounds to kill each other. The team with the surviving members at the end of the time limit wins.
  - Deathmatch - Teams have rounds to kil leach other. The team with the most points at the end of the time limit wins.
  - King of the Hill - Teams must capture the point and stay in control of it for the alotted time to win.
* More maps
  - Island Map - Elimination
  - KOTH Map - king of the hill
* More classes
  - Defender class added. 
    - Primary Fire - small fireball
	- Secondary Fire - Shield that blocks enemies shots. Can also move enemies around.
* Better AI
  - Turned off the old AI, and implemented a Utility AI system (still a little janky, but its still better than the old one)
  - Each slime will get its own AI based on the map and prioritize different goals. In general:
    - Small/Med slimes - will fire at the closest enemy, while running away from any enemy that gets too close.
	- Large slime - will fire at closest enemy, while running away from enemies if it loses too muich HP.
	- Fighter slime - will target the closest enemy and attack. Usually doesn't run away.
	- Healer slime - will try to stay near the slime with the largest max HP. Tries to prioritize heals between the max HP slime and lowest HP slimes.
	- Defender slime - not implemented.
* Other changes
  - Teammates can now move through each other, but not through enemies. 
  - Implemented a caching system for the Utility AI. Could use it for other things though.


## Version - 2021.5.19
* Lots of logic added
  - Rounds added
    - Each round lasts for 1 minute. The team with the most points at the end of the round wins.
    - A round results screen is shown at the end of each round, then the round resets.
  - Respawn Timer added to top of screen
  - Teams Added
  - AI Users
    - Users can now controlled with AI agents. This is used to make AI "users" log in and play the game.
* Some things removed
  - Removed PvP flag on characters (obsolete)
  - Removed most debug buttons at the bottom of the screen
* Front end updates
  - Added Lerping to characters on front end (smoother walking for characters)
  - Killfeed added to top right of screen
  - User connection and disconnection messages show up in chat now.
  - Changed Projectile colors to match team color
  - User list updated
    - now sorts based on points descending, then deaths descending. Also categorizes based on team.
  - Added really professional control instructions to panel

## Version - 2021.3.29
* Lots of UI work done.
   - Quick menu added to bottom left.
   - Main Menu added.
   - Teams menu added.
   - Chat menu added.
     - Chat is no longer on the right hand side of the screen. It is now a menu that can be opened up with "enter".
	 - If its not open, new chat messages appear and fade away after a little bit.
   - User list menu added.
     - Userlist is no longer on the left hand side of the screen. It is now a menu that can be opened up with "tab".
   - Debug menu added.
     - Debugging stuff does not show up by default anymore. It is now a menu that can be opened up to show debugging information.
   - Also uninstalled the ape-ECS library. ECS is abandoned for this game.

## Version - 2021.3.8
* Moved collision data to its own subdirectory "Data"

## Version - 2021.2.28
* Client side architechture updated alot!
   - Game object manager exists on client side
   - User manager exists on client side
   - Team Manager exists on client side
   - Lots of un-speghetifying for the main-scene

## Version - 2021.2.21
* Added very basic framework for teams.
* New life cycle implemented for game objects.
* Started client side architecture.

## Version - 2021.2.7
* Nothing new...a waste of a release.

## Version - 2021.1.24.1
* Hotfix: fixed the bug that caused chat messages to not send if they were too long.

## Version - 2021.1.24
* Fixed ??? character name bug on client end
* Optimized physics iterations (just changed it down to 1)
* Optimized ai agent sensor. Changed it so ai's can no longer detect other ai agents.

## Version - 2021.1.23
**Techdemo finished! (FINALLY)**
* Added bigger map
* Added gravestone when user or AI dies 
  * User stays for 15 seconds
  * Ai stays for 5 seconds
* Added spectator camera
* Added "deathcam" (camera stays on your gravestone for ~2 seconds)
* Changed castle so castle starts as rubble.
* Added castle image so an ACTUAL castle is spawned (previously it was a painted on castle on a tile)
* Changed user's hp to 25.
* Changed big bullet damage to 8.
* Changed front end so its fancier (added borders and made it more card style)
* Fixed chat so player can hit enter to chat while in specator mode.

## Version - 2021.1.22
* Initial change log creation
* Added Links and controls on lobby screen
* Added castle death announcment
* Added PvP combat flag
* ...And everything thats been existing so far.

## Version - 2020.10.5 - 2021.1.22
* 3 months of additions here...

## Version - 2020.10.5
* Initial commit to the stockheimer project. 