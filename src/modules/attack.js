import { config } from '../utils/dataManagement.js';
import { tp, paperclip } from "./teleport.js";
import { botInstance } from "../index.mjs";
import { logInfo, logError } from "../utils/logger.js";  

export async function maceAttack(target, attacks) {
    if (target === botInstance.bot.entity || !target.position) return;
    // Find out who the Target is
    for (const entityId in botInstance.bot.entities) {
        const entity = botInstance.bot.entities[entityId];
        if (entity.username === target || entityId === target) {
            target = entity;
            break;
        }
    }

    const originalPos = botInstance.bot.entity.position.clone();

    // Find the Target's Distance to the Bot
    const distance = botInstance.bot.entity.position.distanceTo(target.position);
    if (distance > config.generalReach) {
        logError('Target is ', Math.round(distance), 'm away.');
        return;
    }

    // Find a Mace in the Bot's Inventory
    const mace = botInstance.bot.inventory.items().find(item => item.name.includes('mace'));
    if (!mace) {
        logError('404 Mace not found.');
        return;
    }

    // Needed for !attack <target> <mace> <count|insta>
    //                                      ^^ this
    let maxAttacks = attacks || 1;
    let attackCount = 0;
    let maxHeight = 20; // Max height of the Mace Attack

    if (attacks === 'insta') {
        logError('Private Feature. You dont have access to this.');
        return;
    } 

    let executeAttack; // Declare executeAttack before using it

    const attack = async () => {
        if (attackCount < maxAttacks) {
            botInstance.bot.equip(mace, 'hand');
            await paperclip(target.position.x, target.position.y + config.maceAttackHeight, target.position.z);
            await tp(target.position.x, target.position.y, target.position.z);
            await botInstance.bot.attack(target);
            attackCount++;
            await paperclip(originalPos.x, originalPos.y + 10, originalPos.z);
            await tp(originalPos.x, originalPos.y, originalPos.z);
        } else {
            clearInterval(executeAttack);
            if (attacks > 1) {
                logInfo('Stopped attacking after reaching max attacks.');
            }
        }
    };

    // Execute the first attack instantly
    attack();

    // Schedule subsequent attacks with the interval
    executeAttack = setInterval(attack, config.maceAttackInterval);
}


export async function attack(target) {
    if (target?.position) {
        const originalPos = botInstance.bot.entity.position;
        await paperclip(target.position.x, target.position.y, target.position.z);
        await tp(target.position.x, target.position.y + 1, target.position.z);
        await tp(target.position.x, target.position.y, target.position.z);
        await botInstance.bot.attack(target);
        await paperclip(originalPos.x - 0.5, originalPos.y, originalPos.z - 0.5);
    } else {
        return;
    }
}