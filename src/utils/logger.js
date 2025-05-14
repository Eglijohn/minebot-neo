import chalk from 'chalk';
import fs from 'fs';
import { config } from './dataManagement.js';
import { botInstance } from "../index.mjs";

let count = 0;
const ansiEscape = /\x1b\[[0-9;]*m/g;


export function log(...msg) {
    const counter = `${chalk.hex('#1f1f1f')(`[${count}]`)}`;
    count += 1; 

    const timestamp = new Date().toLocaleString().slice(0, 16).replace('T', ' ');
    const formattedTimestamp = `[${timestamp}]`;
    const usernameTag = `[${botInstance && botInstance.bot && botInstance.bot.username ? botInstance.bot.username : 'Bot'}]`;
    
    const consoleMessageCounter = `${counter} ${chalk.gray(formattedTimestamp)} ${chalk.blue(usernameTag)} ${msg.join(' ')}`;
    const consoleMessage = `${chalk.gray(formattedTimestamp)} ${chalk.blue(usernameTag)} ${msg.join(' ')}`;
    
    const fileMessage = `${formattedTimestamp} ${usernameTag} ${msg.join(' ').replace(ansiEscape, '')}`;
    
    fs.appendFileSync('logs/log.txt', fileMessage + '\n'); 
    if (config.consoleCounter == true) {
        console.log(consoleMessageCounter);
    } else {
        console.log(consoleMessage);
    }
}


export function logJoin(...msg) {
    log(chalk.gray('[') + chalk.green('+') + chalk.gray(']'), ...msg);
}

export function logLeave(...msg) {
    log(chalk.gray('[') + chalk.red('-') + chalk.gray(']'), ...msg);
}

export function logError(...msg) {
    log(chalk.gray('[') + chalk.red('ERROR') + chalk.gray(']'), chalk.red(...msg));
}

export function logInfo(...msg) {
    log(chalk.gray('[') + chalk.green('INFO') + chalk.gray(']'), ...msg);
}

export function logWarn(...msg) {
    log(chalk.gray('[') + chalk.yellow('WARN') + chalk.gray(']'), chalk.yellow(...msg));
}

export function logChat(...msg) {
    log(chalk.gray('[') + chalk.green('CHAT') + chalk.gray(']'), chalk.white(...msg));
}