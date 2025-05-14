import chalk from 'chalk';
import WebSocket from 'ws';
import { mineflayer as mineflayerViewer } from 'prismarine-viewer';
import mineflayerWebInventory from "mineflayer-web-inventory";
import { config } from '../utils/dataManagement.js';
import { wss } from './index.js';
import { logInfo, logWarn } from '../utils/logger.js';


export function startViewer() {
    if (process.argv.includes('--experiments')) {
        /* Start Webservers */
        mineflayerWebInventory(this.bot, { port: config.webInventoryPort });
        logInfo(chalk.green(`Mineflayer Web Inventory server running on http://localhost:${config.webInventoryPort}`));

        mineflayerViewer(this.bot, {
            port: config.viewerPortFP,
            firstPerson: true,
            viewDistance: config.viewDistance
        });
        logInfo(chalk.green(`Prismarine viewer FP mode web server running on http://localhost:${config.viewerPortFP}`));

        mineflayerViewer(this.bot, {
            port: config.viewerPort,
            viewDistance: config.viewDistance
        });
        logInfo(chalk.green(`Prismarine viewer web server running on http://localhost:${config.viewerPort}`));

        /* Please God, Please make this work */
        this.bot.on('path_update', (r) => {
            const path = [this.bot.entity.position.offset(0, 0.5, 0)];
            for (const node of r.path) {
                path.push({ x: node.x, y: node.y + 0.5, z: node.z });
            }
            this.bot.viewer.drawLine('path', path, 0x429ef5);
            if (process.argv.includes('--debugMode')) {
                logInfo(`Path updated: ${r.path.length} nodes.`);
            }
        });

        this.bot.on('goal_reached', () => {
            logInfo('Goal reached.');
            this.bot.viewer.erase('path');
        });

        if (process.argv.includes('--debugMode')) {
            this.bot.on('path_reset', (reason) => {
                logWarn(`Path reset: ${reason}`);
            });

            this.bot.on('goal_updated', (goal) => {
                logInfo(`Goal updated: X: ${goal.x}, Y: ${goal.y}, Z: ${goal.z}`);
            });
        }

        this.bot.viewer.on('blockClicked', (block) => {
            const b = {
                x: block.position.x,
                y: block.position.y,
                z: block.position.z
            };
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'blockClicked', position: b }));
                }
            });

            const selectedBlock = [
                { x: b.x,       y: b.y + 1.01, z: b.z       },
                { x: b.x + 1,   y: b.y + 1.01, z: b.z       },
                { x: b.x + 1,   y: b.y + 1.01, z: b.z + 1   },
                { x: b.x,       y: b.y + 1.01, z: b.z + 1   },
                { x: b.x,       y: b.y + 1.01, z: b.z       }
            ];

            const middleLine = [
                { x: b.x + 0.5, y: b.y + 1.01, z: b.z + 0.5 },
                { x: b.x + 0.5, y: b.y + 2.01, z: b.z + 0.5 }
            ]

            const indicatorColor = 0x429ef5

            this.bot.viewer.drawLine('selectedBlock', selectedBlock, indicatorColor);
            this.bot.viewer.drawLine('middleLine', middleLine, indicatorColor);
        });
    }
}