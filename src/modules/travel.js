// Travel Module by Oskaritoo
import { config } from "../utils/dataManagement";
const vec3 = require('vec3');
import { logError, logInfo } from "../utils/logger";

class TeleportManager {
    constructor(bot) {
        this.bot = bot;
        this.maxDistance = config.maxTeleportDistance;
        this.teleporting = false;
        this.lastTeleportTime = 0;
        this.defaultSpeed = 50; 
    }

    async teleport(x, y, z, travelHeight = null, speed = null) {
        try {
            if (this.teleporting) {
                logError('Already teleporting');
                return false;
            }

            
            const now = Date.now();
            if (now - this.lastTeleportTime < 500) {
                logError('Teleporting to fast');
                return false;
            }
            this.lastTeleportTime = now;

            const currentPos = this.bot.entity.position;
            const targetPos = vec3(x, y, z);
            const distance = currentPos.distanceTo(targetPos);
            const teleportSpeed = speed || this.defaultSpeed;

            if (distance > this.maxDistance) {
                logError(`Cannot teleport: Distance ${Math.floor(distance)} blocks exceeds maximum of ${this.maxDistance} blocks`);
                return false;
            }

            
            if (travelHeight !== null) {
                logInfo(`Skyway-Teleportation to ${x}, ${y}, ${z}, Height: ${travelHeight}, Blocks/sec ${teleportSpeed}`);
                this.teleporting = true;
                
                
                await this.teleportDirectly(currentPos.x, travelHeight, currentPos.z, teleportSpeed);
                await new Promise(resolve => setTimeout(resolve, 300)); 

                
                await this.teleportDirectly(x, travelHeight, z, teleportSpeed);
                await new Promise(resolve => setTimeout(resolve, 300)); 
                
                const success = await this.teleportDirectly(x, y, z, teleportSpeed);
                
                this.teleporting = false;
                return success;
            }
            
            logInfo(`Teleportation to ${x}, ${y}, ${z} Blocks/sec ${teleportSpeed}`);
            this.teleporting = true;
            
            
            const success = await this.teleportDirectly(x, y, z, teleportSpeed);
            
            this.teleporting = false;
            return success;
        } catch (error) {
            logError('Teleport Failed:', error);
            this.teleporting = false;
            return false;
        }
    }

    
    async teleportDirectly(x, y, z, speed = null) {
        try {
            
            const gravity = 0.08;
            const jumpVelocity = 0.42;
            
            const currentPos = this.bot.entity.position;
            const targetPos = vec3(x, y, z);
            const distance = currentPos.distanceTo(targetPos);
            
            
            const teleportSpeed = speed || this.defaultSpeed;
            
            
            await this.simulateJump();
            
            
            const blockStep = Math.min(5.0, Math.max(0.2, teleportSpeed / 10));
            const steps = Math.ceil(distance / blockStep);
            
            
            const baseDelay = Math.max(1, 1000 / teleportSpeed);
            
            
            const stepX = (x - currentPos.x) / steps;
            const stepY = (y - currentPos.y) / steps;
            const stepZ = (z - currentPos.z) / steps;
            
            
            const randomizeDelay = () => Math.max(1, baseDelay * (0.8 + Math.random() * 0.4));
            
            
            let inJump = false;
            let velocityY = 0;
            let currentX = currentPos.x;
            let currentY = currentPos.y;
            let currentZ = currentPos.z;
            
            
            this.bot._client.write('position', {
                x: currentX,
                y: currentY + 0.1,
                z: currentZ,
                onGround: false
            });
            await new Promise(resolve => setTimeout(resolve, randomizeDelay()));
            
            
            for (let i = 1; i <= steps; i++) {
                
                currentX = currentPos.x + stepX * i;
                currentY = currentPos.y + stepY * i;
                currentZ = currentPos.z + stepZ * i;
                
                
                if (i % 5 === 0) {
                    
                    inJump = true;
                    velocityY = jumpVelocity * 0.3;
                }
                
                if (inJump) {
                    
                    currentY += velocityY;
                    velocityY -= gravity;
                    if (velocityY < -jumpVelocity) {
                        inJump = false;
                        velocityY = 0;
                    }
                }
                
                
                this.bot._client.write('position', {
                    x: currentX,
                    y: currentY,
                    z: currentZ,
                    onGround: !inJump && i % 3 === 0 
                });
                
                
                this.bot.entity.position.x = currentX;
                this.bot.entity.position.y = currentY;
                this.bot.entity.position.z = currentZ;
                
                
                await new Promise(resolve => setTimeout(resolve, randomizeDelay()));
            }
            
            
            this.bot._client.write('position', {
                x: x,
                y: y,
                z: z,
                onGround: false
            });
            
            
            this.bot.entity.position.x = x;
            this.bot.entity.position.y = y;
            this.bot.entity.position.z = z;
            
            
            await new Promise(resolve => setTimeout(resolve, Math.min(50, baseDelay)));
            
            
            for (let i = 0; i < 3; i++) {
                this.bot._client.write('position', {
                    x: x,
                    y: y,
                    z: z,
                    onGround: i > 0 
                });
                await new Promise(resolve => setTimeout(resolve, Math.min(30, baseDelay / 2)));
            }
            
            this.bot.entity.onGround = true;
            logInfo(`Teleport to ${x}, ${y}, ${z} successfull finished`);
            return true;
        } catch (packetError) {
            logError('Packet-Teleportation failed:', packetError);
            return false;
        }
    }
    
    async simulateJump() {
        const pos = this.bot.entity.position;
        
        
        const jumpSequence = [
            { y: pos.y + 0.1, onGround: false, delay: 10 },
            { y: pos.y + 0.42, onGround: false, delay: 15 },
            { y: pos.y + 0.75, onGround: false, delay: 20 },
            { y: pos.y + 0.6, onGround: false, delay: 15 },
            { y: pos.y + 0.42, onGround: false, delay: 10 },
            { y: pos.y, onGround: true, delay: 10 }
        ];
        
        for (const step of jumpSequence) {
            this.bot._client.write('position', {
                x: pos.x,
                y: step.y,
                z: pos.z,
                onGround: step.onGround
            });
            await new Promise(resolve => setTimeout(resolve, step.delay));
        }
    }

    async teleportRelative(x, y, z, travelHeight = null, speed = null) {
        const currentPos = this.bot.entity.position;
        return this.teleport(
            Math.floor(currentPos.x + x),
            Math.floor(currentPos.y + y),
            Math.floor(currentPos.z + z),
            travelHeight,
            speed
        );
    }
}

module.exports = TeleportManager;