import { logWarn, logError, logInfo } from "../utils/logger.js";
import { botInstance } from "../index.mjs";
import { maceAttack, attack } from "./attack.js";
import { config } from "../utils/dataManagement.js";
import { diedEntities } from "../index.mjs";

const attackIntervals = new Map(); 

export function killAura() {
    const targetsInRange = Object.values(botInstance.bot.players)
        .filter(player => {
            if (!player.entity) return false;

            const distance = botInstance.bot.entity.position.distanceTo(player.entity.position);
            if (distance > config.killAuraRange) return false;

            if (config.killAuraMode === 'all') {
                return !config.friends.includes(player.username);
            } else if (config.killAuraMode === 'blacklist') {
                return config.blacklist.some(entry => entry.username === player.username);
            }

            return false;
        });

    targetsInRange.forEach(player => {
        try {
            if (!attackIntervals.has(player.username) && !diedEntities.includes(player.entityId)) {
                logWarn(`Target Player ${player.username} entered my Range`);
                const attackLoop = setInterval(() => {
                    const distance = botInstance.bot.entity.position.distanceTo(player.entity?.position);

                    if (distance > config.generalReach) {
                        if (attackIntervals.has(player.username)) {
                            clearInterval(attackIntervals.get(player.username));
                            attackIntervals.delete(player.username);
                            logWarn(`Stopped attacking ${player.username}`);
                        }
                        return;
                    }

                    const mace = botInstance.bot.inventory.items().find(item => item.name.includes('mace'));
                    if (mace) {
                        maceAttack(player.entity, config.killAuraAttack);
                    } else {
                        attack(player.entity);
                    }
                }, 500);

                attackIntervals.set(player.username, attackLoop);
            }
        } catch (err) {
            logError(`Error handling target player ${player.username}: ${err.message}`);
        }
    });

    for (const [username, interval] of attackIntervals.entries()) {
        if (!targetsInRange.some(player => player.username === username)) {
            clearInterval(interval);
            attackIntervals.delete(username);
        }
    }
}