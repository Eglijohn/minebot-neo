/*
+++++       +++++π+++++       
++++++     ++++++π+++++++     
+++++++   +++++++   +++++     
+++++++   +++++++  ++++++     
++++++++ ++++++++π+++++       
+++++++++++++++++   +++++     
++++ +++++++ ++++   ++++++    
++++  +++++  ++++π+++++++     
++++  +++++  ++++π++++++      

Minebot NEO by Eglijohn
DC-Server: https://discord.gg/CKySgRzUYp
Have you read the Manual???
*/


/* Imports */
import mineflayer from 'mineflayer';
import { readFile } from 'fs/promises';
import fs from 'fs';
import minecraftData from 'minecraft-data';
import pkg from 'mineflayer-pathfinder';
import http from 'http';
import { mineflayer as mineflayerViewer } from 'prismarine-viewer';
import chalk from 'chalk';
import { sendToWebhook, sendToPlayers, sendToChat } from "./webhook.js";
import { LoadingAnimation } from "./animation.js";
import { sand } from "./spinners.js";
import { parse } from 'jsonc-parser';
import readline from 'readline';
import armorManager from 'mineflayer-armor-manager';
import mineflayerWebInventory from "mineflayer-web-inventory";
import Vec3 from 'vec3';

/* Constants */
const { pathfinder, Movements, goals } = pkg;
const { GoalBlock } = goals;
const ansiEscape = /\x1b\[[0-9;]*m/g;

const aggressiveMobs = [
    'zombie', 'skeleton', 'creeper', 'spider', 'witch', 'enderman', 'blaze', 'ghast', 'guardian', 'husk', 
    'magma_cube', 'phantom', 'piglin', 'shulker', 'silverfish', 'slime', 'stray', 'vex', 'vindicator', 
    'wither_skeleton', 'zoglin', 'zombie_villager', 'zombified_piglin', 'drowned', 'endermite', 'evoker', 
    'hoglin', 'illusioner', 'pillager', 'ravager', 'wither', 'ender_dragon', 'warden', 'player'
];

/* Variables */
let botArgs = {};
let botNames = [];
let config = {};
let owner;
let version = "3.2.5a";
let count = 0;


/* Read Config File */
async function readConfigFile() {
    try {
        const data = await readFile('./config/CONFIG.jsonc', 'utf8');
        config = parse(data);
        botArgs.host = config.host;
        botArgs.version = config.version;
        owner = config.owner;

        if (config.needsPort) {
            botArgs.port = config.port;
        }
    } catch (error) {
        console.error(chalk.red('Error reading or parsing CONFIG.jsonc:'), error);
        process.exit(1);
    }
}

/* Read Account File */
async function readAccountFile() {
    try {
        const data = await readFile('./config/ACCOUNT.json', 'utf8');
        const accounts = JSON.parse(data);
        return accounts[0];
    } catch (error) {
        console.error(chalk.red('Error reading ACCOUNT.json:'), error);
        process.exit(1);
    }
}


/* Title */
console.log(chalk.red('NOTE:') + chalk.gray(' The Bot is currently in Development. Please report Bugs to our Discord-Server:') + (chalk.blue)(' https://discord.gg/CKySgRzUYp'));
console.log(chalk.bold.hex('#044cd9')("___  ____            _           _    ") + chalk.hex('#f5f5f5')(" _   _  _____ _____ "));
console.log(chalk.bold.hex('#0443bf')("|  \\/  (_)          | |         | |   ") + chalk.hex('#e1e1e3')("| \\ | ||  ___|  _  |"));
console.log(chalk.bold.hex('#033cab')("| .  . |_ _ __   ___| |__   ___ | |_  ") + chalk.hex('#b6b6b8')("|  \\| || |__ | | | |"));
console.log(chalk.bold.hex('#02369c')("| |\\/| | | '_ \\ / _ \\ '_ \\ / _ \\| __| ") + chalk.hex('#88898a')("| . ` ||  __|| | | |"));
console.log(chalk.bold.hex('#012e85')("| |  | | | | | |  __/ |_) | (_) | |_  ") + chalk.hex('#5a5b5c')("| |\\  || |___\\ \\_/ /"));
console.log(chalk.bold.hex('#022975')("\\_|  |_/_|_| |_|\\___|_.__/ \\___/ \\__|") + chalk.hex('#48494a')(" \\_| \\_/\\____/ \\___/ "));
console.log(chalk.hex('#011b4f')("By Eglijohn                                        ") + chalk.hex('#282929')(version));
console.log(chalk.gray("=========================================================="));
console.log('');
LoadingAnimation(sand, 2000);


/* Webserver */
class WebServer {
    constructor(hostname = 'localhost', port = config.webServerPort) {
        this.hostname = hostname;
        this.port = port;
        this.server = null;
    }


    start() {
        this.server = http.createServer((req, res) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(`Hello World!`);
        });

        this.server.listen(this.port, this.hostname, () => {
            console.log(chalk.green(`Webserver running at http://${this.hostname}:${this.port}/`));
        });
    }


    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log(chalk.yellow('Server stopped.'));
            });
        } else {
            console.log(chalk.yellow('Server isn\'t running'));
        }
    }
}


/* MC Bot */
class MCBot {
    constructor(username, auth) {
        this.username = username;
        this.auth = auth;
        this.host = botArgs.host;
        this.port = botArgs.port;
        this.version = botArgs.version;
        this.sendToWebhook = sendToWebhook;
        this.sendToPlayers = sendToPlayers;
        this.sendToChat = sendToChat;
        this.flyInterval = null;
        this.lookAtNearestPlayerInterval = null;

        this.initBot();
        this.initConsoleInput();
    }

