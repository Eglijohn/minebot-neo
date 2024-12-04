# Minebot NEO
An easy-to-use Minecraft bot written in JavaScript using Mineflayer.

**READ THE WHOLE MANUAL BEFORE STARTING THE BOT!**

[Discord Server](https://discord.gg/CKySgRzUYp)  
[Eglijohn's Discord Account](https://discord.com/users/1254464035546464321)  

_**YOU ARE ALLOWED TO EDIT THE CODE WITH MY PERMISSION.**_  
_**You are NOT allowed to share the code itself; only share the link.**_

### Dependencies:

-   Node.js

## Manual:

### Setting up the Bot:

1.  Open `config/CONFIG.json`
    
    -   `Host`: Enter the server address the bot should join here.
    -   `Version:` Enter the Minecraft version of the server here.
    -   `Port:` If the server requires a port, enter it here (see `needsPort`).
    -   `Owner:` Specify the player who has permissions for the bot in the Minecraft chat.
    -   `customStartMsg:` A custom message the bot will write in the chat upon joining a server. To enable this, first set `noChat` to true.
    -   `noChat:` When set to false, the bot will write `Minebot NEO v...` in the chat upon joining a server.
    -   `needsPort:` Enable if the server requires a specific port.
    -   `experimentalFeatures:` Allows you to use in-development features. Use with caution.
    -   `processquit:` When set to false, the bot will rejoin after 5 seconds if you execute `!quit`.
    -   `consoleCounter:` Counts the logs in the terminal.
    -   `autoLog:` Disconnects the bot when the health is under 3. Unstable.


2.  Open `config/ACCOUNT.json`
    -   `username:` Enter the IGN (in-game name) of your Minecraft account for premium accounts, or the bot's username for offline authentication.
    -   `auth:` Enter `microsoft` for premium accounts or `offline` for offline authentication.

### Starting the Bot:

1.  Execute `START.bat`.
    -   Microsoft Authentication:
        1.  Wait a few seconds until a link appears in the console.
        2.  Open the link and log in with your Microsoft/Minecraft account.
    -   Offline Authentication:
        1.  No action required.
2.  If you have completed the first step correctly, the bot will now join the server specified in `CONFIG.json`.

### Console Overview:

![Console Overview](/images/console.png)

**What gets logged?**

-   Player join/leave events
-   Health updates
-   Mob deaths
-   Item drops/pickups
-   Kicks (with reason in JSON format)
-   Messages/Minecraft chat
-   Everything gets saved in logs/log.txt

### Commands:

-   **Console:**
    
    -   `!help` Displays available commands.
    -   `!players` Lists online players.
    -   `!quit` Stops the bot.
    -   `!inventory` Lists items in the bot's inventory.
    -   `!info` Displays information about the server and the bot.
    -   `!follow <player>` Makes the bot follow a player.
    -   `!stopfollow` Stops following.
    -   `!pos` Displays the current position.
    -   `!goto <x> <y> <z>` The bot goes to this position.
    -   To make the bot write/execute something in the Minecraft chat, simply enter the text without a '!' prefix.
-   **Minecraft** 
_To execute commands from the Minecraft chat, send the bot a direct message with the command._ _The bot cannot execute commands on servers with a different chat pattern, as it won’t recognize these as whispers._
    -   `!help` Displays available commands.
    -   `!follow` Makes the bot follow YOU.
    -   `!stopfollow` Stops following.
    -   `!quit` Stops the bot.
    -   `!say <message>` The bot will write the specified message in chat. This can include commands.
    -   `!players` Lists online players.
    -   `!goto <x> <y> <z>` The bot goes to this position.
    -   `!pos` Displays the current position.

### Tokens
- The Tokens get saved in Minecraft's AppData folder under `nmp-cache`.
To log you off from the Bot, you just have to delete these tokens.