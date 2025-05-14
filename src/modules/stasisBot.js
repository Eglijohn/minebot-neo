import fs from 'fs';
import { botInstance } from "../index.mjs";
import { Vec3 } from 'vec3';
import { config } from "../utils/dataManagement.js";
import { logError } from "../utils/logger.js";
import { dropItem } from "./dropItem.js";

export function touchBall(username) {
    const chambers = fs.readFileSync('src/saves/pearls.json');
    const stasisChambers = JSON.parse(chambers).stasisChambers;

    const chamber = stasisChambers.find(ch => ch.player === username);

    if (!chamber) {
        botInstance.bot.chat(`/msg ${username} You don't have a ball to touch.`);
    } else {
        if (Array.isArray(chamber.trapdoor) && chamber.trapdoor.length === 3) {
            const [x, y, z] = chamber.trapdoor;
            const block = botInstance.bot.blockAt(new Vec3(x, y, z));
            if (block) {
                botInstance.bot.activateBlock(block);
                botInstance.bot.chat(`/msg ${username} Touched your ball's thingy.`);
                setTimeout(() => { 
                    botInstance.bot.activateBlock(block);
                    try {
                        dropItem('ender_pearl', 1);
                    } catch (error) {
                        logError('Error dropping ender pearl:', error);
                    }
                }, config.trapdoorCloseDelay);
            } else {
                botInstance.bot.chat(`/msg ${username} Unable to find the block at the specified coordinates.`);
            }
        } else {
            botInstance.bot.chat(`/msg ${username} Your ball's trapdoor coordinates are invalid.`);
        }
    }
}