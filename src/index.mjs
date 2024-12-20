// Minebot NEO by Eglijohn
// DC-Server: https://discord.gg/CKySgRzUYp
// Have you read the Manual??


import mineflayer from 'mineflayer';
import { readFile } from 'fs/promises';
import fs from 'fs';
import minecraftData from 'minecraft-data';
import pkg from 'mineflayer-pathfinder';
import http from 'http';
import { mineflayer as mineflayerViewer } from 'prismarine-viewer';
import chalk from 'chalk';


const { pathfinder, Movements, goals } = pkg;
const ansiEscape = /\x1b\[[0-9;]*m/g;


let botArgs = {};
let botNames = [];
let config = {};
let owner;
let version = "2.2.1a";
let count = 0;



async function readConfigFile() {
    try {
        const data = await readFile('./config/CONFIG.json', 'utf8');
        config = JSON.parse(data);
        botArgs.host = config.host;
        owner = config.owner;


        if (config.needsPort) {
            botArgs.port = config.port;
        }
    } catch (error) {
        console.error(chalk.red('Error reading or parsing CONFIG.json:'), error);
        process.exit(1);
    }
}


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



console.log(chalk.red('NOTE:') + chalk.gray(' The Bot is currently in Development. Please report Bugs to our Discord-Server:') + chalk.hex('#65b0db')(' https://discord.gg/CKySgRzUYp'));
console.log(chalk.bold.hex('#044cd9')("___  ____            _           _    ") + chalk.hex('#f5f5f5')(" _   _  _____ _____ "));
console.log(chalk.bold.hex('#0443bf')("|  \\/  (_)          | |         | |   ") + chalk.hex('#e1e1e3')("| \\ | ||  ___|  _  |"));
console.log(chalk.bold.hex('#033cab')("| .  . |_ _ __   ___| |__   ___ | |_  ") + chalk.hex('#b6b6b8')("|  \\| || |__ | | | |"));
console.log(chalk.bold.hex('#02369c')("| |\\/| | | '_ \\ / _ \\ '_ \\ / _ \\| __| ") + chalk.hex('#88898a')("| . ` ||  __|| | | |"));
console.log(chalk.bold.hex('#012e85')("| |  | | | | | |  __/ |_) | (_) | |_  ") + chalk.hex('#5a5b5c')("| |\\  || |___\\ \\_/ /"));
console.log(chalk.bold.hex('#022975')("\\_|  |_/_|_| |_|\\___|_.__/ \\___/ \\__|") + chalk.hex('#48494a')(" \\_| \\_/\\____/ \\___/ "));
console.log(chalk.hex('#011b4f')("By Eglijohn                                        ") + chalk.hex('#282929')(version));
console.log(chalk.gray("=========================================================="));
console.log(' ')


class WebServer {
    constructor(hostname = 'localhost', port = 3000) {
        this.hostname = hostname;
        this.port = port;
        this.server = null;
    }


    start() {
        this.server = http.createServer((req, res) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
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



class MCBot {
    constructor(username, auth) {
        this.username = username;
        this.auth = auth;
        this.host = botArgs.host;
        this.port = botArgs.port;
        this.version = botArgs.version;

        this.initBot();
        this.initConsoleInput();
    }


    initBot() {
        const botOptions = {
            username: this.username,
            auth: this.auth,
            host: this.host,
            version: this.version
        };

        if (this.port) {
            botOptions.port = this.port;
        }

        this.bot = mineflayer.createBot(botOptions);

        botNames.push(this.bot.username);
        this.bot.loadPlugin(pathfinder);
        this.initEvents();


        this.bot.once('spawn', () => {
            if (config.experimentalFeatures === true) {
                mineflayerViewer(this.bot, { port: 4000 });
                this.log(chalk.green("Prismarine viewer web server running on http://localhost:4000"));

            const path = [this.bot.entity.position.clone()];
            this.bot.on('move', () => {
                if (path[path.length - 1].distanceTo(this.bot.entity.position) > 1) {
                    path.push(this.bot.entity.position.clone());
                    this.bot.viewer.drawLine('path', path);
                }
            });
            }

            if (config.noChat === true) {
                this.bot.chat(`${config.customStartMsg}`);
            } else {
                this.bot.chat(`Minebot NEO ${version}. Developed by Eglijohn.`);
            }
        });
    }


    initConsoleInput() {
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', async (data) => {
            const input = data.trim();

            if (input.startsWith('!')) {
                const command = input.substring(1);
                await this.executeCommand(command);
            } else {
                this.bot.chat(input);
            }
        });
    }


    reconnect() {
        setTimeout(() => {
            this.initBot();
        }, 5000);
    }



    async executeCommand(command) {
        const [cmd, ...args] = command.split(' ');

        switch (cmd) {
            case 'help':
                this.logInfo(('Commands: '), chalk.hex('#cfa1f0')('!quit, !players, !info, !inventory, !follow <player>, !stopfollow'));
                break;

            case 'players':
                const playerList = Object.keys(this.bot.players).filter(player => player !== this.bot.username);
                this.logInfo(playerList.length > 0 ? `Online players: ${chalk.hex('#cfa1f0')(playerList.join)(', ')}` : 'No other players are online.');
                break;

            case 'quit':
                this.bot.end();
                config.processquit === false ? this.reconnect() : process.exit();
                break;

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

            case 'inventory':
                const heldItem = this.bot.heldItem;
                const inventoryItems = this.bot.inventory.items().map(item => `${chalk.hex('#cfa1f0')(item.displayName)} (x${chalk.hex('#cfa1f0')(item.count)})`);
                this.logInfo(`Inventory: ${inventoryItems.length > 0 ? inventoryItems.join(', ') : 'Inventory is empty'}`);
                if (heldItem) {
                    this.logInfo(`Held Item: ${chalk.hex('#cfa1f0')(heldItem.displayName)} (x${chalk.hex('#cfa1f0')(heldItem.count)})`);
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
                
            default:
                this.logWarn(`Command '${chalk.hex('#cfa1f0')(cmd)}' not found. Enter !help for a list of available commands.`);
                break;
        }
    }



    followPlayer(target) {
        const mcData = minecraftData(this.bot.version);
        const movements = new Movements(this.bot, mcData);
        movements.canDig = true;
        movements.canPlace = true;

        this.bot.pathfinder.setMovements(movements);
        const goal = new goals.GoalFollow(target, 1);
        this.bot.pathfinder.setGoal(goal, true);
        this.logInfo(`Now following ${hex('#cfa1f0')(target.username)}`);
    }



    stopFollowPlayer() {
        this.bot.pathfinder.setGoal(null);
        this.logInfo('Stopped following.');
    }



    goto(x, y, z, username = null) {
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            const goal = new goals.GoalBlock(x, y, z);
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



    gotoConsole(x, y, z, username = null) {
        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            const goal = new goals.GoalBlock(x, y, z);
            this.bot.pathfinder.setGoal(goal);

            if (username) {
                this.logInfo(`I am going to (${hex('#cfa1f0')(x)}, ${hex('#cfa1f0')(y)}, ${hex('#cfa1f0')(z)})`);
            } else {
                this.logInfo(`I am going to (${hex('#cfa1f0')(x)}, ${hex('#cfa1f0')(y)}, ${hex('#cfa1f0')(z)})`);
            }
        } else {
            this.logError(username ? `Invalid coordinates. Please provide numbers.` : `Invalid coordinates. Please provide numbers.`);
        }
    }



    log(...msg) {
        const counter = `${chalk.hex('#1f1f1f')(`[${count}] `)}`;
        count += 1; 

        const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const formattedTimestamp = `[${timestamp}]`;
        const usernameTag = `[${this.bot.username}]`;
        
        const consoleMessageCounter = `${counter} ${chalk.gray(formattedTimestamp)} ${chalk.blue(usernameTag)} ${msg.join(' ')}`;
        const consoleMessage = `${chalk.gray(formattedTimestamp)} ${chalk.blue(usernameTag)} ${msg.join(' ')}`;
        
        const fileMessage = `${formattedTimestamp} ${usernameTag} ${msg.join(' ').replace(ansiEscape, '')}`;
        
        fs.appendFileSync('logs/log.txt', fileMessage + '\n'); 
        if (config.consoleCounter == true) {
            console.log(consoleMessageCounter);
            return;
        } 
        console.log(consoleMessage);
    }

    logJoin(...msg) {
        this.log(chalk.gray('[') + chalk.green('+') + chalk.gray(']'), ...msg)
    }

    logLeave(...msg) {
        this.log(chalk.gray('[') + chalk.red('-') + chalk.gray(']'), ...msg)
    }

    logError(...msg) {
        this.log(chalk.gray('[') + chalk.red('ERROR') + chalk.gray(']') + chalk.red(...msg ));
    }

    logInfo(...msg) {
        this.log(chalk.gray('[') + chalk.green('INFO') + chalk.gray(']'), ...msg);
    }

    logWarn(...msg) {
        this.log(chalk.gray('[') + chalk.yellow('WARN') + chalk.gray(']') + chalk.yellow(...msg ));
    }

    logChat(...msg) {
        this.log(chalk.gray('[') + chalk.green('CHAT') + chalk.gray('] ') + chalk.white(...msg ));
    }



    initEvents() {
        this.bot.on('login', async () => {
            this.logInfo(chalk.green(`Logged in at ${chalk.yellow(this.host ? this.host : this.port)} as ${chalk.yellow(this.bot.username)}, version ${chalk.yellow(this.bot.version)}`));
            this.logInfo(chalk.green(`chatLogMethod set to '${chalk.yellow(config.chatLogMethod)}'`))
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
        });

        this.bot.on('health', () => {
            if (this.bot.health < 20) {  
                this.logWarn(`Health Update. Current health: ${chalk.hex('#cfa1f0')(Math.round(this.bot.health * 2) / 2)}`);
            }
        });

        this.bot.on('entityDead', (entity) => {
            this.logInfo(`Entity ${chalk.hex('#cfa1f0')(JSON.stringify(entity.name))} died`);
        });

        this.bot.on('death', async () => {
            this.logWarn('Died');
        });

        this.bot.on('respawn', async () => {
            this.logWarn(`Respawned at ${chalk.hex('#cfa1f0')(this.bot.entity.position)}`);
        });

        this.bot.on('playerCollect', (collector, collected) => {
            this.logInfo(`${chalk.hex('#b052f2')(JSON.stringify(collector.username))} picked up`,
            chalk.hex('#cfa1f0')(JSON.stringify(collected.metadata[8]?.itemCount)), 
            chalk.hex('#cfa1f0')(JSON.stringify(collected.displayName)),
            "at ",
            ('X:'), chalk.hex('#de495b')(JSON.stringify(Math.round(collected.position.x)), 
            chalk.white('Y:'), Math.round(collected.position.y), 
            chalk.white('Z:'), Math.round(collected.position.z)));
        });

        this.bot.on('itemDrop', (entity) => {
            this.logInfo(chalk.hex('#cfa1f0')(JSON.stringify(entity.metadata[8]?.itemCount)), 
            chalk.hex('#cfa1f0')(JSON.stringify(entity.displayName)), 
            ('appeared at'),
            ('X:'), chalk.hex('#de495b')(JSON.stringify(Math.round(entity.position.x)), 
            chalk.white('Y:'), Math.round(entity.position.y), 
            chalk.white('Z:'), Math.round(entity.position.z), 
            chalk.white('Entity ID: '), chalk.hex('#cfa1f0')(JSON.stringify(entity.id))));
        });

        this.bot.on('kicked', (reason) => {
            this.logWarn(`Kicked: ${JSON.stringify(reason.value.extra.value.value)}`);
        });

        this.bot.on('playerJoined', (player) => {
            this.logJoin(chalk.hex('#b052f2')(`${player.username}`));
        });

        this.bot.on('playerLeft', (player) => {
            this.logLeave(chalk.hex('#b052f2')(`${player.username}`));
        });

        if (config.chatLogMethod === 'normal') {
            this.bot.on('chat', (username, message) => {
                this.logChat(`<${chalk.hex('#b052f2')(username)}> ${message}`);
            });
        } else if (config.chatLogMethod === 'str') {
            this.bot.on('messagestr', (message, sender) => {
                this.logChat(`<${chalk.hex('#cfa1f0')(sender)}> ${message}`);
            });
        }  else {
            this.logError(` chatLogMethod '${chalk.hex('#cfa1f0')(config.chatLogMethod)}' not found. Try 'normal' or 'str'.`)
        }

        if (config.autoLog === true) {
            this.bot.on('health', () => {
                if (this.bot.health < 6) {  
                    this.logWarn(`AutoLog`);
                    this.bot.quit();
                    this.reconnect();
                }
            });
        }
        
        this.bot.on('whisper', async (username, message) => {
            if (botNames.includes(username)) return;
        
            if (!message.startsWith("!")) return;

            let msg = message.toString();

            if (msg.startsWith("!help")) {
                this.bot.chat(`/msg ${username} Minebot NEO ${version} by Eglijohn.`);
                this.bot.chat(`/msg ${username} The owner of the bot is: ${config.owner}.`);

            } else if (msg.startsWith("!follow")) {
                if (username !== owner) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }

                const target = this.bot.players[username]?.entity;
                if (target) {
                    this.followPlayer(target);
                    this.bot.chat(`/msg ${username} I am following you`);
                } else {
                    this.bot.chat(`/msg ${username} I can't see you`);
                }

            } else if (msg.startsWith("!stopfollow")) {
                if (username !== owner) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
            
                this.stopFollowPlayer();
                this.bot.chat(`/msg ${username} I stopped following you`);
            
            } else if (msg.startsWith("!quit")) {
                if (username !== owner) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                this.bot.quit();

            } else if (msg.startsWith("!say")) {
                const sayMessage = msg.substring(5);
                if (username !== owner) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                this.bot.chat(sayMessage);

            } else if (msg.startsWith("!players")) {
                const playerList = Object.keys(this.bot.players).filter(player => player !== this.bot.username);
                this.bot.chat(playerList.length > 0 ? `/msg ${username} Online players: ${playerList.join(', ')}` : `/msg ${username} No other players are online.`);

            } else if (msg.startsWith("!pos")) {
                if (username !== owner) {
                    this.bot.chat(`/msg ${username} Sorry, but you are not ${owner}`);
                    return;
                }
                this.bot.chat(`My current Position: ${this.bot.entity.position}`)

            } else if (msg.startsWith("!goto")) {
                if (username !== owner) {
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
                this.bot.chat(`/msg ${username} Request failed: too lazy.`)
            }
        });
    }
}



if (config.experimentalFeatures === true) {
    new WebServer();
} 


async function main() {
    await readConfigFile();
    const { username, auth } = await readAccountFile();
    new MCBot(username, auth);
}

main();
