import { botInstance } from "../index.mjs";
import { logInfo } from "../utils/logger";
import chalk from "chalk";

export function followPlayer(target) {
    const mcData = minecraftData(this.bot.version);
    const movements = new Movements(this.bot, mcData);

    movements.canDig = config.canDig;
    movements.canPlace = config.canPlace;
    botInstance.bot.pathfinder.setMovements(movements);

    const goal = new goals.GoalFollow(target, 1);
    botInstance.bot.pathfinder.setGoal(goal, true);
    logInfo(`Now following ${chalk.hex('#cfa1f0')(target.username)}`);
}

export function stopFollowPlayer() {
    botInstance.bot.pathfinder.setGoal(null);
    logInfo('Stopped following.');
}