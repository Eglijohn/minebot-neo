import http from 'http';
import fs from 'fs';
import { logError, logInfo, logWarn } from "./logger.js";
import chalk from 'chalk';
import path from 'path';


export class WebServer {
    constructor(hostname = 'localhost') {
        this.hostname = hostname;
        this.port = 3000;
        this.server = null;
    }

    start() {
        this.server = http.createServer((req, res) => {
            const filePath = path.join('src/panel', 'index.html');

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end('Error loading page');
                    logError('Error reading index.html:', err);
                } else {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html');
                    res.end(data);
                }
            });
        });

        this.server.listen(this.port, this.hostname, () => {
            logInfo(chalk.red(`Webserver running at http://${this.hostname}:${this.port}/`));
        });
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                logWarn('Server stopped.');
            });
        } else {
            logWarn('Server isn\'t running');
        }
    }
}