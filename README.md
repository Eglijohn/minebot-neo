# Minebot NEO

### Dependencies:

- Node.js

## Manual:

### Setting up the Bot:

1.  Open `config/CONFIG.json`

    - The comments will help you setting up the Bot

2.  Open `config/ACCOUNT.json`
    - `username:` Enter the IGN (in-game name) of your Minecraft account for premium accounts, or the bot's username for offline authentication.
    - `auth:` Enter `microsoft` for premium accounts or `offline` for offline authentication.

### Starting the Bot:

1.  Execute `node src/index.mjs`.
    - There are a few start arguments (`--noLog`, `--experiments`, `--debug`). They are self-explaining, `--experiments` doesnt do anything
    - Microsoft Authentication:
      1.  Wait a few seconds until a link appears in the console.
      2.  Open the link and log in with your Microsoft/Minecraft account.
    - Offline Authentication:
      1.  No action required.
2.  If you have completed the first step correctly, the bot will now join the server specified in `CONFIG.json`.

### Console:

- Everything gets saved in logs/log.txt

### Commands:

- **Console:**

  - Type `!cmd` for an list of all supported commands.
  - To make the bot write/execute something in the Minecraft chat, simply enter the text without a '!' prefix. Server Commands supported.

- **Minecraft**
  - Almost all commands from the console, message the bot `!cmd` for an list

### Tokens

- The Tokens get saved in Minecraft's AppData folder under `nmp-cache`.
  To log you off from the Bot, you just have to delete these tokens.
