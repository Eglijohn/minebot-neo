import { logInfo, logError } from '../utils/logger.js';
import { botInstance } from "../index.mjs";

export async function dropItem(itemName, amount) {
    const item = botInstance.bot.inventory.items().find(i => i.name === itemName);
    if (!item) {
        logError(`I don't have any ${itemName}.`);
        return;
    }

    const dropAmount = Math.min(amount, item.count);
    botInstance.bot.toss(item.type, null, dropAmount);
    logInfo(`Dropped ${dropAmount} ${itemName}(s).`);
}