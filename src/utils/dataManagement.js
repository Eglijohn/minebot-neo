import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { parse, modify, applyEdits } from 'jsonc-parser';
import { logError } from "./logger.js";

export let config = {};
export const botArgs = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../../config/CONFIG.jsonc');
const pearlsPath = path.resolve(__dirname, '../saves/pearls.json');

export async function readConfigFile() {
    try {
        const data = await readFile(configPath, 'utf8');
        config = parse(data);
        botArgs.host = config.host;
        botArgs.version = config.version;

        if (config.needsPort) {
            botArgs.port = config.port;
        }
    } catch (error) {
        logError('Error reading or parsing CONFIG.jsonc:', error);
        process.exit(1);
    }
}

function readConfig() {
    const data = fs.readFileSync(configPath, 'utf8');
    return parse(data);
}

function writeConfig(newConfig) {
    const data = fs.readFileSync(configPath, 'utf8');
    const edits = modify(data, ['blacklist'], newConfig.blacklist, { formattingOptions: { insertSpaces: true, tabSize: 4 } });
    const newContent = applyEdits(data, edits);
    fs.writeFileSync(configPath, newContent, 'utf8');
}

export function reloadConfig() {
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        config = parse(data);
    } catch (error) {
        logError('Error reloading CONFIG.jsonc:', error);
    }
}

export function addToBlacklist(username, reason) {
    const config = readConfig();
    const newEntry = { username, reason };
    config.blacklist.push(newEntry);
    writeConfig(config);
}

export function removeFromBlacklist(username) {
    const config = readConfig();
    config.blacklist = config.blacklist.filter(entry => entry.username !== username);
    writeConfig(config);
}

export function addPearl(username, trapdoorPos, entityId) {
    try {
        const data = JSON.parse(fs.readFileSync(pearlsPath, 'utf8') || '{"stasisChambers": []}');
        const existingEntry = data.stasisChambers.find(entry => entry.player === username);
        const [x, y, z] = trapdoorPos;

        if (existingEntry) {
            existingEntry.trapdoor = trapdoorPos; 
            existingEntry.entityId = entityId;
        } else {
            data.stasisChambers.push({ player: username, trapdoor: [x, y, z], entityId: entityId }); 
        }

        fs.writeFileSync(pearlsPath, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        logError('Error adding pearl:', error);
    }
}