import { config } from '../utils/dataManagement.js';
import { logError, logInfo, logWarn } from '../utils/logger.js';
import { botInstance } from "../index.mjs";
import Vec3 from 'vec3';

let flyInterval = null;

export function tp(x, y, z, fly) {
    if (fly === 'fly') {
        if (flyInterval !== null) {
            clearInterval(flyInterval);
            flyInterval = null;
        }
        
        flyInterval = setInterval(() => {
            botInstance.bot._client.write('position', { x: x, y: y, z: z });
        }, config.flyPacketInterval);

        if (process.argv.includes('--debug')) {
            logInfo(`Tp'd to X: ${Math.round(x)} Y: ${Math.round(y)} Z: ${Math.round(z)}, Fly enabled`);
        }
    } else {
        if (flyInterval !== null) {
            clearInterval(flyInterval);
            flyInterval = null;
        }

        botInstance.bot._client.write('position', { x: x, y: y, z: z });
        if (process.argv.includes('--debug')) {
            this.logInfo(`Tp'd to X: ${Math.round(x)} Y: ${Math.round(y)} Z: ${Math.round(z)}`);
        }
    }
}

export async function vclip(distance) {
    const startPos = botInstance.bot.entity.position.clone();

    if (isNaN(distance)) {
        logWarn('Invalid distance provided. Distance must be a number');
        return;
    }

    const goal = new Vec3(startPos.x, startPos.y + distance, startPos.z);

    if (isNaN(goal.x) || isNaN(goal.y) || isNaN(goal.z)) {
        logWarn('Invalid goal position. One or more coordinates are NaN');
        return;
    }

    const packetsRequired = Math.ceil(Math.abs(distance) / 10) - 1;
    if (packetsRequired >= 20) {
        logError('Too many packets required:', packetsRequired, 'Max. 20 allowed');
        return;
    }

    logInfo(`Sending ${packetsRequired} packets before final teleport`);

    for (let i = 0; i < packetsRequired; i++) {
        await botInstance.bot._client.write('position', {
            x: startPos.x,
            y: startPos.y,
            z: startPos.z,
            onGround: false
        });

        if (process.argv.includes('--debug')) {
            logInfo(`Packet ${i + 1}/${packetsRequired} sent`);
        }
    }

    await botInstance.bot._client.write('position', {
        x: goal.x,
        y: goal.y,
        z: goal.z,
        onGround: true
    });

    logInfo(`Final teleport sent: ${Math.round(goal.x)}, ${Math.round(goal.y)}, ${Math.round(goal.z)}`);
}

export async function paperclip(x, y, z, fromChat) {
    let goal;
    
    if (typeof x === 'string' && !y && !z) {
        const player = botInstance.bot.players[x]?.entity;
        if (!player) {
            if (fromChat) {
                botInstance.bot.chat(`/msg ${fromChat} Player '${x}' not found or out of range`)
            }
            logError(`Player '${x}' not found or out of range`);
            return;
        }
        goal = player.position.clone();
    } else {
        goal = new Vec3(x, y, z);
    }
    
    const startPos = botInstance.bot.entity.position.clone();
    const distance = startPos.distanceTo(goal);
    
    if (isNaN(goal.x) || isNaN(goal.y) || isNaN(goal.z)) {
        if (fromChat) {
            botInstance.bot.chat(`/msg ${fromChat} Invalid goal position. One or more coordinates are NaN`)
        }
        logWarn('Invalid goal position. One or more coordinates are NaN');
        return;
    }
    
    if (isNaN(distance)) {
        if (fromChat) {
            botInstance.bot.chat(`/msg ${fromChat} Invalid distance calculated. Distance must be a number`)
        }
        logWarn('Invalid distance calculated. Distance must be a number');
        return;
    }
    
    const packetsRequired = Math.ceil(distance / 10) - 1;
    if (packetsRequired >= 20) {
        logError('Too many packets required:', packetsRequired, 'Max. 20 allowed');
    }
    if (process.argv.includes('--debug')) {
        logInfo(`Sending ${packetsRequired} packets before final teleport`);
    }
    if (fromChat) { 
        botInstance.bot.chat(`/msg ${fromChat} Sending ${packetsRequired} packets before final teleport`);
    }

    for (let i = 0; i < packetsRequired; i++) {
        await botInstance.bot._client.write('position', {
            x: startPos.x,
            y: startPos.y,
            z: startPos.z,
            onGround: false
        });

        if (process.argv.includes('--debug')) {
            logInfo(`Packet ${i + 1}/${packetsRequired} sent`);
        }
    }
    
    await botInstance.bot._client.write('position', {
        x: goal.x + 0.5,
        y: goal.y,
        z: goal.z + 0.5,
        onGround: true
    });

    if (config.fly === true) {
        botInstance.bot.physics.gravity = 0;
    }

    if (process.argv.includes('--debug')) {
        logInfo(`Final teleport sent: ${Math.round(goal.x)}, ${Math.round(goal.y)}, ${Math.round(goal.z)}`);
    }
    if (fromChat) { 
        botInstance.bot.chat(`/msg ${fromChat} Final teleport sent: ${Math.round(goal.x)}, ${Math.round(goal.y)}, ${Math.round(goal.z)}`);
    }
}