import { botInstance } from "../index.mjs";
import { logInfo } from "../utils/logger";
import { paperclip } from "./teleport";
import { config } from "../utils/dataManagement";

export function verticalFly(height) {
    let currentHeight = botInstance.position.y;
    const upFlyInterval = setInterval(async () => {
        await paperclip(botInstance.position.x, botInstance.position.y + config.verticalFlyDistancePerTick, botInstance.position.z);
    }, 50); 
}