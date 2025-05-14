import { WebSocketServer } from 'ws';
import { botInstance } from '../index.mjs';
import { config } from '../utils/dataManagement.js';
import { logError, logInfo } from "../utils/logger.js";
import minecraftData from 'minecraft-data';
import pathfinderPkg from 'mineflayer-pathfinder';
import vec3 from 'vec3';
import { paperclip } from "../modules/teleport.js";

const { Movements, goals } = pathfinderPkg;
const { GoalBlock } = goals;

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    if (process.argv.includes('--debug')) {
        logInfo('Client connected');
    }

    const sendBotData = () => {
        if (botInstance && botInstance.bot && botInstance.bot.entity) {
            const botData = {
                position: {
                    x: botInstance.bot.entity.position.x,
                    y: botInstance.bot.entity.position.y,
                    z: botInstance.bot.entity.position.z,
                },
                health: botInstance.bot.health,
                food: botInstance.bot.food,
                xp: botInstance.bot.experience.points,
                nearbyPlayers: Object.values(botInstance.bot.entities)
                    .filter(entity => entity.type === 'player' && entity.username !== botInstance.bot.username)
                    .map(entity => ({
                        username: entity.username,
                        distance: Math.round(botInstance.bot.entity.position.distanceTo(entity.position)),
                    })),
            };
            ws.send(JSON.stringify(botData));
        }
    };

    const interval = setInterval(sendBotData, config.botDataInterval);

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'moveBot') {
            const { x, y, z } = data.position;
            if (botInstance && botInstance.bot) {
                const mcData = minecraftData(botInstance.bot.version);
                const movements = new Movements(botInstance.bot, mcData);

                movements.canDig = config.canDig;
                movements.canPlace = config.canPlace;
                botInstance.bot.pathfinder.setMovements(movements);
                botInstance.bot.pathfinder.setGoal(new GoalBlock(x, y, z));
                if (process.argv.includes('--debug')) {
                    logInfo(`Pathfinder Goal set to X: ${x}, Y: ${y}, Z: ${z}`);
                }
            }

        } else if (data.type === 'activateBlock') {
            const { x, y, z } = data.position;
            const block = botInstance.bot.blockAt(new vec3(x, y, z));
            if (block) {
                try {
                    botInstance.bot.activateBlock(block);
                } catch (error) {
                    logError(error);
                }
            } else {
                if (process.argv.includes('--debug')) {
                    logError('Block not found at the specified coordinates');
                }
            }
        } else if (data.type === 'teleportBot') {
            const { x, y, z } = data.position;

            paperclip(x, y, z);
        }
    });

    ws.on('close', () => {
        clearInterval(interval);
        if (process.argv.includes('--debug')) {
            console.log('Client disconnected');
        }
    });
});

export { wss };