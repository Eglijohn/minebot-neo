<p align="center">
<img src="images/logo.png" alt="minebot-neo-logo" width="20%"/>
</p>

<h1 align="center">Minebot NEO</h1>
<p align="center">A Minecraft Bot written in JavaScript using Mineflayer.</p> 

<div align="center">
    <br>
    <img src="https://tokei.rs/b1/github/eglijohn/minebot-neo?category=code"/>
<a href="https://discord.gg/CKySgRzUYp">Discord Server</a>
</div>


# Manual

## Setup

### Prerequisites
- Node.js installed on your system.

### Installation
1. Clone the repository or download the source code.
2. Navigate to the project directory.
3. Install the dependencies:
    ```sh
    npm install
    ```

### Configuration
1. Open the [config](config/CONFIG.jsonc) file
2. The comments can help you configuring the bot.

3. Open the [account](config/ACCOUNT.json) file
- `username:` enter the bot's Username here
- `auth:` Microsoft for Premium accounts, Offline for cracked.

#### Discord WebHooks
1. Open [webhook.js](src/webhook.js)
2. Enter the WebHook URL's in
```js
let webHookURL = 'here'
let playersWebHookURL = 'here'
let chatWebHookURL = 'here'
```

### Running the Bot
1. Start the bot by running this in your terminal:
```sh
node src/index.mjs
```
2. The bot has a few options:
- `--experiments` activate experimental features
- `--noLog` disable autoLog and logWhenNoTotem
- `--debugMode` display more debug-things

## Commands

### Console Commands
- `!help`: Displays a list of available commands.
- `!players`: Lists all online players.
- `!quit`: Exits the bot and terminates the process.
- `!info`: Displays information about the server and the bot.
- `!invsee`: Shows the bot's inventory.
- `!follow <player>`: Follows the specified player.
- `!stopfollow`: Stops following the current player.
- `!goto <x> <y> <z>`: Moves the bot to the specified coordinates.
- `!pos`: Displays the bot's current position.
- `!drop <item_name> <amount>`: Drops the specified amount of the specified item.
- `!rejoin`: Rejoins the server.
- `!stop`: Stops the bot's current action.
- `!tp <to|axis> <target|offset> <fly>`: Teleports the bot to a target or offset.
- `!tfly`: Toggles flight mode.
- `!attack <player>`: Attacks the specified player.
- `!scs <sneak, jump, sprint, left, right, forward, back> <true, false>`: Sets the bot's control state.
- `!range`: See players in the bots render distance.
- `!equip <item_name> <slot>`: Equips the specified item in the specified slot (hand, head, chest, legs, feet, off-hand).
- `!mb`: Displays the Minebot NEO logo and version information.

### Chat Commands
- `!help`: Displays help information.
- `!cmd`: Lists all available commands or gets info about a specific command.
- `!follow`: Makes the bot follow you (trusted users only).
- `!stopfollow`: Makes the bot stop following you (trusted users only).
- `!quit`: Makes the bot quit (trusted users only).
- `!say <message>`: Makes the bot say a message (trusted users only).
- `!players`: Lists online players.
- `!pos`: Shows the bot's current position (trusted users only).
- `!goto <x> <y> <z>`: Makes the bot go to specified coordinates (trusted users only).
- `!tp <to|axis> <target|offset> <fly>`: Teleports the bot to a target or offset (trusted users only).
- `!drop <item_name> <amount>`: Drops specified item (trusted users only).
- `!attack <target> <mace> <attacks>`: Attacks a target (trusted users only).
- `!equip <item_name> <slot>`: Equips an item (trusted users only).
- `!range`: Lists players in range (trusted users only).
- `!scs <'forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'> <true/false>`: Sets control state (trusted users only).
- `!basehunt`: Goes basehunting.
- `!pearl`: Activates a stasis chamber (only for stasis chamber owners).

**I assume no responsibility for any damage caused by this Bot**