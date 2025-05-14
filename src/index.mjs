import { logInfo, logWarn, logError, logJoin, logLeave, logChat } from "./utils/logger.js";
import { config, botArgs, readConfigFile, addToBlacklist, removeFromBlacklist, reloadConfig, addPearl } from "./utils/dataManagement.js";
import mineflayerWebInventory from "mineflayer-web-inventory";
import armorManager from 'mineflayer-armor-manager';
import { WebServer } from "./utils/webserver.js";
import { startViewer } from "./panel/viewer.js";
import minecraftData from 'minecraft-data';
import { vclip, paperclip } from './modules/teleport.js';
import { maceAttack, attack } from './modules/attack.js';
import pkg from 'mineflayer-pathfinder';
import { title } from "./misc/title.js";
import { readFile } from 'fs/promises';
import mineflayer from 'mineflayer';
import readline from 'readline';
import chalk from 'chalk';
import Vec3 from 'vec3';
import { killAura } from "./modules/killaura.js";
import { autoEat } from "./modules/autoEat.js";
import { setTimeout } from "timers";
import { dropItem } from "./modules/dropItem.js";
import { touchBall } from "./modules/stasisBot.js";
import { formatUptime } from "./utils/uptime.js";
import fs from 'fs';

const { pathfinder, Movements, goals } = pkg;
let activePlayers = [];
let botInstance = null;
let predictionPlayers = [];
let predictedPositions = [];
let diedEntities = [];

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

if (config.title === true) title();

