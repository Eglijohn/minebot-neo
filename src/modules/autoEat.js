import { botInstance } from "../index.mjs";
import { logInfo, logWarn } from "../utils/logger.js";

export async function autoEat() {
    if (botInstance.bot.food < 20) {
        const foodItem = botInstance.bot.inventory.items().find(item =>    item.name.includes('apple')          ||
                                                                    item.name.includes('baked_potato')   ||
                                                                    item.name.includes('beef')           ||
                                                                    item.name.includes('beetroot')       ||
                                                                    item.name.includes('beetroot_soup')  ||
                                                                    item.name.includes('bread')          ||
                                                                    item.name.includes('carrot')         ||
                                                                    item.name.includes('chicken')        ||
                                                                    item.name.includes('chorus_fruit')   ||
                                                                    item.name.includes('cod')            ||
                                                                    item.name.includes('cookie')         ||
                                                                    item.name.includes('enchanted_golden_apple') ||
                                                                    item.name.includes('fish')           ||
                                                                    item.name.includes('golden_apple')   ||
                                                                    item.name.includes('golden_carrot')  ||
                                                                    item.name.includes('honey_bottle')   ||
                                                                    item.name.includes('melon')          ||
                                                                    item.name.includes('mushroom_stew')  ||
                                                                    item.name.includes('mutton')         ||
                                                                    item.name.includes('porkchop')       ||
                                                                    item.name.includes('potato')         ||
                                                                    item.name.includes('pufferfish')     ||
                                                                    item.name.includes('pumpkin_pie')    ||
                                                                    item.name.includes('rabbit')         ||
                                                                    item.name.includes('rabbit_stew')    ||
                                                                    item.name.includes('salmon')         ||
                                                                    item.name.includes('suspicious_stew') ||
                                                                    item.name.includes('sweet_berries')  ||
                                                                    item.name.includes('tropical_fish')  ||
                                                                    item.name.includes('poisonous_potato'));
        if (foodItem) {
            try {
                await botInstance.bot.equip(foodItem, 'hand');
                await botInstance.bot.consume();
                logInfo(`Ate ${foodItem.displayName}`);
            } catch (err) {
                if (err.message === 'Consuming cancelled due to calling bot.consume() again') {
                    return;
                } else {
                    logWarn(`Failed to eat ${foodItem.displayName}: ${err.message}`);
                }
            }
        } else {
            return;
        }
    }
}