    /* Init Bot */
    initBot() {
        const botOptions = {
            username: this.username,
            auth: this.auth,
            host: this.host,
            version: this.version,
            hideErrors: config.hideErrors,
            brand: config.customBrand
        };

        if (this.port) {
            botOptions.port = this.port;
        }

        this.bot = mineflayer.createBot(botOptions);

        this.mcData = minecraftData(this.bot.version);
        botNames.push(this.bot.username);

        /* Load Plugins */
        this.bot.loadPlugin(pathfinder);
        this.bot.loadPlugin(armorManager);

        this.initEvents();

        sendToWebhook('Startup', 'Bot successfully started!', '', 13238245);

        this.bot.once('spawn', () => {
            /* Experimental Features */
            if (process.argv.includes('--experiments')) {
                /* Start Webservers */
                mineflayerWebInventory(this.bot, { port: config.webInventoryPort });
                this.log(chalk.green(`Mineflayer Web Inventory server running on http://localhost:${config.webInventoryPort}`));

                mineflayerViewer(this.bot, {
                    port: config.viewerPortFP,
                    firstPerson: true,
                });
                this.logInfo(chalk.green(`Prismarine viewer FP mode web server running on http://localhost:${config.viewerPortFP}`));

                mineflayerViewer(this.bot, {
                    port: config.viewerPort,
                });
                this.log(chalk.green(`Prismarine viewer web server running on http://localhost:${config.viewerPort}`));

                /* Please God, Please make this work */
                this.bot.on('path_update', (r) => {
                    const path = [this.bot.entity.position.offset(0, 0.5, 0)];
                    for (const node of r.path) {
                        path.push({ x: node.x, y: node.y + 0.5, z: node.z });
                    }
                    this.bot.viewer.drawLine('path', path, 0xfc0000);
                    if (process.argv.includes('--debugMode')) {
                        this.logInfo(`Path updated: ${r.path.length} nodes.`);
                    }
                });

                if (config.showPathWalked = true) {
                    const path = [this.bot.entity.position.clone()]
                    this.bot.on('move', () => {
                        if (path[path.length - 1].distanceTo(this.bot.entity.position) > 1) {
                            path.push(this.bot.entity.position.clone())
                            this.bot.viewer.drawLine('pathWalked', path, 0x0000ff)
                        }
                    })
                }

                this.bot.on('goal_reached', () => {
                    this.logInfo('Goal reached.');
                    this.bot.viewer.erase('path');
                });

                if (process.argv.includes('--debugMode')) {
                    this.bot.on('path_reset', (reason) => {
                        this.logWarn(`Path reset: ${reason}`);
                    });

                    this.bot.on('goal_updated', (goal) => {
                        this.logInfo(`Goal updated: X: ${goal.x}, Y: ${goal.y}, Z: ${goal.z}`);
                    });
                }

                this.bot.viewer.on('blockClicked', (block, face, button) => {
                    if (button === 2) {
                        const p = block.position.offset(0, 1, 0);
                        const mcData = minecraftData(this.bot.version);
                        const movements = new Movements(this.bot, mcData);

                        movements.canDig = config.canDig;
                        movements.canPlace = config.canPlace;

                        this.bot.pathfinder.setMovements(movements);
                        this.bot.pathfinder.setGoal(new GoalBlock(p.x, p.y, p.z));
                        if (process.argv.includes('--debugMode')) {
                            this.logInfo(`New goal set: ${p.x}, ${p.y}, ${p.z}`);
                        }
                    } else if (button === 1) {
                        try {
                            setTimeout(() => {
                                this.bot.activateBlock(block);
                                if (process.argv.includes('--debugMode')) {
                                    this.logInfo(`Block activated: ${block.name}`);
                                }
                            }, 100);
                        } catch (err) { 
                            this.logWarn(`Failed to activate block: ${err.message}`);
                        }
                    }
                });
            }

            /* Start Message */
            if (config.noChat === true) {
                this.bot.chat(`${config.customStartMsg}`);
            } else {
                this.bot.chat(`Minebot NEO ${version}. Developed by Eglijohn.`);
            }

            /* AntiAFK */
            if (config.antiAFK === true) {
                this.startSneakLoop();
            }

            /* Look at nearest Player */
            if (config.lookAtNearestPlayer === true) {
                setInterval(() => {
                    this.lookAtNearestPlayer();
                }, config.lookAtNearestPlayerInterval);
            }
        });
    }


