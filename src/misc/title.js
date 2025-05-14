import chalk from 'chalk';
import { LoadingAnimation } from './loader/animation.js';
import { sand } from './loader/frames.js';

export function title() { 
    console.log(chalk.gray('Rest in Peace'));
    console.log(chalk.bold.hex('#044cd9')("___  ____            _           _    ") + chalk.hex('#f5f5f5')(" _   _  _____ _____ "));
    console.log(chalk.bold.hex('#0443bf')("|  \\/  (_)          | |         | |   ") + chalk.hex('#e1e1e3')("| \\ | ||  ___|  _  |"));
    console.log(chalk.bold.hex('#033cab')("| .  . |_ _ __   ___| |__   ___ | |_  ") + chalk.hex('#b6b6b8')("|  \\| || |__ | | | |"));
    console.log(chalk.bold.hex('#02369c')("| |\\/| | | '_ \\ / _ \\ '_ \\ / _ \\| __| ") + chalk.hex('#88898a')("| . ` ||  __|| | | |"));
    console.log(chalk.bold.hex('#012e85')("| |  | | | | | |  __/ |_) | (_) | |_  ") + chalk.hex('#5a5b5c')("| |\\  || |___\\ \\_/ /"));
    console.log(chalk.bold.hex('#022975')("\\_|  |_/_|_| |_|\\___|_.__/ \\___/ \\__|") + chalk.hex('#48494a')(" \\_| \\_/\\____/ \\___/ "));
    console.log(chalk.hex('#011b4f')("By Eglijohn                                        ") + chalk.hex('#282929'));
    console.log(chalk.gray("=========================================================="));
    console.log('');
    LoadingAnimation(sand, 2000);
}