/* MC Bot */
class MCBot {
    constructor(username, auth) {
        this.username = username;
        this.auth = auth;
        this.host = botArgs.host;
        this.port = botArgs.port;
        this.version = botArgs.version;
        this.lookAtNearestPlayerInterval = null;
        this.lastHeight = null;
        this.startViewer = startViewer;

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

        botInstance = this;
        this.bot = mineflayer.createBot(botOptions);
        this.mcData = minecraftData(this.bot.version);

        /* Load Plugins */
        this.bot.loadPlugin(pathfinder);
        this.bot.loadPlugin(armorManager);

        this.initEvents();

        this.bot.once('spawn', () => {

            /* Experimental Features */
            if (process.argv.includes('--experiments')) {
                
            }

            try {
                this.startViewer();
            } catch (error) {
                logError('Failed to start viewer:', error);
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

    closeAllPorts() {
        if (this.bot.viewer && this.bot.webInventory) {
            this.bot.viewer.close();
            this.bot.webInventory.stop();
        }
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
            console.log('Bro use !quit and not Ctrl+C');
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
        if (config.autoReconnect === true) {
            setTimeout(() => {
                this.initBot();
            }, config.reconnectTimeout);
        } else {
            process.exit(0);
        }
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


    /* Look at nearest Player */
    lookAtNearestPlayer() {
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
                    this.bot.lookAt(nearestPlayer.entity.position.offset(0, nearestPlayer.entity.height - 0.18, 0));
                } catch (err) {
                    logError(`Failed to look at ${nearestPlayer.username}: ${err.message}`);
                }
            } else {
                return;
            }
        }
    }


    async executeCommand(command) {
        const [cmd, ...args] = command.split(' ');

        switch (cmd) {
            case 'help':
                const command = args[0];
                if (!command) {
                    logInfo(`Available commands: help, players, quit, info, invsee, follow, stopfollow, goto, pos, drop, rejoin, stop, tp, tfly, attack, scs, range, equip, mb, uptime, vclip, blacklist, reloadconfig`);
                    logInfo(`For more information about a specific command, type !help <command>`);
                } else {
                    const commandResponses = {
                        help: 'Displays Help Information.',
                        players: 'Displays a List of online Players',
                        quit: 'Ends the Bot',
                        info: 'Display Information about the Bot and the Server the Bot is running on',
                        invsee: 'Show the Bots inventory content',
                        follow: 'follow <username> - Follow a Player',
                        stopfollow: 'Stop following a Player',
                        goto: 'goto <x> <y> <z> - go to specified coordinates',
                        pos: 'Display the current Position',
                        drop: 'drop <item> <amount> - drop Items',
                        rejoin: 'Logoff and rejoin after a specified time',
                        tp: 'tp <x, y, z|player> - teleports the player to a offset or player. Max. 200 Blocks.',
                        attack: 'attack <target> <mace> <count|insta> - attack a target with reach and macekill or totembypass him',
                        scs: 'scs <forward|back|left|right|jump|sprint|sneak> <true/false> - set control state',
                        range: 'range - display players in range',
                        equip: 'equip <item_name> <hand|head|torso|legs|feet|off-hand> - equip item',
                        mb: 'mb - display Minebot ASCII Art',
                        uptime: 'uptime - display uptime',
                        vclip: 'vclip <blocks> - Teleport in the air (max 100 blocks)',
                        blacklist: 'blacklist <add|remove|list|reason> <player> <reason> - manage the blacklist',
                        reloadconfig: 'reloadconfig - reload the configuration file'
                    }
                    logInfo(`${command}: ${commandResponses[command]}`);
                }
                break;

            case 'players':
                const playerList = Object.keys(this.bot.players).filter(player => player !== this.bot.username);
                logInfo(playerList.length > 0 ? `Online players: ${playerList.join(', ')}` : `No other players are online.`);
                break;

            case 'quit':
                this.bot.end();
                process.exit(0);

            case 'info':
                logInfo(`--Infos--`);
                logInfo('Server:');
                logInfo(`    Host:           ${chalk.hex('#cfa1f0')(this.host)}`);
                logInfo(`    Port:           ${chalk.hex('#cfa1f0')(this?.port || 'Not needed')}`);
                logInfo(`    Time:           ${chalk.hex('#cfa1f0')(this.bot.time.timeOfDay)}`);
                logInfo(``);
                logInfo('Bot:');
                logInfo(`    View Distance:  ${chalk.hex('#cfa1f0')(this.bot.settings.viewDistance)}`);
                logInfo(`    Health:         ${chalk.hex('#cfa1f0')(Math.round(this.bot.health * 2) / 2)}`);
                logInfo(`    XP:             ${chalk.hex('#cfa1f0')(this.bot.experience.points)}`, chalk.hex('#cfa1f0')('Points'));
                logInfo(`    Food:           ${chalk.hex('#cfa1f0')(this.bot.food)}`);
                logInfo(`    Oxygen:         ${chalk.hex('#cfa1f0')(this.bot?.oxygenLevel || 'Not in water')}`);
                logInfo(`    Gamemode:       ${chalk.hex('#cfa1f0')(this.bot.game.gameMode)}`);
                logInfo(`    Dimension:      ${chalk.hex('#cfa1f0')(this.bot.game.dimension)}`);
                logInfo(`    Difficulty:     ${chalk.hex('#cfa1f0')(this.bot.game.difficulty)}`);
                logInfo(`    Position:       ${(`X: ${chalk.hex('#de495b')(JSON.stringify(Math.round(this.bot.entity.position.x)),
                    chalk.white('Y:'), Math.round(this.bot.entity.position.y),
                    chalk.white('Z:'), Math.round(this.bot.entity.position.z))}`)}`);
                break;

            case 'invsee':
                const heldItem = this.bot.heldItem;
                const offhandItem = this.bot.inventory.slots[45];
                const inventoryItems = this.bot.inventory.items().map(item => `${chalk.hex('#cfa1f0')(item.displayName)} (x${chalk.hex('#cfa1f0')(item.count)})`);
                logInfo(`Inventory: \n${inventoryItems.length > 0 ? inventoryItems.join(', \n') : 'Inventory is empty'}`);
                if (offhandItem) {
                    logInfo(`Offhand Item: ${chalk.hex('#cfa1f0')(offhandItem.displayName)} (x${chalk.hex('#cfa1f0')(offhandItem.count)})`);
                }
                if (heldItem) {
                    logInfo(`Held Item: ${chalk.hex('#cfa1f0')(heldItem.displayName)} (x${chalk.hex('#cfa1f0')(heldItem.count)})`);
                } if (mineflayerWebInventory) {
                    logInfo(`Web Inventory: http://localhost:${config.webInventoryPort}`);
                } else {
                    logInfo('No item is currently held.');
                }
                break;

            case 'follow':
                const targetPlayer = this.bot.players[args[0]]?.entity;
                if (targetPlayer) {
                    this.followPlayer(targetPlayer)
                } else {
                    logError(`Player ${chalk.hex('#cfa1f0')(args[0])} not found or not visible.`);
                }
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
                    logError(`Usage: !goto <x> <y> <z>.`);
                }
                break;

            case 'pos':
                logInfo(`My current Position: ${(`X: ${chalk.hex('#de495b')(JSON.stringify(Math.round(this.bot.entity.position.x)),
                    chalk.white('Y:'), Math.round(this.bot.entity.position.y),
                    chalk.white('Z:'), Math.round(this.bot.entity.position.z))}`)}`)
                break;

            case 'drop':
                if (args.length < 1) {
                    logInfo('Usage: !drop <item_name> <amount>');
                } else {
                    const itemName = args[0];
                    const amount = parseInt(args[1], 10) || 1;
                    if (isNaN(amount) || amount <= 0) {
                        logInfo('Amount must be a positive number.');
                    } else {
                        dropItem(itemName, amount);
                    }
                }
                break;

            case 'rejoin':
                this.reconnect();
                break;

            case 'stop':
                this.stopAllGoals();
                logWarn('Stopped all goals.');
                break;

            case 'attack':
                const attackMode = args.includes('insta') ? 'insta' : parseInt(args[args.length - 1], 10) || 1;
                const useMace = args.includes('mace');
                const targetNames = args.filter(arg => arg !== 'mace' && arg !== 'insta');

                const targets = targetNames.map(arg =>
                    Object.values(this.bot.entities).find(entity => entity.type === 'player' && entity.username === arg && entity.username !== this.bot.username)
                ).filter(target => target && target.position);

                if (targets.length === 0) {
                    logError(`No valid targets found.`);
                    return;
                }

                targets.forEach((target, index) => {
                    setTimeout(() => {
                        const distance = this.bot.entity.position.distanceTo(target.position);
                        if (distance > config.generalReach) {
                            logError(`Target ${target.username || target.id} is ${Math.round(distance)}m away.`);
                            return;
                        }

                        if (useMace) {
                            maceAttack(target, attackMode);
                        } else {
                            attack(target);
                        }
                    }, index * 100);
                });
                break;

            case 'scs':
                if (args[1] === 'true') {
                    this.bot.setControlState(args[0], true);
                } else if (args[1] === 'false') {
                    this.bot.setControlState(args[0], false);
                } else {
                    logError(`Try !scs <'forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'> <true/false>`)
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
                        logInfo(chalk.hex('#cfa1f0')(`${player.username} [${Math.round(player.distance)}m]`));
                    });
                } else {
                    loginfo('No players in range.');
                }
                return;

            case 'equip':
                const item = this.bot.inventory.items().find(i => i.name === args[0]);

                if (!item) {
                    logError(`I don't have any ${args[0]}.`);
                    return;
                } else try {
                    if (args[1] !== 'hand' && args[1] !== 'head' && args[1] !== 'torso' && args[1] !== 'legs' && args[1] !== 'feet' && args[1] !== 'off-hand') {
                        logError(`Invalid slot provided for equip: ${args[1]}. Try hand, head, torso, legs, feet, off-hand.`);
                        break;
                    } else {
                        this.bot.equip(item, args[1]);
                        logInfo(`Equipped ${item.displayName} in ${args[1]}.`);
                    }
                } catch (err) {
                    logError(`Failed to equip ${item.displayName} in ${args[1]}: ${err.message}`);
                }
                break;

            case 'mb':
                logInfo(chalk.hex('#6DCEFF')('+++++       +++++') + chalk.hex('#267499')('π+++++'));
                logInfo(chalk.hex('#6DCEFF')('++++++      +++++') + chalk.hex('#267499')('π+++++++'));
                logInfo(chalk.hex('#6DCEFF')('+++++++    ++++++') + chalk.hex('#267499')('   +++++'));
                logInfo(chalk.hex('#6DCEFF')('+++++++    ++++++') + chalk.hex('#267499')('  ++++++'));
                logInfo(chalk.hex('#6DCEFF')('++++++++  +++++++') + chalk.hex('#267499')('π+++++'));
                logInfo(chalk.hex('#6DCEFF')('+++++++++++++++++') + chalk.hex('#267499')('   +++++'));
                logInfo(chalk.hex('#6DCEFF')('++++ +++++++ ++++') + chalk.hex('#267499')('   ++++++'));
                logInfo(chalk.hex('#6DCEFF')('++++  +++++  ++++') + chalk.hex('#267499')('π+++++++'));
                logInfo(chalk.hex('#6DCEFF')('++++  +++++  ++++') + chalk.hex('#267499')('π++++++'));
                logInfo(chalk.gray(`RIP Minebot NEO.`));
                break;

            case 'uptime':
                logInfo(`Uptime: ${formatUptime(process.uptime())}`);
                break;

            case 'vclip':
                const y = parseInt(args[0], 10) || 0;
                vclip(y);
                break;

            case 'tp':
                if (args.length === 1) {
                    const targetPlayer = args[0];
                    paperclip(targetPlayer);
                } else if (args.length === 3) {
                    const tpx = parseFloat(args[0]);
                    const tpy = parseFloat(args[1]);
                    const tpz = parseFloat(args[2]);

                    if (!isNaN(tpx) && !isNaN(tpy) && !isNaN(tpz)) {
                        paperclip(tpx, tpy, tpz);
                        logInfo(`Teleporting to ${tpx}, ${tpy}, ${tpz}`);
                    } else {
                        logError(`Invalid coordinates. Please provide valid numbers.`);
                    }
                } else {
                    logError(`Usage: !tp <x> <y> <z> or !tp <player>`);
                }
                break;

            case 'blacklist':
                switch (args[0]) {
                    case 'add':
                        if (args.length < 2) {
                            logError(`Usage: !blacklist add <username> <reason>`);
                            return;
                        }
                        if (config.blacklist.some(player => player.username === args[1])) {
                            logError(`Player ${args[1]} is already blacklisted.`);
                            return;
                        }
                        const reason = args.slice(2).join(' ') || 'No reason provided';
                        addToBlacklist(args[1], reason);
                        reloadConfig();
                        logInfo(`Added ${args[1]} to the blacklist and updated the config.`);
                        break;

                    case 'remove':
                        if (args.length < 2) {
                            logError(`Usage: !blacklist remove <username>`);
                            return;
                        }
                        if (!config.blacklist.some(player => player.username === args[1])) {
                            logError(`Player ${args[1]} is not blacklisted.`);
                            return;
                        }
                        removeFromBlacklist(args[1]);
                        reloadConfig();
                        logInfo(`Removed ${args[1]} from the blacklist and updated the config.`);
                        break;

                    case 'list':
                        if (config.blacklist.length === 0) {
                            logInfo(`No players are blacklisted.`);
                        } else {
                            logInfo(`Blacklisted players: ${config.blacklist.map(player => player.username).join(', ')}`);
                        }
                        break;

                    case 'reason':
                        if (args.length < 2) {
                            logError(`Usage: !blacklist reason <username>`);
                            return;
                        }
                        const blacklistedPlayer = config.blacklist.find(player => player.username === args[1]);
                        if (!blacklistedPlayer) {
                            logInfo(`Player ${args[1]} is not blacklisted.`);
                        } else {
                            logInfo(`${blacklistedPlayer.username}: ${blacklistedPlayer.reason}`);
                        }
                        break;
                }
                break;

            case 'reloadconfig':
                reloadConfig();
                logInfo(`Configuration reloaded successfully.`);
                break;

            default:
                logError(`Command '${chalk.hex('#cfa1f0')(cmd)}' not found. Enter !help for a list of available commands.`);
                break;
        }
    }


    /* Follow Player */
    followPlayer(target) {
        ;
        const movements = new Movements(this.bot, this.mcData);

        movements.canDig = config.canDig;
        movements.canPlace = config.canPlace;
        this.bot.pathfinder.setMovements(movements);

        const goal = new goals.GoalFollow(target, 1);
        this.bot.pathfinder.setGoal(goal, true);
        logInfo(`Now following ${chalk.hex('#cfa1f0')(target.username)}`);
    }

    /* Stop Follow Player */
    stopFollowPlayer() {
        this.bot.pathfinder.setGoal(null);
        logInfo('Stopped following.');
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

            this.bot.chat(`/msg ${username} I am going to ${x}, ${y}, ${z}`);
        } else {
            this.bot.chat(`/msg ${username} Invalid coordinates. Please provide numbers.`);
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
                logInfo(`I am going to (${chalk.hex('#cfa1f0')(x)}, ${chalk.hex('#cfa1f0')(y)}, ${chalk.hex('#cfa1f0')(z)})`);
            } else {
                logInfo(`I am going to (${chalk.hex('#cfa1f0')(x)}, ${chalk.hex('#cfa1f0')(y)}, ${chalk.hex('#cfa1f0')(z)})`);
            }
        } else {
            logError(username ? `Invalid coordinates. Please provide numbers.` : `Invalid coordinates. Please provide numbers.`);
        }
    }


    /* Stop Pathfinding */
    stopAllGoals() {
        this.bot.pathfinder.setGoal(null);
    }


    /* Events */
    initEvents() {
        let lastItems = [];
        let lastHealth;

        this.bot.on('login', () => {
            if (process.argv.includes('--debug')) {
                setTimeout(() => {
                    logInfo(chalk.green(`Logged in at ${chalk.yellow(this.host ? this.host : this.port)} as ${chalk.yellow(this.bot.username)}, version ${chalk.yellow(this.bot.version)}`));
                    logInfo(chalk.green(`autoLog set to '${chalk.yellow(config.autoLog)}', autoLogHealth set to '${chalk.yellow(config.autoLogHealth)}'`))
                    logInfo(chalk.green(`noChat set to '${chalk.yellow(config.noChat)}'`))
                    logInfo(chalk.green(`antiAFK set to '${chalk.yellow(config.antiAFK)}'`))
                    logInfo(chalk.green(`chatBot set to '${chalk.yellow(config.chatBot)}'`))
                    logInfo(chalk.green(`lookAtNearestPlayer set to '${chalk.yellow(config.lookAtNearestPlayer)}, lookAtNearestPlayerInterval set to '${chalk.yellow(config.lookAtNearestPlayerInterval)}'`))
                    logInfo(chalk.green(`noFall set to '${chalk.yellow(config.noFall)}'`))
                    logInfo(chalk.green(`autoReconnect set to '${chalk.yellow(config.autoReconnect)}, reconnectTimeout set to '${chalk.yellow(config.reconnectTimeout)}'`))
                    logInfo(chalk.green(`hideErrors set to '${chalk.yellow(config.hideErrors)}'`))
                    logInfo(chalk.green(`customBrand set to '${chalk.yellow(config.customBrand)}'`))
                    logInfo(chalk.green(`commandPrefix set to '${chalk.yellow(config.commandPrefix)}'`))
                    logInfo(chalk.green(`Position: X: ${chalk.yellow(Math.round(this.bot.entity.position.x))}, Y: ${chalk.yellow(Math.round(this.bot.entity.position.y))}, Z: ${chalk.yellow(Math.round(this.bot.entity.position.z))}`))
                }, 500);
            }
        });

        this.bot.on('end', (reason) => {
            this.closeAllPorts();
            logWarn(`Connection lost: ${chalk.hex('#cfa1f0')(reason)}`);
            this.reconnect();
        });

        this.bot.on('spawn', () => {
            const defaultMove = new Movements(this.bot, this.mcData);
            this.bot.pathfinder.setMovements(defaultMove);
            logInfo('Spawned');
        });

        this.bot.on('health', () => {
            if (lastHealth !== null && Math.round(this.bot.health * 2) / 2 !== lastHealth) {
                logWarn(`Health Update. Current health: ${chalk.hex('#cfa1f0')(Math.round(this.bot.health * 2) / 2)}`);
                lastHealth = Math.round(this.bot.health * 2) / 2;
            }
        });

        this.bot.on('food', () => {
            logInfo(`Food Update. Current food: ${chalk.hex('#cfa1f0')(Math.round(this.bot.food * 2) / 2)}`);
            autoEat();
        });

        this.bot.on('entityDead', (entity) => {
            logInfo(`${chalk.hex('#cfa1f0')(entity?.username || entity?.displayName || 'Entity')} died`);
            diedEntities.push(entity.entityId);
            setTimeout(() => {
                diedEntities = diedEntities.filter(e => e !== entity.entityId);
            }, 5000);
        });

        this.bot.on('death', () => {
            logWarn('Died');
            if (config.stopGoalsOnDeath === true) {
                if (this.flyInterval !== null) {
                    clearInterval(this.flyInterval);
                    this.flyInterval = null;
                }
            }
        });

        this.bot.on('respawn', () => {
            setTimeout(() => {
                if (this.bot.viewer) {
                    this.bot.viewer.erase('pathWalked');
                    this.bot.viewer.erase('path');
                }
                this.bot.pathfinder.setGoal(null);
                logWarn(`Respawned at ${chalk.hex('#cfa1f0')(`X: ${Math.round(this.bot.entity.position.x)}, Y: ${Math.round(this.bot.entity.position.y)}, Z: ${Math.round(this.bot.entity.position.z)}`)}`);
            }, 10);
        });

        this.bot.on('move', () => {
            if (config.noFall === true) {
                const currentHeight = this.bot.entity.position.y;
                if (this.lastHeight !== null && this.lastHeight - currentHeight >= 2) {
                    this.bot._client.write('position', { x: this.bot.entity.position.x, y: this.lastHeight, z: this.bot.entity.position.z }, { onGround: true });
                    this.lastHeight = currentHeight;
                } else {
                    this.lastHeight = currentHeight;
                }
            }
        });

        this.bot.on('entitySpawn', (entity) => {
            if (entity.type === 'player' && entity.username !== this.bot.username && !config.ignorePlayers.includes(entity.username)) {
                const playerName = entity.username;
                logInfo(`${chalk.hex('#cfa1f0')(playerName)} ${chalk.hex('#cfa1f0')(`[${this.bot.entity.position.distanceTo(entity.position).toFixed(1)}m]`)} has entered my view.`);

                if (config.greetPlayers) {
                    const isTrustedPlayer = Array.isArray(config.trustedPlayers)
                        ? config.trustedPlayers.includes(playerName)
                        : playerName === config.trustedPlayers;

                    if (isTrustedPlayer) {
                        this.bot.chat(`/msg ${playerName} ${config.greetMsg}`);
                    } else {
                        this.bot.chat(`/msg ${playerName} ${config.unknownPlayerMsg}`);
                        logWarn(`Player ${playerName} is not trusted.`);
                    }
                }

            } else if (entity.type === 'ender_pearl') {
                logInfo(entity.thrower)
            }
        });

        this.bot.on('entityGone', (entity) => {
            if (entity.type === 'player' && entity.username !== this.bot.username && !config.ignorePlayers.includes(entity.username)) {
                const playerName = entity.username;
                logInfo(`${chalk.hex('#cfa1f0')(playerName)} ${chalk.hex('#cfa1f0')(`[${this.bot.entity.position.distanceTo(entity.position).toFixed(1)}m]`)} has left my view.`);
            }
        });

        this.bot.on('playerCollect', (collector, collected) => {
            if (collected.name === 'experience_orb') {
                const experienceCount = collected.count || "Unknown amount";
                logInfo(`${chalk.hex('#b052f2')(collector.username)} collected ${chalk.hex('#cfa1f0')('experience orb')} with ${chalk.hex('#cfa1f0')(experienceCount)} XP at X: ${chalk.hex('#de495b')(Math.round(collected.position.x))}, Y: ${chalk.hex('#de495b')(Math.round(collected.position.y))}, Z: ${chalk.hex('#de495b')(Math.round(collected.position.z))}`);
                return;
            }

            const itemData = collected.metadata[8];

            if (!itemData || !itemData.itemId) {
                if (process.argv.includes('--debug')) {
                    logError("Item metadata missing!");
                }
                return;
            }

            const item = this.bot.registry.items[itemData.itemId];
            const itemName = item ? item.displayName || item.name : "Unknown Item";
            const itemCount = itemData.itemCount || "Unknown Count";
            const itemPos = (`X: ${chalk.hex('#de495b')(Math.round(collected.position.x))}, Y: ${chalk.hex('#de495b')(Math.round(collected.position.y))}, Z: ${chalk.hex('#de495b')(Math.round(collected.position.z))}` || 'Unknown Position')
            logInfo(`${chalk.hex('#b052f2')(collector.username)} picked up ${chalk.hex('#cfa1f0')(itemCount)} ${chalk.hex('#cfa1f0')(itemName)} at ${itemPos}`);
        });

        this.bot.on('itemDrop', (entity) => {
            const metadata = entity.metadata[8];
            const item = metadata?.itemId ? this.bot.registry.items[metadata.itemId] : null;

            if (lastItems.includes(entity.id)) return;
            lastItems.push(entity.id);
            setTimeout(() => {
                lastItems = lastItems.filter(id => id !== entity.id);
            }, 5000);

            if (item) {
                const itemName = item.displayName || item.name || "Unknown Item";
                const itemCount = metadata?.itemCount ?? "Unknown Count";

                logInfo(`${chalk.hex('#cfa1f0')(itemCount)} ${chalk.hex('#cfa1f0')(itemName)} appeared at X: ${chalk.hex('#de495b')(Math.round(entity.position.x))}, Y: ${chalk.hex('#de495b')(Math.round(entity.position.y))}, Z: ${chalk.hex('#de495b')(Math.round(entity.position.z))}, Entity ID: ${chalk.hex('#de495b')(entity.id)}`);
            } else {
                logError('Dropped item information is not available.');
            }
        });


        this.bot.on('kicked', (reason) => {
            logWarn(`Kicked: ${JSON.stringify(reason)}`);
            this.reconnect();
        });

        this.bot.on('playerJoined', (player) => {
            logJoin(chalk.hex('#b052f2')(player.username), config.friends.includes(player.username) ? chalk.blue('[Friend]') : ' ');
            if (config.scaryPlayers.includes(player.username)) {
                logWarn('Scawy player joined:', player.username, ':(');
                this.bot.quit();
                process.exit();
            }
            if (config.famousYoutubers.includes(player.username)) {
                this.bot.chat(`/msg ${player.username} ${player.username}, my supersmart artificial intelligence has detected that your a famous YouTuber 🤓. Welcome to Simpcraft, where a Simp can be a Simp!`);
                this.bot.chat(`/msg ${player.username} Greetings - Eglijohn [dev], R3akeOn3_ and Superheld2006`);
            }
            if (!activePlayers.includes(player.username)) {
                activePlayers.push(player.username);
            }
        });

        this.bot.on('playerLeft', (player) => {
            logLeave(chalk.hex('#b052f2')(player.username), config.friends.includes(player.username) ? chalk.blue('[Friend]') : ' ');
            activePlayers = activePlayers.filter(name => name !== player.username);
        });

        this.bot._client.on('packet', (data, metadata) => {
            if (config.packetLogger === true && config.packets.includes(metadata.name)) {
                logInfo(`[${metadata.name}] ${JSON.stringify(metadata)} ${JSON.stringify(data)}`);
            }

            switch (metadata.name) {
                case 'entity_status':
                    if (data.entityStatus === 35) {
                        const entity = this.bot.entities[data.entityId];
                        if (entity) {
                            logWarn(`${entity.username || entity.id} Popped a Totem`);
                            if (entity.username === this.bot.username && config.logOnTotemPop === true && !process.argv.includes('--noLog')) {
                                this.bot.end();
                                process.exit(0);
                            } else {
                                const totem = this.bot.inventory.items().find(item => item.name.includes('totem'));
                                if (totem && !this.bot.inventory.slots[45]) {
                                    try {
                                        this.bot.equip(totem, 'off-hand');
                                        logInfo(`Equipped ${totem.displayName} in off-hand`);
                                    } catch (err) {
                                        logError(`Failed to equip ${totem.displayName} in off-hand: ${err.message}`);
                                    }
                                }
                            }
                        }
                    }
                    break;

                case 'damage_event':
                    const attacker = this.bot.entities[data.sourceCauseId - 1];
                    const target = this.bot.entities[data.entityId];

                    if (target?.type !== 'player') return;
                    const mace = this.bot.inventory.items().find(item => item.name.includes('mace'));

                    logWarn(attacker?.username || attacker?.displayName || 'Something', 'attacked', target?.username || target?.displayName || 'Undefined');

                    if (target?.username === this.bot.username && !config.friends.includes(attacker?.username) && config.autoBlacklist === true && attacker?.type === 'player' && !config.blacklist.some(player => player.username === attacker?.username)) {
                        addToBlacklist(attacker?.username || attacker?.displayName, 'autoBlacklist');
                        reloadConfig();
                        logWarn(`Added ${attacker?.username || attacker?.displayName} to the blacklist.`);
                    }

                    if (config.killAssistPlayers.includes(attacker?.username) && config.killAssist === true && !config.friends.includes(target?.username)) {
                        if (mace) {
                            maceAttack(target, 1);
                        } else {
                            attack(target);
                        }
                    }

                    if ((target?.username === this.bot.username || config.retaliatePlayers.includes(target?.username))) {
                        if (config.retaliate === true && attacker && attacker?.username !== this.bot.username) {
                            const distance = attacker.position.distanceTo(this.bot.entity.position);

                            if (config.friends.includes(attacker.username) && attacker !== this.bot.entity) {
                                logError('Attacker is a friend.');
                                return;
                            } else if (distance < config.generalReach) {
                                if (mace) {
                                    maceAttack(attacker, 1);
                                } else {
                                    attack(attacker);
                                }
                            } else {
                                logError('Attacker is out of range.');
                            }
                        }
                    }
                    break;

                case 'spawn_entity':
                    if (data.type === this.mcData.entitiesByName['ender_pearl'].id) {
                        setTimeout(() => {
                            if (data.objectData === 0) return;
                            const thrower = this.bot.entities[data.objectData];
                            if (!thrower) return;

                            const pearlPos = new Vec3(data.x, data.y, data.z);
                            let foundTrapdoor = null;
                            let yOffset = 0;

                            while (!foundTrapdoor && yOffset < 20) {
                                const blockAbove = this.bot.blockAt(pearlPos.offset(0, yOffset, 0));
                                const blockBelow = this.bot.blockAt(pearlPos.offset(0, -yOffset, 0));

                                if (blockAbove && blockAbove.name.includes('trapdoor') && !blockAbove.name.includes('iron')) {
                                    foundTrapdoor = blockAbove;
                                } else if (blockBelow && blockBelow.name.includes('trapdoor') && !blockBelow.name.includes('iron')) {
                                    foundTrapdoor = blockBelow;
                                }

                                yOffset++;
                            }

                            logInfo(`Ender Pearl thrown by ${thrower.username}. Assigned trapdoor: ${foundTrapdoor?.position || 'None'}`);
                            if (foundTrapdoor) {
                                addPearl(thrower.username, [foundTrapdoor.position.x, foundTrapdoor.position.y, foundTrapdoor.position.z], data.entityId);
                                this.bot.chat(`/msg ${thrower.username} You threw an ender pearl. Msg me '!p' so I can touch your ball.`);
                            }
                        }, 100);
                    }
                    break;

                case 'entity_teleport':
                    const entity = this.bot.entities[data.entityId];
                    setTimeout(() => {
                        if (entity && entity.type === 'player') {
                            const playerIndex = predictionPlayers.findIndex(player => player.username === entity.username);
                            if (playerIndex !== -1) {
                                predictionPlayers[playerIndex].position = [data.x, data.y, data.z];
                            } else {
                                predictionPlayers.push({ username: entity.username, position: [data.x, data.y, data.z] });
                            }
                        }
                        if (process.argv.includes('--debug')) {
                            logInfo(`Entity Move: ${entity?.username || entity?.displayName || 'Unknown'} to X: ${data.x}, Y: ${data.y}, Z: ${data.z}`);
                        }
                    }, 50);
                    if (predictionPlayers.find(player => player.username === entity?.username)?.position && process.argv.includes('--debug')) {
                        const [lastX, lastY, lastZ] = predictionPlayers.find(player => player.username === entity?.username)?.position;
                        logInfo(`${entity?.username || entity?.displayName || 'Unknown'} moved to X: ${data.x}, Y: ${data.y}, Z: ${data.z}. Predicted Position: ${lastX + (data.x - lastX)}, ${lastY + (data.y - lastY)}, ${lastZ + (data.z - lastZ)}`);
                        break;
                    }
            }
        });

        this.bot._client.on('emitPacket', (data, metadata) => {
            logInfo(`Packet: ${metadata.name} ${JSON.stringify(data)}`);
        })

        this.bot.on('physicsTick', () => {
            if (config.autoArmor === true) {
                this.bot.armorManager.equipAll();
            }

            if (config.noVelocity === true) {
                this.bot.entity.velocity = Vec3(0, 0, 0);
            }
            autoEat();
            if (config.killAura === true && process.uptime() > 10) {
                killAura();
            }
        });

        this.bot.on('messagestr', (message, messagePosition, jsonMsg) => {
            logChat(jsonMsg.toAnsi());
            if (message.toString().startsWith(`Is ${this.bot.username} online?`) && config.onlineCheck === true) {
                this.bot.chat('Yes, I am online.');
                this.bot.chat('How can I help you?');
            }
            /*
            switch (messagePosition) {
                case 'game_info':
                    log(chalk.grey('[') + chalk.green('GAMEINFO') + chalk.grey('] ')  + jsonMsg.toAnsi());
                    break;

                case 'system':
                    const chatMessagePattern = /^[a-zA-Z0-9_]+: /;
                    //const whisperMessagePattern = /^\[[a-zA-Z0-9_]+ -> [a-zA-Z0-9_]+\] .*;
                    //const discordMessagePattern = /^\(D\) [a-zA-Z0-9_]+: .*

                    if (chatMessagePattern.test(message) || whisperMessagePattern.test(message) || discordMessagePattern.test(message)) {
                        break;
                    }
                    log(chalk.grey('[') + chalk.green('SYSTEM') + chalk.grey('] ') + jsonMsg.toAnsi());
                    break;
                
                case 'chat':
                    log(jsonMsg.toAnsi());
                    break;
            */
        });

        if (config.autoLog === true) {
            this.bot.on('health', () => {
                if (this.bot.health < config.autoLogHealth && !process.argv.includes('--noLog')) {
                    logWarn(`AutoLog`);
                    this.bot.quit();
                }
            });
        }


        /* Chat Commands */
        this.bot.on('whisper', (username, message) => {
            let msg = message.toString();
            const args = msg.split(' ');

            if (!this.bot.username || !username || this.bot.username === username) return;
            if (!msg.startsWith('!')) return;

            /* ChatBot */
            if (config.chatBot === true) {
                if (msg.startsWith(config.command1)) {
                    if (config.command1trusted === true && username !== owner) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }
                    this.bot.chat(config.response1);
                }
            }

            /* Commands */
            switch (true) {
                case msg.startsWith("!help"):
                    this.bot.chat(`/msg ${username} Hello, ${username}`);
                    this.bot.chat(`/msg ${username} For a list of available commands message me !cmd.`);
                    break;

                case msg.startsWith("!cmd"):
                    const command = args[1];
                    if (!command) {
                        this.bot.chat(`/msg ${username} Available commands: [follow], [stopfollow], [quit], [say], [pos], [goto], [tp], [drop], [attack], [equip], [range], [scs], [rejoin], [vclip], [blacklist], [reloadconfig], help, cmd, basehunt, p, players, uptime, centerStasisPos. For more information about a specific command, type !cmd <command>`);
                        this.bot.chat(`/msg ${username} Prefix: '!' | [cmd] means only executable by the owner/s`);
                    } else {
                        const commandResponses = {
                            help: "help - Show help information",
                            cmd: "cmd - List all available commands or get info about a specific command",
                            follow: "follow - Make the bot follow you [Trusted]",
                            stopfollow: "stopfollow - Make the bot stop following you [Trusted]",
                            quit: "quit - Make the bot quit [Trusted]",
                            say: "say <message> - Make the bot say a message [Trusted]",
                            players: "players - List online players",
                            pos: "pos - Show the bot's current position [Trusted]",
                            goto: "goto <x> <y> <z> - Make the bot go to specified coordinates [Trusted]",
                            drop: "drop <item_name> <amount> - Drop specified item [Trusted]",
                            attack: "attack <target> <mace> <attacks | insta> - Attack a target, MaceKill, Reach and TotemBypass supported [Trusted]",
                            equip: "equip <item_name> <slot> - Equip an item [Trusted]",
                            range: "range - List players in range [Trusted]",
                            scs: "scs <forward, back, left, right, jump, sprint, sneak> <true/false> - Set control state [Trusted]",
                            basehunt: "basehunt - Go basehunting",
                            p: "p - Activate a stasis chamber [Only for Stasis Chamber Owners]",
                            rejoin: "rejoin - Rejoin the server [Trusted]",
                            uptime: "uptime - Show the bot's uptime",
                            vclip: "vclip <blocks> - Teleport in the air (max 200 blocks)",
                            tp: "tp <x> <y> <z> - Teleoprt up to 200 Blocks away using the Paperclip/LiveOverflow exploit [Trusted]",
                            blacklist: "blacklist <add | remove | reason | list> <player> <reason> - Manage the blacklist [Trusted]",
                            reloadconfig: "reloadconfig - Reload the configuration file [Trusted]",
                            centerStasisPos: "centerStasisPos - Center the stasis bot [Only for Stasis Chamber Owners]"
                        };
                        this.bot.chat(`/msg ${username} ${commandResponses[command] || `Unknown command: ${command}`}`);
                    }
                    break;

                case msg.startsWith("!follow"):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        break;
                    }

                    const targetPlayer = args[1] ? this.bot.players[args[1]]?.entity : this.bot.players[username]?.entity;
                    if (targetPlayer) {
                        this.followPlayer(targetPlayer)
                    } else {
                        logError(`Player ${chalk.hex('#cfa1f0')(args[0])} not found or not visible.`);
                    }
                    break;

                case msg.startsWith("!stopfollow"):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        break;
                    }
                    this.stopFollowPlayer();
                    this.bot.chat(`/msg ${username} I stopped following you`);
                    break;

                case msg.startsWith("!quit"):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        break;
                    }
                    this.bot.quit();
                    process.exit(0);

                case msg.startsWith("!say"):
                    const sayMessage = msg.substring(5);
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        break;
                    }
                    this.bot.chat(sayMessage);
                    break;

                case msg.startsWith("!players"):
                    const playerList = Object.keys(this.bot.players).filter(player => player !== this.bot.username);
                    this.bot.chat(playerList.length > 0 ? `/msg ${username} Online players: ${playerList.join(', ')}` : `/msg ${username} No other players are online.`);
                    break;

                case msg.startsWith("!pos"):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }
                    this.bot.chat(`/msg ${username} My current Position: X: ${Math.round(this.bot.entity.position.x)}, Y: ${Math.round(this.bot.entity.position.y)}, Z: ${Math.round(this.bot.entity.position.z)}`);
                    break;

                case msg.startsWith("!goto"):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }

                    if (args.length === 4) {
                        const x = parseFloat(args[1]);
                        const y = parseFloat(args[2]);
                        const z = parseFloat(args[3]);
                        this.goto(x, y, z, username);
                    } else {
                        this.bot.chat(`/msg ${username} Usage: !goto <x> <y> <z>`);
                    }
                    break;

                case msg.startsWith("!basehunt"):
                    this.bot.chat(`/msg ${username} Request failed: too lazy.`);
                    break;

                case msg.startsWith('!p'):
                    touchBall(username);
                    break;

                case msg.startsWith('!stop'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }

                    this.stopAllGoals();
                    this.bot.chat(`/msg ${username} All goals have been stopped.`)
                    break;

                case msg.startsWith('!equip'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }

                    const item = this.bot.inventory.items().find(i => i.name === args[1]);

                    if (!item) {
                        this.bot.chat(`/msg ${username} I don't have any ${args[1]}.`);
                        return;
                    }

                    const validSlots = ['hand', 'head', 'torso', 'legs', 'feet', 'off-hand'];
                    if (!validSlots.includes(args[2])) {
                        this.bot.chat(`/msg ${username} Invalid slot provided for equip: ${args[2]}. Try hand, head, torso, legs, feet, off-hand.`);
                        return;
                    }

                    this.bot.equip(item, args[2]).then(() => {
                        this.bot.chat(`/msg ${username} Equipped ${item.displayName} in ${args[2]}.`);
                    }).catch(err => {
                        this.bot.chat(`/msg ${username} Failed to equip ${item.displayName} in ${args[2]}: ${err.message}`);
                    });
                    break;

                case msg.startsWith('!range'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
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
                    } else if (playersInRange.length > 10) {
                        this.bot.chat(`/msg ${username} Too many players in range.`);
                    } else {
                        this.bot.chat(`/msg ${username} No players in range.`);
                    }
                    break;

                case msg.startsWith('!scs'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }

                    if (['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'].includes(args[1])) {
                        this.bot.setControlState(args[1], args[2] === 'true');
                    } else {
                        this.bot.chat(`/msg ${username} Try !scs <'forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'> <true/false>`);
                    }
                    break;

                case msg.startsWith('!attack'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }

                    const attackMode = args.includes('insta') ? 'insta' : parseInt(args[args.length - 1], 10) || 1;
                    const useMace = args.includes('mace');
                    const targetNames = args.slice(1, args.includes('mace') || args.includes('insta') ? -1 : args.length);

                    const targets = targetNames.map(arg =>
                        Object.values(this.bot.entities).find(entity => entity.username === arg || entity.id === arg)
                    ).filter(target => target);

                    if (targets.length === 0) {
                        this.bot.chat(`/msg ${username} No valid targets found.`);
                        return;
                    }

                    targets.forEach((target, index) => {
                        setTimeout(() => {
                            const distance = this.bot.entity.position.distanceTo(target.position);
                            if (distance > config.generalReach) {
                                this.bot.chat(`/msg ${username} Target ${target.username || target.id} is ${Math.round(distance)}m away.`);
                                return;
                            }

                            if (useMace) {
                                maceAttack(target, attackMode);
                            } else {
                                attack(target);
                            }

                            this.bot.chat(`/msg ${username} Attacking target: ${target.username || target.id}`);
                        }, index * 100);
                    });
                    break;

                case msg.startsWith('!drop'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }

                    if (!args[1]) {
                        this.bot.chat(`/msg ${username} Usage: !drop <item_name> <amount>`);
                        return;
                    }

                    const itemName = args[1];
                    const amount = parseInt(args[2], 10) || 1;
                    if (isNaN(amount) || amount <= 0) {
                        this.bot.chat(`/msg ${username} Amount must be a positive number.`);
                        return;
                    }

                    dropItem(itemName, amount).catch(err => {
                        this.bot.chat(`/msg ${username} Failed to drop item: ${err.message}`);
                    });
                    break;

                case msg.startsWith('!uptime'):
                    this.bot.chat(`/msg ${username} Uptime: ${formatUptime(process.uptime())}`);
                    break;

                case msg.startsWith('!rejoin'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }
                    this.bot.end();
                    break;

                case msg.startsWith('!vclip'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }
                    const y = parseInt(args[1], 10) || 100;
                    vclip(y);
                    this.bot.chat(`/msg ${username} Teleporting ${y} Blocks`);
                    break;

                case msg.startsWith('!tp'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }

                    if (args.length === 2) {
                        const targetPlayer = args[1];
                        paperclip(targetPlayer);
                    } else if (args.length === 4) {
                        const tpx = parseFloat(args[1]);
                        const tpy = parseFloat(args[2]);
                        const tpz = parseFloat(args[3]);

                        if (!isNaN(tpx) && !isNaN(tpy) && !isNaN(tpz)) {
                            paperclip(tpx, tpy, tpz);
                            this.bot.chat(`/msg ${username} Teleporting to ${tpx}, ${tpy}, ${tpz}`);
                        } else {
                            this.bot.chat(`/msg ${username} Invalid coordinates. Please provide valid numbers.`);
                        }
                    } else {
                        this.bot.chat(`/msg ${username} Usage: !tp <x> <y> <z> or !tp <player>`);
                    }
                    break;

                case msg.startsWith('!blacklist'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        break;
                    }
                    switch (args[1]) {
                        case 'add':
                            if (args.length < 3) {
                                this.bot.chat(`/msg ${username} Usage: !blacklist add <username> <reason>`);
                                return;
                            }
                            if (config.blacklist.some(player => player.username === args[2])) {
                                this.bot.chat(`/msg ${username} Player ${args[2]} is already blacklisted.`);
                                return;
                            }
                            const reason = args.slice(3).join(' ') || 'No reason provided';
                            addToBlacklist(args[2], reason);
                            reloadConfig();
                            this.bot.chat(`/msg ${username} Added ${args[2]} to the blacklist and updated the config.`);
                            break;

                        case 'remove':
                            if (args.length < 3) {
                                this.bot.chat(`/msg ${username} Usage: !blacklist remove <username>`);
                                return;
                            }
                            if (!config.blacklist.some(player => player.username === args[2])) {
                                this.bot.chat(`/msg ${username} Player ${args[2]} is not blacklisted.`);
                                return;
                            }
                            removeFromBlacklist(args[2]);
                            reloadConfig();
                            this.bot.chat(`/msg ${username} Removed ${args[2]} from the blacklist and updated the config.`);
                            break;

                        case 'list':
                            if (config.blacklist.length === 0) {
                                this.bot.chat(`/msg ${username} No players are blacklisted.`);
                            } else {
                                this.bot.chat(`/msg ${username} Blacklisted players: ${config.blacklist.map(player => player.username).join(', ')}`);
                            }
                            break;

                        case 'reason':
                            if (args.length < 3) {
                                this.bot.chat(`/msg ${username} Usage: !blacklist reason <username>`);
                                return;
                            }
                            const blacklistedPlayer = config.blacklist.find(player => player.username === args[2]);
                            if (!blacklistedPlayer) {
                                this.bot.chat(`/msg ${username} Player ${args[2]} is not blacklisted.`);
                            } else {
                                this.bot.chat(`/msg ${username} ${blacklistedPlayer.username}: ${blacklistedPlayer.reason}`);
                            }
                            break;

                        default:
                            this.bot.chat(`/msg ${username} Usage: !blacklist <add | remove | reason | list> <username> <reason>`);
                            break;
                    }
                    break;

                case msg.startsWith('!reloadconfig'):
                    if (!config.owners.includes(username)) {
                        this.bot.chat(`/msg ${username} Sorry, but you are not owner`);
                        return;
                    }

                    reloadConfig();
                    this.bot.chat(`/msg ${username} Config reloaded.`);
                    break;

                case msg.startsWith('!centerStasisPos'):
                    const stasisFile = fs.readFileSync('src/saves/pearls.json');
                    const stasisPlayers = JSON.parse(stasisFile).stasisChambers;
                    const playerStasis = stasisPlayers.find(player => player.player === username);
                    const [centerX, centerY, centerZ] = config.stasisBotPos;

                    if (!playerStasis) {
                        this.bot.chat(`/msg ${username} You don't have a stasis chamber.`);
                        return;
                    }

                    this.goto(centerX, centerY, centerZ, username);
                    break;

                default:
                    this.bot.chat(`/msg ${username} Unknown command. Type !help for a list of available commands.`);
                    break;
            }
        });

    }
}

export { botInstance, diedEntities, predictedPositions };

const webServer = new WebServer();
webServer.start();

async function main() {
    await readConfigFile();
    const { username, auth } = await readAccountFile();
    await new MCBot(username, auth);
}

main();