    /* Console Input */
    initConsoleInput() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: config.cliPrefix
        });

        rl.prompt();

        rl.on('line', async (line) => {
            const input = line.trim();

            if (input.startsWith(config.commandPrefix)) {
                const command = input.substring(1);
                await this.executeCommand(command);
            } else {
                this.bot.chat(input);
            }

            rl.prompt();
        }).on('close', () => {
            console.log('Have a great day!');
            process.exit(0);
        });

        const originalLog = console.log;
        console.log = (...args) => {
            rl.output.write('\x1b[2K\r');
            originalLog(...args);
            rl.prompt(true);
        };
    }


    /* Reconnect */
    reconnect() {
        this.bot.end();
        setTimeout(() => {
            this.initBot();
        }, config.reconnectTimeout);
    }

    /* AntiAFK sneak loop */
    startSneakLoop() {
        setInterval(() => {
            this.bot.setControlState('sneak', true);
            setTimeout(() => {
                this.bot.setControlState('sneak', false);
            }, config.sneakDuration);
        }, config.antiAFKInterval);
    }


    /* autoEat */
    async autoEat() {
        if (this.bot.food < 20) {
        /* Food Items */
        const foodItem = this.bot.inventory.items().find(item =>    item.name.includes('apple')     ||
                                                                    item.name.includes('bread')     ||
                                                                    item.name.includes('carrot')    ||
                                                                    item.name.includes('potato')    ||
                                                                    item.name.includes('cooked')    ||
                                                                    item.name.includes('beef')      ||
                                                                    item.name.includes('pork')      ||
                                                                    item.name.includes('chicken')   ||
                                                                    item.name.includes('mutton')    ||
                                                                    item.name.includes('rabbit')    ||
                                                                    item.name.includes('fish')      ||
                                                                    item.name.includes('melon')     ||
                                                                    item.name.includes('pie')       ||
                                                                    item.name.includes('cookie')    ||
                                                                    item.name.includes('stew')      ||
                                                                    item.name.includes('soup')      ||
                                                                    item.name.includes('berries')   ||
                                                                    item.name.includes('honey')     ||
                                                                    item.name.includes('sweet')     ||
                                                                    item.name.includes('cake')      ||
                                                                    item.name.includes('pumpkin')   ||
                                                                    item.name.includes('kelp')      ||
                                                                    item.name.includes('tropical')  ||
                                                                    item.name.includes('dried')     ||
                                                                    item.name.includes('rotten')    ||
                                                                    item.name.includes('golden')    ||
                                                                    item.name.includes('enchanted') ||
                                                                    item.name.includes('glistering')||
                                                                    item.name.includes('puffer')    ||
                                                                    item.name.includes('salmon'));
        if (foodItem) {
            try {
                await this.bot.equip(foodItem, 'hand');
                await this.bot.consume();
                this.logInfo(`Ate ${foodItem.displayName}`);
            } catch (err) {
                if (err.message === 'Consuming cancelled due to calling bot.consume() again') {
                    return;
                } else {
                    this.logWarn(`Failed to eat ${foodItem.displayName}: ${err.message}`);
                }
            }
        } else {
            return;
        }
    }
    }


    /* Drop Item */
    async dropItem(itemName, amount) {
        const item = this.bot.inventory.items().find(i => i.name === itemName);
        if (!item) {
            this.logWarn(`I don't have any ${itemName}.`);
            return;
        }

        const dropAmount = Math.min(amount, item.count);
        await this.bot.toss(item.type, null, dropAmount);
        this.logInfo(`Dropped ${dropAmount} ${itemName}(s).`);
    }


    /* Look at nearest Player */
    async lookAtNearestPlayer() {
        if (this.bot.players && this.bot.pathfinder.goal === null) {
            const players = Object.values(this.bot.players).filter(player => player.entity && player.username !== this.bot.username);
            if (players.length === 0) {
                return;
            }

            const nearestPlayer = players.reduce((nearest, player) => {
                const distance = this.bot.entity.position.distanceTo(player.entity.position);
                return distance < nearest.distance ? { player, distance } : nearest;
            }, { player: null, distance: Infinity }).player;

            if (nearestPlayer) {
                try {
                    await this.bot.lookAt(nearestPlayer.entity.position.offset(0, nearestPlayer.entity.height, 0));
                } catch (err) {
                    this.logWarn(`Failed to look at ${nearestPlayer.username}: ${err.message}`);
                }
            } else {
                return;
            }
        }
    }


    /* AutoTotem */
    async autoTotem() { 
        const totem = this.bot.inventory.items().find(item => item.name.includes('totem'));
        if (totem && !this.bot.inventory.slots[45]) {
            try {
                this.logInfo(`Found ${totem.displayName} in inventory`);
                await this.bot.equip(totem, 'off-hand');
                this.logInfo(`Equipped ${totem.displayName} in off-hand`);
            } catch (err) {
                this.logWarn(`Failed to equip ${totem.displayName} in off-hand: ${err.message}`);
            }
        }
    }


    /* Execute Command from Terminal */
    async executeCommand(command) {
        const [cmd, ...args] = command.split(' ');

        switch (cmd) {
            case 'help':
                if (args.length === 0) {
                    this.logInfo(('Commands: '), chalk.hex('#cfa1f0')('help, players, quit, info, invsee, follow <player>, stopfollow, goto <x> <y> <z>, pos, drop <item_name> <amount>, rejoin, stop, tp <player>, tfly, attack <player>, scs, range, whc, equip <item_name> <slot>, mb'));
                    this.logInfo('Enter !help <command> for more information about a specific command.');
                } else {
                    const subCmd = args[0];
                    switch (subCmd) {
                        case 'help':
                            this.logInfo('help: Displays a list of available commands or detailed information about a specific command.');
                            break;
                        case 'players':
                            this.logInfo('players: Lists all online players except the bot.');
                            break;
                        case 'quit':
                            this.logInfo('quit: Exits the bot and terminates the process.');
                            break;
                        case 'info':
                            this.logInfo('info: Displays information about the server and the bot.');
                            break;
                        case 'invsee':
                            this.logInfo('invsee: Shows the bot\'s inventory.');
                            break;
                        case 'follow':
                            this.logInfo('follow <player>: Follows the specified player.');
                            break;
                        case 'stopfollow':
                            this.logInfo('stopfollow: Stops following the current player.');
                            break;
                        case 'goto':
                            this.logInfo('goto <x> <y> <z>: Moves the bot to the specified coordinates.');
                            break;
                        case 'pos':
                            this.logInfo('pos: Displays the bot\'s current position.');
                            break;
                        case 'drop':
                            this.logInfo('drop <item_name> <amount>: Drops the specified amount of the specified item.');
                            break;
                        case 'rejoin':
                            this.logInfo('rejoin: Rejoins the server.');
                            break;
                        case 'stop':
                            this.logInfo('stop: Stops the bot\'s current action.');
                            break;
                        case 'tp':
                            this.logInfo('tp <player>: Teleports to the specified player.');
                            break;
                        case 'tfly':
                            this.logInfo('tfly: Toggles flight mode.');
                            break;
                        case 'attack':
                            this.logInfo('attack <player>: Attacks the specified player.');
                            break;
                        case 'scs':
                            this.logInfo('scs: Displays the bot\'s current status.');
                            break;
                        case 'range':
                            this.logInfo('range: Sets the bot\'s attack range.');
                            break;
                        case 'whc':
                            this.logInfo('whc: Displays the bot\'s current health.');
                            break;
                        case 'equip':
                            this.logInfo('equip <item_name> <slot>: Equips the specified item in the specified slot (hand, head, chest, legs, feet, off-hand).');
                            break;
                        case 'mb':
                            this.logInfo('mb: Displays the Minebot NEO logo and version information.');
                            break;
                        default:
                            this.logWarn(`Unknown command: ${subCmd}`);
                    }
                }
                break;

            case 'players':
                const playerList = Object.keys(this.bot.players).filter(player => player !== this.bot.username);
                this.logInfo(playerList.length > 0 ? `Online players:\n${playerList.join('\n')}` : `No other players are online.`);
                break;

            case 'quit':
                this.bot.end();
                process.exit(0);

            case 'info':
                this.logInfo(`--Infos--`);
                this.logInfo('Server:');
                this.logInfo(`    Host:           ${chalk.hex('#cfa1f0')(this.host)}`);
                this.logInfo(`    Port:           ${chalk.hex('#cfa1f0')(this.port)}`);
                this.logInfo(`    Time:           ${chalk.hex('#cfa1f0')(this.bot.time.timeOfDay)}`);
                this.logInfo(``);
                this.logInfo('Bot:');
                this.logInfo(`    View Distance:  ${chalk.hex('#cfa1f0')(this.bot.settings.viewDistance)}`);
                this.logInfo(`    Health:         ${chalk.hex('#cfa1f0')(Math.round(this.bot.health * 2) / 2)}`);
                this.logInfo(`    XP:             ${chalk.hex('#cfa1f0')(this.bot.experience.points)}`, chalk.hex('#cfa1f0')('Points'));
                this.logInfo(`    Food:           ${chalk.hex('#cfa1f0')(Math.round(this.bot.food * 2)) / 2}`);
                this.logInfo(`    Oxygen:         ${chalk.hex('#cfa1f0')(Math.round(this.bot.oxygenLevel * 2) / 2)}`);
                this.logInfo(`    Gamemode:       ${chalk.hex('#cfa1f0')(this.bot.game.gameMode)}`);
                this.logInfo(`    Dimension:      ${chalk.hex('#cfa1f0')(this.bot.game.dimension)}`);
                this.logInfo(`    Difficulty:     ${chalk.hex('#cfa1f0')(this.bot.game.difficulty)}`);
                this.logInfo(`    Position:       ${(`X: ${chalk.hex('#de495b')(JSON.stringify(Math.round(this.bot.entity.position.x)),
                    chalk.white('Y:'), Math.round(this.bot.entity.position.y),
                    chalk.white('Z:'), Math.round(this.bot.entity.position.z))}`)}`);
                break;

            case 'invsee':
                const heldItem = this.bot.heldItem;
                const offhandItem = this.bot.inventory.slots[45];
                const inventoryItems = this.bot.inventory.items().map(item => `${chalk.hex('#cfa1f0')(item.displayName)} (x${chalk.hex('#cfa1f0')(item.count)})`);
                this.logInfo(`Inventory: ${inventoryItems.length > 0 ? inventoryItems.join(', ') : 'Inventory is empty'}`);
                if (offhandItem) {
                    this.logInfo(`Offhand Item: ${chalk.hex('#cfa1f0')(offhandItem.displayName)} (x${chalk.hex('#cfa1f0')(offhandItem.count)})`);
                }
                if (heldItem) {
                    this.logInfo(`Held Item: ${chalk.hex('#cfa1f0')(heldItem.displayName)} (x${chalk.hex('#cfa1f0')(heldItem.count)})`);
                } if (mineflayerWebInventory) {
                    this.logInfo(`Web Inventory: http://localhost:${config.webInventoryPort}`);
                } else {
                    this.logInfo('No item is currently held.');
                }
                break;

            case 'follow':
                const targetPlayer = this.bot.players[args[0]]?.entity;
                targetPlayer ? this.followPlayer(targetPlayer) : this.logWarn(`Player ${chalk.hex('#cfa1f0')(args[0])} not found or not visible.`);
                break;

            case 'stopfollow':
                this.stopFollowPlayer();
                break;

            case 'goto':
                if (args.length === 3) {
                    const x = parseFloat(args[0]);
                    const y = parseFloat(args[1]);
                    const z = parseFloat(args[2]);
                    this.gotoConsole(x, y, z);
                } else {
                    this.logWarn(`Usage: !goto <x> <y> <z>.`);
                }
                break;

            case 'pos':
                this.logInfo(`My current Position: ${(`X: ${chalk.hex('#de495b')(JSON.stringify(Math.round(this.bot.entity.position.x)),
                    chalk.white('Y:'), Math.round(this.bot.entity.position.y),
                    chalk.white('Z:'), Math.round(this.bot.entity.position.z))}`)}`)
                break;
                
            case 'whc':
                this.sendToWebhook('Join', '', '', '65280');
                this.sendToWebhook('Leave', '', '', '16753152');
                this.sendToWebhook('Chat', '', '', '1076737');
                this.sendToWebhook('Error', '', '', '16711680');
                this.sendToWebhook('Info', '', '', '3120640');
                this.sendToWebhook('Warn', '', '', '16768256');
                break;
            
            case 'drop':
                if (args.length < 1) {
                    this.logInfo('Usage: !drop <item_name> <amount>');
                } else {
                    const itemName = args[0];
                    const amount = parseInt(args[1], 10) || 1;
                    if (isNaN(amount) || amount <= 0) {
                        this.logInfo('Amount must be a positive number.');
                    } else {
                        await this.dropItem(itemName, amount);
                    }
                }
                break;
            
            case 'rejoin':
                this.reconnect();
                break;
            
            case 'stop':
                this.stopAllGoals();
                this.logWarn('Stopped all goals.');
                break;
            
            case 'tp':
                this.logInfo('Trying to Tp...');
                if (process.argv.includes('--debugMode')) {
                    this.logInfo('args[0] = ', args[0]);
                    this.logInfo('args[1] = ', args[1]);
                    this.logInfo('args[2] = ', args[2]);
                }

                const axis = args[0];
                let offset = 0;
                let tptarget = null;

                if (axis !== 'to') {
                    offset = parseInt(args[1], 10);

                    if (isNaN(offset)) {
                        this.logError('Invalid number provided for tp:', args[1], '. Try !tp <axis> <offset> <fly>');
                        break;
                    }

                    if (offset > 10 && args[2] !== 'fly') {
                        this.logError('Offset must be max. 10. Try fly for max. 16.');
                        break;
                    } else if (offset > 16 && args[2] === 'fly') {
                        this.logError('Offset must be max. 16 with fly enabled.');
                        break;
                    }
                } else {
                    for (const tpentityId in this.bot.entities) {
                        const tpentity = this.bot.entities[tpentityId];
                        if (tpentity.username === args[1] || tpentityId === args[1]) {
                            tptarget = tpentity;
                            break;
                        }
                    }

                    if (!tptarget) {
                        this.logError('Invalid target: ', args[1]);
                        break;
                    }

                    const tpdistance = this.bot.entity.position.distanceTo(tptarget.position);
                    if (tpdistance > 10 && args[2] !== 'fly') {
                        this.logError(`Target is ${Math.round(tpdistance)}m away.`);
                        break;
                    }
                }

                switch (axis) {
                    case 'y+':
                        this.tp(this.bot.entity.position.x, this.bot.entity.position.y + offset, this.bot.entity.position.z, args[2]);
                        break;                                                                                                                                                                                                                  
                    case 'y-':
                        this.tp(this.bot.entity.position.x, this.bot.entity.position.y - offset, this.bot.entity.position.z, args[2]);
                        break;
                    case 'x+':
                        this.tp(this.bot.entity.position.x + offset, this.bot.entity.position.y, this.bot.entity.position.z, args[2]);
                        break;
                    case 'x-':
                        this.tp(this.bot.entity.position.x - offset, this.bot.entity.position.y, this.bot.entity.position.z, args[2]);
                        break;
                    case 'z+':
                        this.tp(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z + offset, args[2]);
                        break;
                    case 'z-':
                        this.tp(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z - offset, args[2]);
                        break;
                    case 'to':
                        this.tp(tptarget.position.x, tptarget.position.y, tptarget.position.z, args[2]);
                        break;
                    default:
                        this.logError('Invalid axis provided for tp:', axis);
                        break;
                }
                break;
            
            case 'tfly':
                let fly = args[0]

                this.tp(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z, fly);
                break;
            
            case 'attack':
                this.logInfo('Trying to attack', args[0]);

                let target = null;
                for (const entityId in this.bot.entities) {
                    const entity = this.bot.entities[entityId];
                    if (entity.username === args[0] || entityId === args[0]) {
                        target = entity;
                        break;
                    }
                }

                if (!target) {
                    this.logError('Invalid target: ', args[0]);
                    break;
                }

                const distance = this.bot.entity.position.distanceTo(target.position);
                if (distance > 10) {
                    this.logError(`Target is ${Math.round(distance)}m away.`);
                    break;
                }

                this.tp(target.position.x, target.position.y, target.position.z, 'fly');

                if (args[1] === 'mace') {
                    this.mace(target, args[2]);
                    this.tp(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z);
                } else {
                    this.tp(target.position.x, target.position.y + 1, target.position.z);
                    this.tp(target.position.x, target.position.y, target.position.z);
                    this.bot.attack(target);
                    this.tp(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z);
                    this.logInfo('Attacking target: ', target.username || target.id);
                }
                break;
            
            case 'scs':
                if (args[1] === 'true') {
                    this.bot.setControlState(args[0], true);
                } else if (args[1] === 'false') {
                    this.bot.setControlState(args[0], false);
                } else {
                    this.logError(`Try !scs <'forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'> <true/false>`)
                }
                break;
            
            case 'range':
                const playersInRange = Object.values(this.bot.entities)
                    .filter(entity => entity.type === 'player' && entity !== this.bot.entity)
                    .map(entity => {
                        const distance = this.bot.entity.position.distanceTo(entity.position);
                        return { username: entity.username, distance: distance.toFixed(2) };
                    });

                if (playersInRange.length > 0) {
                    playersInRange.forEach(player => {
                        this.logInfo(chalk.hex('#f5aa42')(`${player.username}: ${Math.round(player.distance)}m`));
                    });
                } else {
                    this.logWarn('No players in range.');
                }
                return;
            
            case 'equip':
                const item = this.bot.inventory.items().find(i => i.name === args[0]);

                if (!item) {
                    this.logError(`I don't have any ${args[0]}.`);
                    return;
                } else try {
                    if (args[1] !== 'hand' && args[1] !== 'head' && args[1] !== 'chest' && args[1] !== 'legs' && args[1] !== 'feet' && args[1] !== 'off-hand') {
                        this.logError(`Invalid slot provided for equip: ${args[1]}. Try hand, head, chest, legs, feet, off-hand.`);
                        break;
                    } else {
                        this.bot.equip(item, args[1]);
                        this.logInfo(`Equipped ${item.displayName} in ${args[1]}.`);
                    }
                } catch (err) { 
                    this.logError(`Failed to equip ${item.displayName} in ${args[1]}: ${err.message}`);
                }
                break;
            
            case 'mb':
                this.logInfo(chalk.hex('#6DCEFF')('+++++       +++++') + chalk.hex('#267499')('π+++++'));
                this.logInfo(chalk.hex('#6DCEFF')('++++++      +++++') + chalk.hex('#267499')('π+++++++'));
                this.logInfo(chalk.hex('#6DCEFF')('+++++++    ++++++') + chalk.hex('#267499')('   +++++'));
                this.logInfo(chalk.hex('#6DCEFF')('+++++++    ++++++') + chalk.hex('#267499')('  ++++++'));
                this.logInfo(chalk.hex('#6DCEFF')('++++++++  +++++++') + chalk.hex('#267499')('π+++++'));
                this.logInfo(chalk.hex('#6DCEFF')('+++++++++++++++++') + chalk.hex('#267499')('   +++++'));
                this.logInfo(chalk.hex('#6DCEFF')('++++ +++++++ ++++') + chalk.hex('#267499')('   ++++++'));
                this.logInfo(chalk.hex('#6DCEFF')('++++  +++++  ++++') + chalk.hex('#267499')('π+++++++'));
                this.logInfo(chalk.hex('#6DCEFF')('++++  +++++  ++++') + chalk.hex('#267499')('π++++++'));
                this.logInfo(chalk.gray(`Minebot NEO ${version}. Developed by Eglijohn.`));
                break;
    

            default:
                this.logWarn(`Command '${chalk.hex('#cfa1f0')(cmd)}' not found. Enter !help for a list of available commands.`);
                break;
        }
    }


    /* Follow Player */
    followPlayer(target) {
        const mcData = minecraftData(this.bot.version);
        const movements = new Movements(this.bot, mcData);

        movements.canDig = config.canDig;
        movements.canPlace = config.canPlace;
        this.bot.pathfinder.setMovements(movements);

        const goal = new goals.GoalFollow(target, 1);
        this.bot.pathfinder.setGoal(goal, true);
        this.logInfo(`Now following ${chalk.hex('#cfa1f0')(target.username)}`);
    }

    /* Stop Follow Player */
    stopFollowPlayer() {
        this.bot.pathfinder.setGoal(null);
        this.logInfo('Stopped following.');
    }


    mace(target, attacks) {
        for (const entityId in this.bot.entities) {
            const entity = this.bot.entities[entityId];
            if (entity.username === target || entityId === target) {
                target = entity;
                break;
            }
        }

        const distance = this.bot.entity.position.distanceTo(target.position);
        if (distance > 10) {
            this.logError('Target is out of range.');
            return;
        }

        const mace = this.bot.inventory.items().find(item => item.name.includes('mace'));
        if (!mace) {
            this.logError('404 Mace not found.');
            return;
        }

        let maxAttacks = attacks || 1;
        let attackCount = 0;

        const attack = () => {
            if (attackCount < maxAttacks && distance < 10) {
                this.bot.equip(mace, 'hand');
                this.tp(target.position.x, target.position.y, target.position.z);
                this.tp(target.position.x, target.position.y + config.maceAttackHeight, target.position.z);
                this.tp(target.position.x, target.position.y, target.position.z);
                this.bot.attack(target);
                this.logWarn(`Attacked target: ${target.username || target.id}`);
                attackCount++;
            } else {
                clearInterval(executeAttack);
                this.logInfo('Stopped attacking after reaching max attacks.');
            }
        };

        // Perform the first attack immediately
        attack();

        // Set up the interval for subsequent attacks
        const executeAttack = setInterval(attack, config.maceAttackInterval);
    }


    tp(x, y, z, fly) {
        if (fly === 'fly') {
            if (this.flyInterval !== null) {
                clearInterval(this.flyInterval);
                this.flyInterval = null;
            }

            this.flyInterval = setInterval(() => {
                this.bot._client.write('position', { x: x, y: y, z: z });
            }, config.flyPacketInterval);
            this.logInfo(`Tp'd to ${Math.round(x)} ${Math.round(y)} ${Math.round(z)}, fly = true`);
        } else {
            if (this.flyInterval !== null) {
                clearInterval(this.flyInterval);
                this.flyInterval = null;
            }

            this.bot._client.write('position', { x: x, y: y, z: z });
            if (process.argv.includes('--debugMode')) {
                this.logInfo(`Tp'd to ${Math.round(x)} ${Math.round(y)} ${Math.round(z)}`);
            }
        }
    }


    /* Goto from the Minecraft Chat*/
    goto(x, y, z, username = null) {
        const movements = new Movements(this.bot, this.mcData);
        movements.canDig = config.canDig;
        movements.canPlace = config.canPlace;

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            const goal = new goals.GoalBlock(x, y, z);
            this.bot.pathfinder.setMovements(movements);
            this.bot.pathfinder.setGoal(goal);

            if (username) {
                this.bot.chat(`/msg ${username} I am going to (${x}, ${y}, ${z})`);
            } else {
                this.bot.chat(`/msg ${username} I am going to (${x}, ${y}, ${z})`);
            }
        } else {
            this.bot.chat(username ? `/msg ${username} Invalid coordinates. Please provide numbers.` : `Invalid coordinates. Please provide numbers.`);
        }
    }


    /* Goto */
    gotoConsole(x, y, z, username = null) {
        const movements = new Movements(this.bot, this.mcData);
        movements.canDig = config.canDig;
        movements.canPlace = config.canPlace;

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            const goal = new goals.GoalBlock(x, y, z);
            this.bot.pathfinder.setMovements(movements);
            this.bot.pathfinder.setGoal(goal);[]

            if (username) {
                this.logInfo(`I am going to (${chalk.hex('#cfa1f0')(x)}, ${chalk.hex('#cfa1f0')(y)}, ${chalk.hex('#cfa1f0')(z)})`);
            } else {
                this.logInfo(`I am going to (${chalk.hex('#cfa1f0')(x)}, ${chalk.hex('#cfa1f0')(y)}, ${chalk.hex('#cfa1f0')(z)})`);
            }
        } else {
            this.logError(username ? `Invalid coordinates. Please provide numbers.` : `Invalid coordinates. Please provide numbers.`);
        }
    }


    /* Stop Pathfinding */
    stopAllGoals() {
        this.bot.pathfinder.setGoal(null);
    }


    /* Check Totem Pop */
    checkTotemPop() {
        const offhandItem = this.bot.inventory.slots[45];
        if (offhandItem && !offhandItem.name.includes('totem') && this.bot.health < 20) {
            this.bot.emit('totemPop');
        }
    }


    /* Log */
    log(...msg) {
        const counter = `${chalk.hex('#1f1f1f')(`[${count}] `)}`;
        count += 1; 

        const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const formattedTimestamp = `[${timestamp}]`;
        const usernameTag = `[${this.bot.username}]`;
        
        const consoleMessageCounter = `${counter} ${chalk.gray(formattedTimestamp)} ${chalk.blue(usernameTag)} ${msg.join(' ')}`;
        const consoleMessage = `${chalk.gray(formattedTimestamp)} ${chalk.blue(usernameTag)} ${msg.join(' ')}`;
        
        const fileMessage = `${formattedTimestamp} ${usernameTag} ${msg.join(' ').replace(ansiEscape, '')}`;
        
        /* Write to Log File */
        fs.appendFileSync('logs/log.txt', fileMessage + '\n'); 
        if (config.consoleCounter == true) {
            console.log(consoleMessageCounter);
            return;
        } 
        console.log(consoleMessage);
    }

    /* Send to Webhook and Console Logging*/
    logJoin(...msg) {
        this.log(chalk.gray('[') + chalk.green('+') + chalk.gray(']'), ...msg)
        this.sendToPlayers('Join', msg.join(' ').replace(ansiEscape, ''), '', '3120640');
    }

    logLeave(...msg) {
        this.log(chalk.gray('[') + chalk.red('-') + chalk.gray(']'), ...msg)
        this.sendToPlayers('Leave', msg.join(' ').replace(ansiEscape, ''), '', '16711680');
    }

    logError(...msg) {
        this.log(chalk.gray('[') + chalk.red('ERROR') + chalk.gray(']') + chalk.red(...msg));
        this.sendToWebhook('Error', msg.join(' ').replace(ansiEscape, ''), '', '16711680');
    }

    logInfo(...msg) {
        this.log(chalk.gray('[') + chalk.green('INFO') + chalk.gray(']'), ...msg);
        this.sendToWebhook('Info', msg.join(' ').replace(ansiEscape, ''), '', '3120640');
    }

    logWarn(...msg) {
        this.log(chalk.gray('[') + chalk.yellow('WARN') + chalk.gray(']') + chalk.yellow(...msg));
        this.sendToWebhook('Warn', msg.join(' ').replace(ansiEscape, ''), '', '16768256');
    }

    logChat(...msg) {
        this.log(chalk.gray('[') + chalk.green('CHAT') + chalk.gray('] ') + chalk.white(...msg));
        this.sendToChat('Chat', msg.join(' ').replace(ansiEscape, ''), '', '1076737');
    }


    /* Events */
    initEvents() {
        this.bot.on('login', async () => {
            if (process.argv.includes('--debugMode')) {
                this.logInfo(chalk.green(`Logged in at ${chalk.yellow(this.host ? this.host : this.port)} as ${chalk.yellow(this.bot.username)}, version ${chalk.yellow(this.bot.version)}`));
                this.logInfo(chalk.green(`chatLogMethod set to '${chalk.yellow(config.chatLogMethod)}'`))
                this.logInfo(chalk.green(`experimentalFeatures set to '${chalk.yellow(config.experimentalFeatures)}'`))
                this.logInfo(chalk.green(`autoLog set to '${chalk.yellow(config.autoLog)}, autoLogHealth set to '${chalk.yellow(config.autoLogHealth)}'`))
                this.logInfo(chalk.green(`noChat set to '${chalk.yellow(config.noChat)}'`))
                this.logInfo(chalk.green(`antiAFK set to '${chalk.yellow(config.antiAFK)}'`))
                this.logInfo(chalk.green(`chatBot set to '${chalk.yellow(config.chatBot)}'`))
                this.logInfo(chalk.green(`lookAtNearestPlayer set to '${chalk.yellow(config.lookAtNearestPlayer)}, lookAtNearestPlayerInterval set to '${chalk.yellow(config.lookAtNearestPlayerInterval)}'`))
            }
            this.sendToWebhook(`Login`, `${this.host}:${this.port}`);
        });

        this.bot.on('end', async (reason) => {
            this.logWarn(`Connection lost: ${chalk.hex('#cfa1f0')(reason)}`);
            setTimeout(() => this.initBot(), 5000);
        });

        this.bot.on('spawn', async () => {
            const mcData = minecraftData(this.bot.version);
            const defaultMove = new Movements(this.bot, mcData);
            this.bot.pathfinder.setMovements(defaultMove);
            this.logInfo('Spawned');
            this.autoTotem();
        });

        this.bot.on('health', () => {
            this.logWarn(`Health Update. Current health: ${chalk.hex('#cfa1f0')(Math.round(this.bot.health * 2) / 2)}`);
        });

        this.bot.on('food', () => { 
            this.logInfo(`Food Update. Current food: ${chalk.hex('#cfa1f0')(Math.round(this.bot.food * 2) / 2)}`);
            this.autoEat();
        });

        this.bot.on('entityDead', (entity) => {
            this.logInfo(`Entity ${chalk.hex('#cfa1f0')(JSON.stringify(entity.name))} died`);
        });

        this.bot.on('death', async () => {
            this.logWarn('Died');
            if (this.flyInterval !== null) {
                clearInterval(this.flyInterval);
                this.flyInterval = null;
            }
        });

        this.bot.on('respawn', async () => {
            this.logWarn(`Respawned at ${chalk.hex('#cfa1f0')(this.bot.entity.position)}`);
            setTimeout(() => {
                this.bot.viewer.erase('pathWalked');
                this.bot.viewer.erase('path');
                this.bot.pathfinder.setGoal(null);
            }, 10);
        });

        this.bot.on('entitySpawn', async (entity) => {
            if (entity.type === 'player') {
                const playerName = entity.username;
                this.logInfo(`Player ${playerName} has entered my view.`);

                if (config.greetPlayers) {
                    const isTrustedPlayer = Array.isArray(config.trustedPlayers)
                        ? config.trustedPlayers.includes(playerName)
                        : playerName === config.trustedPlayers;

                    if (isTrustedPlayer) {
                        this.bot.chat(`/msg ${playerName} Hello, ${playerName}! Welcome to ${config.baseName}!`);
                    } else {
                        this.bot.chat(`/msg ${playerName} Bro what u doing here? Plz dont grief :D`);
                        this.logWarn(` Player ${playerName} is not trusted.`);
                    }
                }

            }
        });

        this.bot.on('entityGone', (entity) => {
            if (entity.type === 'player') {
                const playerName = entity.username;
                this.logInfo(`Player ${playerName} has left my view.`);
            }
        });

        this.bot.on('entityHurt', (entity) => { 
            if (entity.type === 'player') {
                this.logWarn(`Player ${entity.username} was attacked`);
                if (entity.username === this.bot.username) {
                    const nearestEntity = this.bot.nearestEntity(e => aggressiveMobs.includes(e?.name));
                    const mace = this.bot.inventory.items().find(item => item.name.includes('mace'));

                    this.checkTotemPop();
                    this.autoTotem();

                    if (nearestEntity) {
                        const distance = nearestEntity.position.distanceTo(this.bot.entity.position);

                        this.logWarn(`Nearest Entity: ${nearestEntity.username || nearestEntity.name}(${Math.round(distance * 1) / 2}m)`);
                        if (config.friends.includes(nearestEntity.username)) { 
                            this.logError('Nearest entity is a friend.');
                            return;
                        } else if (distance < 10) {
                            this.logWarn('Attacking nearest entity.');
                            if (mace) {
                                this.mace(nearestEntity, 1);
                            } else {
                                if (distance < 10) {
                                    this.tp(nearestEntity.position.x, nearestEntity.position.y, nearestEntity.position.z);
                                    this.tp(nearestEntity.position.x, nearestEntity.position.y + 1, nearestEntity.position.z);
                                    this.tp(nearestEntity.position.x, nearestEntity.position.y, nearestEntity.position.z);
                                    this.bot.attack(nearestEntity);
                                    this.tp(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z);
                                }
                            }
                        } else {
                            this.logWarn('Nearest entity is out of range.');
                        }
                    }
                }
            }
        });

        this.bot.on('playerCollect', (collector, collected) => {
            this.logInfo(`${chalk.hex('#b052f2')(JSON.stringify(collector.username))} picked up`,
            chalk.hex('#cfa1f0')(JSON.stringify(collected.metadata[8]?.itemCount)), 
            chalk.hex('#cfa1f0')(JSON.stringify(collected.displayName)),
            "at ",
            ('X:'), chalk.hex('#de495b')(JSON.stringify(Math.round(collected.position.x)), 
            chalk.white('Y:'), Math.round(collected.position.y), 
                chalk.white('Z:'), Math.round(collected.position.z)));
            
            this.autoTotem();
        });

        this.bot.on('itemDrop', (entity) => {
            const item = entity.metadata[8]?.itemId ? this.bot.registry.items[entity.metadata[8].itemId] : null;
            if (item) {
                const itemName = item.displayName || item.name;
                this.logInfo(`${chalk.hex('#cfa1f0')(entity.metadata[8]?.itemCount)} ${chalk.hex('#cfa1f0')(itemName)} appeared at X: ${chalk.hex('#de495b')(Math.round(entity.position.x))}, Y: ${chalk.hex('#de495b')(Math.round(entity.position.y))}, Z: ${chalk.hex('#de495b')(Math.round(entity.position.z))}, Entity ID: ${chalk.hex('#de495b')(entity.id)}`);
            } else {
                this.logError('Dropped item information is not available.');
            }
        });
        
        this.bot.on('kicked', (reason) => {
            this.logWarn(`Kicked: ${JSON.stringify(reason)}`);
            this.reconnect();
        });

        this.bot.on('playerJoined', (player) => {
                this.logJoin(chalk.hex('#b052f2')(`${player.username}`));
        });

        this.bot.on('playerLeft', (player) => {
            this.logLeave(chalk.hex('#b052f2')(`${player.username}`));
        });

        this.bot.on('totemPop', () => {
            if (config.logWhenNoTotem === true && !this.bot.inventory.items().some(item => item.name.includes('totem'))) {
                this.logError('No totems available!');
                if (!process.argv.includes('--noLog')) {
                    this.bot.end();
                    process.exit(0);
                }
            }
        });

        this.bot.on('physicsTick', () => {
            this.bot.armorManager.equipAll();
            this.checkTotemPop();
            this.autoTotem();
            this.autoEat();
        });

        this.bot.on('chat', (username, message) => {
            this.logChat(`<${chalk.hex('#b052f2')(username)}> ${message}`);
        });

        this.bot.on('messagestr', (message, messagePosition, sender) => {
            switch (messagePosition) {           
                case 'game_info':
                    this.logInfo(`${chalk.blue('Game Info:')} ${message}`);
                    break;
            }
        });

        if (config.autoLog === true) {
            this.bot.on('health', () => {
                if (this.bot.health < config.autoLogHealth && !process.argv.includes('--noLog')) {  
                    this.logWarn(`AutoLog`);
                    this.bot.quit();
                }
            });
        }


        /* Chat Commands */
        this.bot.on('whisper', async (username, message, rawMessage) => {
            if (botNames.includes(username)) return;
            if (!message.startsWith("!")) return;

            let msg = message.toString();

            const args = msg.split(' ').slice(1);

            /* ChatBot */
            if (config.chatBot === true) {
                if (msg.startsWith(config.command1)) {
                    if (config.command1trusted === true && username !== owner) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                        return;
                    }
                    this.bot.chat(config.response1);
                }
            }


            /* Commands */
            if (msg.startsWith("!help")) {
                this.bot.chat(`/msg ${username} Minebot NEO ${version} by Eglijohn.`);
                this.bot.chat(`/msg ${username} The owner/s of the bot is/are: ${config.owners.join(', ')}.`);
                this.bot.chat(`/msg ${username} For a list of available commands message me !cmd.`);

            } else if (msg.startsWith('!cmd')) {
                const command = args[0];
                if (!command) {
                    this.bot.chat(`/msg ${username} Available commands: help, commands, [follow], [stopfollow], [quit], [say], players, [pos], [goto], [tp], [drop], [attack], [equip], [range], [scs], basehunt, pearl`);
                    this.bot.chat(`/msg ${username} For more information about a specific command, type !commands <command>`);
                    this.bot.chat(`/msg ${username} Prefix: '!' | [cmd] means only executable by the owner`);
                } else {
                    switch (command) {
                        case 'help':
                            this.bot.chat(`/msg ${username} help - Show help information`);
                            break;
                        case 'commands':
                            this.bot.chat(`/msg ${username} commands - List all available commands or get info about a specific command`);
                            break;
                        case 'follow':
                            this.bot.chat(`/msg ${username} follow - Make the bot follow you [Trusted]`);
                            break;
                        case 'stopfollow':
                            this.bot.chat(`/msg ${username} stopfollow - Make the bot stop following you [Trusted]`);
                            break;
                        case 'quit':
                            this.bot.chat(`/msg ${username} quit - Make the bot quit [Trusted]`);
                            break;
                        case 'say':
                            this.bot.chat(`/msg ${username} say <message> - Make the bot say a message [Trusted]`);
                            break;
                        case 'players':
                            this.bot.chat(`/msg ${username} players - List online players`);
                            break;
                        case 'pos':
                            this.bot.chat(`/msg ${username} pos - Show the bot's current position [Trusted]`);
                            break;
                        case 'goto':
                            this.bot.chat(`/msg ${username} goto <x> <y> <z> - Make the bot go to specified coordinates [Trusted]`);
                            break;
                        case 'tp':
                            this.bot.chat(`/msg ${username} tp <to|axis> <target|offset> <fly> - Teleport the bot to a target or offset [Trusted]`);
                            break;
                        case 'drop':
                            this.bot.chat(`/msg ${username} drop <item_name> <amount> - Drop specified item [Trusted]`);
                            break;
                        case 'attack':
                            this.bot.chat(`/msg ${username} attack <target> <mace> <attacks> - Attack a target [Trusted]`);
                            break;
                        case 'equip':
                            this.bot.chat(`/msg ${username} equip <item_name> <slot> - Equip an item [Trusted]`);
                            break;
                        case 'range':
                            this.bot.chat(`/msg ${username} range - List players in range [Trusted]`);
                            break;
                        case 'scs':
                            this.bot.chat(`/msg ${username} scs <'forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'> <true/false> - Set control state [Trusted]`);
                            break;
                        case 'basehunt':
                            this.bot.chat(`/msg ${username} basehunt - Go basehunting`);
                            break;
                        case 'pearl':
                            this.bot.chat(`/msg ${username} pearl - Activate a stasis chamber [Only for Stasis Chamber Owners]`);
                            break;
                        default:
                            this.bot.chat(`/msg ${username} Unknown command: ${command}`);
                            break;
                    }
                }

            } else if (msg.startsWith("!follow")) {
                if (!config.owners.includes(username)) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }

                const target = this.bot.players[username]?.entity;
                if (target) {
                    this.followPlayer(target);
                    this.bot.chat(`/msg ${username} I am following you. Type !stopfollow or !stop to stop.`);
                } else {
                    this.bot.chat(`/msg ${username} I can't see you`);
                }

            } else if (msg.startsWith("!stopfollow")) {
                if (!config.owners.includes(username)) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
            
                this.stopFollowPlayer();
                this.bot.chat(`/msg ${username} I stopped following you`);
            
            } else if (msg.startsWith("!quit")) {
                if (!config.owners.includes(username)) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                this.bot.quit();
                process.exit(0);

            } else if (msg.startsWith("!say")) {
                const sayMessage = msg.substring(5);
                if (!config.owners.includes(username)) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                this.bot.chat(sayMessage);

            } else if (msg.startsWith("!players")) {
                const playerList = Object.keys(this.bot.players).filter(player => player !== this.bot.username);
                this.bot.chat(playerList.length > 0 ? `/msg ${username} Online players: ${playerList.join(', ')}` : `/msg ${username} No other players are online.`);

            } else if (msg.startsWith("!pos")) {
                if (!config.owners.includes(username)) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                this.bot.chat(`/msg ${username} My current Position: X: ${JSON.stringify(Math.round(this.bot.entity.position.x))}, Y: ${Math.round(this.bot.entity.position.y)}, Z: ${Math.round(this.bot.entity.position.z)}`);

            } else if (msg.startsWith("!goto")) {
                if (!config.owners.includes(username)) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }

                const args = msg.split(' ');
                if (args.length === 4) { 
                    const x = parseFloat(args[1]);
                    const y = parseFloat(args[2]);
                    const z = parseFloat(args[3]);
                    this.goto(x, y, z, username);
                } else {
                    this.bot.chat(`/msg ${username} Usage: !goto <x> <y> <z>`);
                }

            } else if (msg.startsWith("!basehunt")) {
                this.bot.chat(`/msg ${username} Request failed: too lazy.`);

            }  else if (msg.startsWith('!stop')) {
                if (!config.owners.includes(username)) { 
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                
                this.stopAllGoals();
                this.bot.chat(`/msg ${username} All goals have been stopped.`)

            } else if (msg.startsWith('!equip')) {
                if (!config.owners.includes(username)) { 
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                
                const item = this.bot.inventory.items().find(i => i.name === args[0]);

                if (!item) {
                    this.bot.chat(`/msg ${username} I don't have any ${args[0]}.`);
                    return;
                }

                const validSlots = ['hand', 'head', 'chest', 'legs', 'feet', 'off-hand'];
                if (!validSlots.includes(args[1])) {
                    this.bot.chat(`/msg ${username} Invalid slot provided for equip: ${args[1]}. Try hand, head, chest, legs, feet, off-hand.`);
                    return;
                }

                this.bot.equip(item, args[1]).then(() => {
                    this.bot.chat(`/msg ${username} Equipped ${item.displayName} in ${args[1]}.`);
                }).catch(err => {
                    this.bot.chat(`/msg ${username} Failed to equip ${item.displayName} in ${args[1]}: ${err.message}`);
                });

            } else if (msg.startsWith('!range')) {
                if (!config.owners.includes(username)) { 
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }

                const playersInRange = Object.values(this.bot.entities)
                    .filter(entity => entity.type === 'player' && entity !== this.bot.entity)
                    .map(entity => {
                        return { username: entity.username, distance: this.bot.entity.position.distanceTo(entity.position) };
                    });

                if (playersInRange.length > 0) {
                    playersInRange.forEach(player => {
                        this.bot.chat(`/msg ${username} ${player.username}: ${Math.round(player.distance)}m`);
                    });
                } else {
                    this.bot.chat(`/msg ${username} No players in range.`);
                }

            } else if (msg.startsWith('!scs')) {
                if (!config.owners.includes(username)) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                
                if (['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'].includes(args[0])) {
                    this.bot.setControlState(args[0], args[1] === 'true');
                } else {
                    this.bot.chat(`/msg ${username} Try !scs <'forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'> <true/false>`);
                }

            } else if (msg.startsWith('!attack')) {
                if (!config.owners.includes(username)) { 
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                
                let target = Object.values(this.bot.entities).find(entity => entity.username === args[0] || entity.id === args[0]);

                if (!target) {
                    this.bot.chat(`/msg ${username} Invalid target: ${args[0]}`);
                    return;
                }

                const distance = this.bot.entity.position.distanceTo(target.position);
                if (distance > 10) {
                    this.bot.chat(`/msg ${username} Target is ${Math.round(distance)}m away.`);
                    return;
                }

                this.tp(target.position.x, target.position.y, target.position.z, 'fly');

                if (args[1] === 'mace') {
                    this.mace(target, args[2]);
                } else {
                    this.bot.attack(target);
                }

                this.tp(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z);
                this.bot.chat(`/msg ${username} Attacking target: ${target.username || target.id}`);

            } else if (msg.startsWith('!drop')) {
                if (!config.owners.includes(username)) { 
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                
                if (!args[0]) {
                    this.bot.chat(`/msg ${username} Usage: !drop <item_name> <amount>`);
                    return;
                }
                
                const itemName = args[0];
                const amount = parseInt(args[1], 10) || 1;
                if (isNaN(amount) || amount <= 0) {
                    this.bot.chat(`/msg ${username} Amount must be a positive number.`);
                    return;
                }
                
                this.dropItem(itemName, amount).catch(err => {
                    this.bot.chat(`/msg ${username} Failed to drop item: ${err.message}`);
                });

            } else if (msg.startsWith('!tp')) {
                if (!config.owners.includes(username)) { 
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                
                this.bot.chat(`/msg ${username} Trying to tp...`);

                if (args[0] === 'to') {
                    let tptarget = Object.values(this.bot.entities).find(entity => entity.username === args[1] || entity.id === args[1]);

                    if (!tptarget) {
                        this.bot.chat(`/msg ${username} Invalid target: ${args[1]}`);
                        return;
                    }

                    const tpdistance = this.bot.entity.position.distanceTo(tptarget.position);
                    if (tpdistance > 10 && args[2] !== 'fly') {
                        this.bot.chat(`/msg ${username} Target is ${Math.round(tpdistance)}m away.`);
                        return;
                    }

                    this.tp(tptarget.position.x, tptarget.position.y, tptarget.position.z, args[2]);
                } else {
                    const axis = args[0];
                    const offset = parseInt(args[1], 10);

                    if (isNaN(offset)) {
                        this.bot.chat(`/msg ${username} Invalid number provided for tp: ${args[1]}. Try !tp <axis> <offset> <fly>`);
                        return;
                    }

                    if (offset > 10 && args[2] !== 'fly') {
                        this.bot.chat(`/msg ${username} Offset must be max. 10. Try fly for max. 16.`);
                        return;
                    }

                    if (offset > 16 && args[2] === 'fly') {
                        this.bot.chat(`/msg ${username} Offset must be max. 16 with fly enabled.`);
                        return;
                    }

                    let newPos = { ...this.bot.entity.position };
                    newPos[axis] += offset;
                    this.tp(newPos.x, newPos.y, newPos.z, args[2]);
                }

            } else if (msg.startsWith('!tfly')) {
                if (!config.owners.includes(username)) { 
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                
                let fly = args[0]

                this.tp(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z, fly);
                if (fly) {
                    this.bot.chat(`/msg ${username} Fly enabled.`);
                } else {
                    this.bot.chat(`/msg ${username} Fly disabled.`);
                }
            }
        });
    }
}


/* Start a WebServer for idk what */
if (config.experimentalFeatures === true) {
    new WebServer();
}  // HERE WAS THE FIRST 1K LINE!!!!11!1!

async function main() {
    await readConfigFile();
    const { username, auth } = await readAccountFile();
    new MCBot(username, auth);
}

main();