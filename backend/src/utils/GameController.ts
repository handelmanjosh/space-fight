import { CheckRadialCollisionCenter, CheckRadialCollisionTopLeft, distance2 } from "./utils";
import SpawnAway from "./SpawnAway";
import Asteroid from "./Asteroid";
import { Bullet } from "./Bullet";
import Player, { AIPlayer } from "./Player";
import { PowerUp, getPowerUp } from "./PowerUp";
import { Socket } from "socket.io";



export default class GameController {
    connected: string[];
    BulletController: Bullet[];
    AsteroidController: Asteroid[];
    PlayerController: Player[];
    AIPlayerController: AIPlayer[];
    PowerUpController: PowerUp[];
    canGenAsteroid: boolean;
    canGenAI: boolean;
    messages: Map<number, string[]>;
    sockets: Socket[];
    type: string;
    gamemode: string;
    constructor(type: string, gamemode: string) {
        this.gamemode = gamemode === "casual" ? gamemode + (new Date()).toString() : gamemode;
        this.type = type;
        this.BulletController = [];
        this.AsteroidController = [];
        this.PlayerController = [];
        this.AIPlayerController = [];
        this.PowerUpController = [];
        this.connected = [];
        this.sockets = [];
        this.canGenAsteroid = true;
        this.canGenAI = true;
        this.messages = new Map<number, string[]>();
    }
    addPlayer(player: Player, socket: Socket) {
        this.connected.push(player.address);
        this.PlayerController.push(player);
        this.sockets.push(socket);
    }
    remove(socket: Socket) {
        for (let i = 0; i < this.PlayerController.length; i++) {
            const player = this.PlayerController[i];
            if (player.address === socket.data.pubkey) {
                console.log(`Disconnected: ${player.address}`);
                this.PlayerController.splice(i, 1);
                break;
            }
        }
        for (let i = 0; i < this.connected.length; i++) {
            if (this.connected[i] == socket.data.pubkey) {
                this.connected.splice(i, 1);
                break;
            }
        }
        for (let i = 0; i < this.sockets.length; i++) {
            if (this.sockets[i].id === socket.id) {
                console.log(`Removed socket: ${socket.id}`);
                this.sockets.splice(i, 1);
                break;
            }
        }
    }
    getLeaderboard() {
        const data: { player: Player, address: string, points: number; }[] =
            [
                ...this.AIPlayerController,
                ...this.PlayerController
            ].map((player: AIPlayer | Player) => {
                return { player, address: player.address, points: player.points };
            }).sort((a, b) => b.points - a.points);
        const reward = [.01, .08, .05, .03, .01];
        for (let i = 0; i < data.length && i < 5; i++) {
            data[i].player.trophies += reward[i];
        }
        return data.map((player: { player: Player, address: string, points: number; }) => { return { address: player.address, points: player.points }; });
    }
    getRecentMessages() {
        const result: string[][] = [];
        for (const message of this.messages) {
            result.push(message[1]);
        }
        return result;
    }
    genAI() {
        const position = SpawnAway([...this.PlayerController, ...this.AsteroidController], [10000, 10000]);
        const ai = new AIPlayer(position[0], position[1], this);
        this.AIPlayerController.push(ai);
        this.canGenAI = false;
        setTimeout(() => {
            this.canGenAI = true;
        }, 100);
    }
    genPowerUp() {
        const position = [Math.random() * 10000, Math.random() * 10000];
        let powerUp: PowerUp;
        const random = Math.random();
        if (random < .05) {
            powerUp = getPowerUp("speed", position[0], position[1]);
        } else if (random < .25) {
            powerUp = getPowerUp("basic", position[0], position[1]);
        } else if (random < .5) {
            powerUp = getPowerUp("fastbullet", position[0], position[1]);
        } else if (random < .75) {
            powerUp = getPowerUp("health", position[0], position[1]);
        } else if (random < .85) {
            powerUp = getPowerUp("machinebullet", position[0], position[1]);
        } else {
            powerUp = getPowerUp("heavybullet", position[0], position[1]);
        }
        this.PowerUpController.push(powerUp);
    }
    frame() {
        this.check();
        this.move();
        if (this.canGenAsteroid && this.AsteroidController.length < 500) {
            this.genAsteroid();
        }
        if (this.canGenAI && this.AIPlayerController.length < 10 && this.gamemode !== "competitive") {
            this.genAI();
        }
        if (this.PowerUpController.length < 100) {
            this.genPowerUp();
        }
    }
    genAsteroid() {
        let x = Math.random() * 10000;
        let y = Math.random() * 10000;
        let vx = randomNeg() * 2;
        let vy = randomNeg() * 2;
        let angleDelta = randomNeg() * 0.001;
        let width = randomBetween(40, 200);
        const asteroid = new Asteroid(x, y, vx, vy, angleDelta, width);
        this.AsteroidController.push(asteroid);
        this.canGenAsteroid = false;
        setTimeout(() => {
            this.canGenAsteroid = true;
        }, 100);
    }
    registerKill(item1: string, item2: string) {
        const key = Date.now();
        this.messages.set(key, [item1, item2]);
        setTimeout(() => {
            this.messages.delete(key);
        }, 2000);
    }
    check() {
        this.BulletController.forEach((bullet: Bullet, i: number) => {
            if (bullet.delete) {
                this.BulletController.splice(i, 1);
            }
            [...this.PlayerController, ...this.AsteroidController, ...this.AIPlayerController].forEach((object: Player | Asteroid) => {
                if (object.dead) return;
                if (object instanceof Player) {
                    if (bullet.creator.address == object.address) {
                        //player cannot shoot self
                        return;
                    }
                }
                CheckRadialCollisionCenter(bullet, object, () => {
                    if (object instanceof Player) {
                        object.takeDamage(bullet);
                        if (object.health - bullet.damage < 1) {
                            if (!object.dead) {
                                bullet.creator.creditKill(object.address);
                                this.registerKill(bullet.creator.address, object.address);
                            }
                        }
                    } else {
                        bullet.creator.points += 50; // increment points for hitting asteroid
                        object.end();
                    }
                });
            });
        });
        this.PowerUpController.forEach((powerUp: PowerUp, i: number) => {
            if (powerUp.delete) {
                this.PowerUpController.splice(i, 1);
            } else {
                this.PlayerController.forEach((player: Player) => {
                    CheckRadialCollisionCenter(powerUp, player, () => {
                        powerUp.collect(player);
                    });
                });
            }
        });
        this.AsteroidController.forEach((asteroid: Asteroid, i: number) => {
            if (asteroid.delete) {
                this.AsteroidController.splice(i, 1);
            }
            if (asteroid.dead) return;
            [...this.PlayerController, ...this.AIPlayerController].forEach((player: Player | AIPlayer) => {
                if (player.dead) return;
                CheckRadialCollisionCenter(player, asteroid, () => {
                    player.end("Asteroid");
                    this.registerKill("Asteroid", player.address);
                });
            });
            this.AsteroidController.forEach((asteroid2: Asteroid) => {
                if (asteroid2.dead) return;
                //for collisions between asteroids
            });
        });
        this.PlayerController.forEach((player: Player, i: number) => {
            if (player.delete) {
                this.PlayerController.splice(i, 1);
            }
        });
        this.AIPlayerController.forEach((ai: AIPlayer, i: number) => {
            if (ai.delete) {
                this.AIPlayerController.splice(i, 1);
            }
        });
    }
    move() {
        this.asObjectList().forEach((object: Bullet | Asteroid | Player | AIPlayer | PowerUp) => {
            if (object instanceof Player && !(object instanceof AIPlayer)) {
                object.move(this.AsteroidController);
            } else if (object instanceof AIPlayer) {
                object.move([...this.PlayerController, ...this.AIPlayerController]);
            } else {
                object.move();
            }
        });
    }
    asObjectList() {
        return [
            ...this.AsteroidController,
            ...this.BulletController,
            ...this.PlayerController,
            ...this.AIPlayerController,
            ...this.PowerUpController
        ];
    }
    asSerializeable(): (Bullet | Asteroid | Player | AIPlayer | PowerUp)[] {
        //@ts-ignore
        return [
            ...this.AsteroidController,
            ...this.BulletController,
            ...this.PlayerController,
            ...this.AIPlayerController,
            ...this.PowerUpController
        ].map(object => object.asObject());
    }
    //there is a better data structure to use - think graph
    getRelevantObjects(objectList: { x: number, y: number; }[], address: string, depth: number = 1000) {
        const player = this.PlayerController.find((player: Player) => player.address === address);
        if (player) {
            const result: { x: number, y: number; }[] = [];
            objectList.forEach((object: { x: number, y: number; }) => {
                if (distance2(object, player) < depth) {
                    result.push(object);
                }
            });
            return result;
        } else {
            return objectList;
        }
    }
}

const randomNeg = () => Math.random() - 0.5;

const randomBetween = (low: number, high: number) => {
    return low + (Math.random() * (high - low));
};