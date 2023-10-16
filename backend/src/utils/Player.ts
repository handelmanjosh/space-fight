import { getAllPowerUps, mints, sendSol, sendToken } from "../solana/coins";
import { NFTMetadata, updateNFT } from "../solana/nft";
import { AvailableBullet, Bullet, genBullet } from "./Bullet";
import GameController from "./GameController";
import { AvailablePowerUp, getPowerUp } from "./PowerUp";
import { CheckRadialCollisionCenter } from "./utils";

export const levelToPointsMultiplier = (level: number) => 1 + level * 0.1;
export const levelToPowerUpDuration = (level: number) => 1 + level * 0.05;
export const levelToTrophyMultiplier = (level: number) => 1 + level * 0.02;
export const killsToNextLevel = (level: number) => level + 1;
const availableImg = [
    "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-normal.png",
    "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-green.png",
    "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-blue.png",
    "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-yellow.png",
];
const levelToImg = (level: number) => {
    if (level < 2) return availableImg[0];
    if (level < 5) return availableImg[1];
    if (level < 10) return availableImg[2];
    return availableImg[3];
};
export default class Player {
    width: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    vMax: number;
    angle: number;
    address: string;
    imgSrc: string;
    delete: boolean;
    dead: boolean;
    game: GameController;
    canShoot: boolean;
    canMove: boolean;
    deltaX: number;
    deltaY: number;
    points: number;
    trophies: number;
    health: number;
    selectedBullet: AvailableBullet;
    grapplePressed: boolean;
    powerUps: Map<string, number>;
    private psuedofriction: number;
    private target: { x: number, y: number; } | null;
    private grappleLocked: boolean;
    private grappleMaxStrength: number;
    private grappleSpeed: number;
    private grapplePosition: number[];
    kills: number;
    end: (killer: string) => any;
    onKill: (killee: string) => any;
    metadata: NFTMetadata & { nft: string; };
    constructor(width: number, vMax: number, address: string, end: (killer: string) => any, onKill: (killee: string) => any, isAi: boolean, metadata: NFTMetadata & { nft: string; }) {
        this.metadata = metadata;
        this.trophies = 0;
        this.width = width;
        this.vMax = vMax;
        this.kills = 0;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.psuedofriction = .2;
        this.address = address;
        this.canShoot = true, this.canMove = true;
        this.grappleMaxStrength = 1.5 * vMax;
        this.grappleSpeed = vMax * 2;
        this.imgSrc = isAi ? availableImg[Math.floor(Math.random() * availableImg.length)] : levelToImg(metadata.level);
        this.points = 0;
        this.health = 15; //max health = 15;
        // setInterval(() => {
        //     this.health = 50;
        // }, 2000);
        this.selectedBullet = "basic";
        if (!isAi) {
            this.powerUps = new Map(Array.from(mints).map(mint => [mint[0], 0]));
            // set metadata here;
            console.log(metadata);
        }
        this.end = (killer: string) => {
            if (this.dead) return;
            this.dead = true;
            this.canMove = false;
            this.canShoot = false;
            //will be effectively asynchronous
            if (!isAi) {
                if (this.trophies > 0) sendToken(mints.get("trophy")!, this.address, this.trophies * levelToTrophyMultiplier(this.metadata.trophyMultiplierLevel));
                if (this.points > 0) sendToken(mints.get("cash")!, this.address, this.points * levelToPointsMultiplier(this.metadata.pointsMultiplierLevel));
                for (const [name, num] of Array.from(this.powerUps)) {
                    if (num > 0) {
                        sendToken(mints.get(name)!, this.address, num);
                    }
                }
                if (this.kills > 0) {
                    this.metadata.kills += this.kills;
                    updateNFT(
                        this.metadata.nft,
                        this.metadata
                    );
                }
            }
            this.animateExplode(0, killer);
            end(killer);
        };
        this.onKill = (killee: string) => {
            if (this.game.gamemode === "competitive") {
                sendSol(this.address, 0.01 * 0.95);
            }
            this.kills++;
            onKill(killee);
        };
    }
    usePowerUp(type: string) {
        if (this.powerUps.get(type) && this.powerUps.get(type)! > 0) {
            this.powerUps.set(type, this.powerUps.get(type)! - 1);
            const powerUp = getPowerUp(type as AvailablePowerUp, 0, 0);
            powerUp.powerUp(this);
        }
    }
    takeDamage = (bullet: Bullet) => {
        if (this.health < 1) return;
        this.health -= bullet.damage;
        if (this.health < 1) {
            this.end(bullet.creator.address);
        }
        if (this.imgSrc !== "/space-fight/spaceship-red.png") {
            const old = this.imgSrc;
            this.imgSrc = "/space-fight/spaceship-red.png";
            setTimeout(() => {
                this.imgSrc = old;
            }, 200);
        }
    };
    creditKill(address: string) {
        if (this.game.bounties.has(address)) {
            const amount = this.game.bounties.get(address);
            sendSol(this.address, amount * 0.95);
            this.game.bounties.delete(address);
        }
        this.points += 1000;
        this.onKill(address);
    }
    animateExplode(i: number, killer: string) {
        this.imgSrc = `/explosions/explosion${i}.png`;
        if (i < 4) {
            setTimeout(() => {
                this.animateExplode(i + 1, killer);
            }, 100);
        } else {
            this.delete = true;
        }
    }
    move(blocks: { x: number, y: number; }[]) {
        if (!this.canMove) return;
        this.x += (this.vx + this.deltaX);
        this.y += (this.vy + this.deltaY);
        if (Math.abs(this.deltaY) < this.psuedofriction) {
            this.deltaY = 0;
        } else {
            if (this.deltaY < 0) {
                this.deltaY += this.psuedofriction;
            } else {
                this.deltaY -= this.psuedofriction;
            }
        }
        if (Math.abs(this.deltaX) < this.psuedofriction) {
            this.deltaX = 0;
        } else {
            if (this.deltaX < 0) {
                this.deltaX += this.psuedofriction;
            } else {
                this.deltaX -= this.psuedofriction;
            }
        }
        if (this.grapplePressed) {
            this.continueGrapple(blocks);
        } else {
            this.grapplePosition = [this.x, this.y];
            this.grappleLocked = false;
            this.target = null;
        }

        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > 10000) this.x = 10000;
        if (this.y > 10000) this.y = 10000;
    }
    continueGrapple(blocks: { x: number; y: number; }[]) {
        if (this.grappleLocked) {
            let xDist = this.target!.x - this.x;
            let yDist = this.target!.y - this.y;
            let angle = Math.abs(Math.atan(yDist / xDist));
            if (yDist > 0) {
                this.deltaY = Math.sin(angle) * this.grappleMaxStrength;
            } else {
                this.deltaY = -1 * Math.sin(angle) * this.grappleMaxStrength;
            }
            if (xDist > 0) {
                this.deltaX = Math.cos(angle) * this.grappleMaxStrength;
            } else {
                this.deltaX = -1 * Math.cos(angle) * this.grappleMaxStrength;
            }
            this.grapplePosition = [this.target!.x, this.target!.y];
        } else {
            if (this.target) {
                let xDiff = this.grapplePosition[0] - this.target.x;
                let yDiff = this.grapplePosition[1] - this.target.y;
                if (Math.abs(xDiff) <= 1 && Math.abs(yDiff) <= 1) this.grappleLocked = true;
                if (Math.abs(xDiff) < this.grappleSpeed) {
                    this.grapplePosition[0] = this.target.x;
                } else {
                    if (xDiff < 0) {
                        this.grapplePosition[0] += this.grappleSpeed;
                    } else {
                        this.grapplePosition[0] -= this.grappleSpeed;
                    }
                }
                if (Math.abs(yDiff) < this.grappleSpeed) {
                    this.grapplePosition[1] = this.target.y;
                } else {
                    if (yDiff < 0) {
                        this.grapplePosition[1] += this.grappleSpeed;
                    } else {
                        this.grapplePosition[1] -= this.grappleSpeed;
                    }
                }
            } else {
                let maxD = Infinity;
                let finalBlock: { x: number, y: number; } | null = null;
                for (let block of blocks) {
                    let d = distance([this.x, this.y], [block.x, block.y]);
                    if (d < maxD) {
                        maxD = d;
                        finalBlock = block;
                    }
                }
                this.target = finalBlock;
            }
        }
    }

    updateVelocity(x: number, y: number, width: number, height: number) {
        let playerPos = [width / 2, height / 2];
        // this.setAngle(x, y, width, height);
        let xDiff = x - playerPos[0];
        let yDiff = y - playerPos[1];
        let maxDiff = this.width * 3;

        let rx = xDiff / maxDiff;
        let ry = yDiff / maxDiff;

        if (rx > 1) rx = 1;
        if (rx < -1) rx = -1;
        if (ry > 1) ry = 1;
        if (ry < -1) ry = -1;

        this.vx = this.vMax * rx;
        this.vy = this.vMax * ry;
        this.updateAngle();
    }
    setAngle(x: number, y: number, width: number, height: number) {
        let xDiff = x - width / 2;
        let yDiff = y - height / 2;
        let angle = Math.atan2(yDiff, xDiff);
        this.angle = angle + Math.PI / 2;
    }
    updateAngle() {
        if (this.vy == 0 && this.vx == 0) return;
        const to_radians = Math.PI / 180;
        const to_degrees = 180 / Math.PI;

        let tempAngle = Math.abs(Math.atan(this.vy / this.vx));
        tempAngle = tempAngle * to_degrees;

        if (this.vx > 0 && this.vy > 0) {
            this.angle = (90 + tempAngle) * to_radians;
        } else if (this.vx < 0 && this.vy > 0) {
            this.angle = (270 - tempAngle) * to_radians;
        } else if (this.vx < 0 && this.vy < 0) {
            this.angle = (270 + tempAngle) * to_radians;
        } else if (this.vx > 0 && this.vy < 0) {
            this.angle = (90 - tempAngle) * to_radians;
        } else {
            if (this.vx == 0) {
                if (this.vy > 0) {
                    this.angle = Math.PI;
                } else {
                    this.angle = 0;
                }
            } else if (this.vy == 0) {
                if (this.vx > 0) {
                    this.angle = Math.PI / 2;
                } else {
                    this.angle = Math.PI * 3 / 2;
                }
            } else {
                console.error("oh poop");
            }
        }
    }
    shoot() {
        this.canShoot = false;
        const bullet = genBullet(this.selectedBullet, this.x, this.y, this.angle, this);
        this.game.BulletController.push(bullet);
        setTimeout(() => {
            this.canShoot = true;
        }, bullet.cooldown);
    }
    asObject() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            angle: this.angle,
            address: this.address,
            imgSrc: this.imgSrc,
            vx: this.vx,
            vy: this.vy,
            health: this.health,
            grapplePressed: this.grapplePressed,
            grapplePosition: this.grapplePosition,
            powerUps: this.powerUps !== undefined ? Array.from(this.powerUps) : undefined,
        };
    }
}
// should override shoot method
export class TripleShot extends Player {
    shoot() {
        this.canShoot = false;
        const bullet = genBullet(this.selectedBullet, this.x, this.y, this.angle, this);
        const bullet2 = genBullet(this.selectedBullet, this.x, this.y, this.angle + Math.PI / 8, this);
        const bullet3 = genBullet(this.selectedBullet, this.x, this.y, this.angle - Math.PI / 8, this);
        this.game.BulletController.push(...[bullet, bullet2, bullet3]);
        setTimeout(() => {
            this.canShoot = true;
        }, bullet.cooldown);
    }
}
export class QuintupleShot extends Player {
    shoot() {
        this.canShoot = false;
        const bullets: Bullet[] = [];
        for (let i = this.angle - Math.PI / 5; i <= this.angle + Math.PI / 5; i += Math.PI / 10) {
            bullets.push(genBullet(this.selectedBullet, this.x, this.y, i, this));
        }
        this.game.BulletController.push(...bullets);
        setTimeout(() => {
            this.canShoot = true;
        }, bullets[0].cooldown);
    }
}
export class TriShot extends Player {
    shoot() {
        this.canShoot = false;
        const bullets: Bullet[] = [];
        for (let i = this.angle - Math.PI / 2; i <= this.angle + Math.PI / 2; i += Math.PI / 2) {
            bullets.push(genBullet(this.selectedBullet, this.x, this.y, i, this));
        }
        this.game.BulletController.push(...bullets);
        setTimeout(() => {
            this.canShoot = true;
        }, bullets[0].cooldown * 2);
    }
}
export class RapidFire extends Player {
    shoot() {
        this.canShoot = false;
        const deltas = [Math.cos(this.angle) * this.width / 4, Math.sin(this.angle) * this.width / 4];
        const bullet1 = genBullet(this.selectedBullet, this.x + deltas[0], this.y + deltas[1], this.angle, this);
        const bullet2 = genBullet(this.selectedBullet, this.x - deltas[0], this.y - deltas[1], this.angle, this);
        const bullet3 = genBullet(this.selectedBullet, this.x + deltas[0], this.y + deltas[1], this.angle, this);
        const bullet4 = genBullet(this.selectedBullet, this.x - deltas[0], this.y - deltas[1], this.angle, this);
        this.game.BulletController.push(...[bullet1, bullet3]);
        setTimeout(() => {
            this.game.BulletController.push(...[bullet2, bullet4]);
        }, bullet1.cooldown / 2);
        setTimeout(() => {
            this.canShoot = true;
        }, bullet1.cooldown);
    }
}
export class Massive extends Player {
    shoot() {
        this.canShoot = false;
        const bullet = genBullet(this.selectedBullet, this.x, this.y, this.angle, this);
        bullet.width *= 4;
        bullet.damage *= 4;
        bullet.vy /= 3;
        bullet.vx /= 3;
        this.game.BulletController.push(bullet);
        setTimeout(() => {
            this.canShoot = true;
        }, bullet.cooldown * 3);
    }
}
export class Destroyer extends Player {
    shoot() {
        this.canShoot = false;
        this.x += 3 * this.vx;
        this.y += 3 * this.vy;
        [...this.game.AIPlayerController, ...this.game.PlayerController].forEach((player: Player | AIPlayer) => {
            CheckRadialCollisionCenter(this, player, () => {
                player.health -= 10;
                this.health -= 1;
            });
        });
        setTimeout(() => {
            this.canShoot = true;
        }, 100);
    }
}
export class RearGuard extends Player {
    shoot() {
        this.canShoot = false;
        const bullet = genBullet(this.selectedBullet, this.x, this.y, this.angle, this);
        const bullet2 = genBullet(this.selectedBullet, this.x, this.y, this.angle + Math.PI + Math.PI / 8, this);
        const bullet3 = genBullet(this.selectedBullet, this.x, this.y, this.angle + Math.PI - Math.PI / 8, this);
        this.game.BulletController.push(...[bullet, bullet2, bullet3]);
        setTimeout(() => {
            this.canShoot = true;
        }, bullet.cooldown);
    }
}
export class SuperRearGuard extends Player {
    shoot() {
        this.canShoot = false;
        const bullet = genBullet(this.selectedBullet, this.x, this.y, this.angle, this);
        const bullet2 = genBullet(this.selectedBullet, this.x, this.y, this.angle + Math.PI + Math.PI / 8, this);
        const bullet3 = genBullet(this.selectedBullet, this.x, this.y, this.angle + Math.PI - Math.PI / 8, this);
        const bullet4 = genBullet(this.selectedBullet, this.x, this.y, this.angle + Math.PI + Math.PI / 4, this);
        const bullet5 = genBullet(this.selectedBullet, this.x, this.y, this.angle + Math.PI - Math.PI / 4, this);
        this.game.BulletController.push(...[bullet, bullet2, bullet3, bullet4, bullet5]);
        setTimeout(() => {
            this.canShoot = true;
        }, bullet.cooldown);
    }
}
export class MultiShot extends Player {
    shoot() {
        this.canShoot = false;
        const deltas = [Math.cos(this.angle) * this.width / 4, Math.sin(this.angle) * this.width / 4];
        const bullet = genBullet(this.selectedBullet, this.x + deltas[0], this.y + deltas[1], this.angle, this);
        const bullet2 = genBullet(this.selectedBullet, this.x - deltas[0], this.y - deltas[1], this.angle, this);
        this.game.BulletController.push(bullet);
        setTimeout(() => {
            this.game.BulletController.push(bullet2);
        }, bullet.cooldown / 4);
        setTimeout(() => {
            this.canShoot = true;
        }, bullet.cooldown);
    }
}

const distance = (a: number[], b: number[]): number => {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
};
const generateRandomAddress = () => {
    const options = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const address = Array.from({ length: 44 }).reduce((acc: string) => {
        return acc + options[Math.floor(Math.random() * options.length)];
    }, "");
    return address as string;
};
export class AIPlayer extends Player {
    playerTarget: { x: number, y: number, dead: boolean; fake?: boolean; } | undefined;
    targetPos: [number, number] | undefined;
    isAI: boolean;
    constructor(x: number, y: number, game: GameController) {
        //divide vMax by 2 to make it easier for players to avoid AI
        super(30, 10, generateRandomAddress(), (killer: string) => null, (killee: string) => null, true, {} as NFTMetadata & { nft: string; });
        this.isAI = true;
        this.x = x;
        this.y = y;
        this.game = game;
    }
    setAngle() {
        let angle = Math.atan2(this.vy, this.vx);
        this.angle = angle + Math.PI / 2;
    }
    move(players: (Player | AIPlayer)[]) {
        if (!this.canMove) return;
        if (this.playerTarget) {
            if (!this.playerTarget.dead) {
                if (this.targetPos) {
                    const xDist = this.targetPos[0] - this.x;
                    const yDist = this.targetPos[1] - this.y;
                    const angle = Math.atan2(yDist, xDist);
                    this.vx = Math.cos(angle) * this.vMax;
                    this.vy = Math.sin(angle) * this.vMax;
                    if (this.canShoot && Math.random() < 0.1) {
                        this.shoot();
                    }
                    this.x += this.vx;
                    this.y += this.vy;
                    this.setAngle();
                    if (xDist < this.vMax && yDist < this.vMax) {
                        this.targetPos = undefined;
                        if (this.playerTarget.fake) this.playerTarget = undefined;
                    }
                } else {
                    if (Math.random() > 0.05) {
                        this.targetPos = [this.playerTarget.x + 200 * randomNeg(), this.playerTarget.y + 200 * randomNeg()];
                    } else {
                        this.playerTarget = { x: Math.random() * 10000, y: Math.random() * 10000, dead: false, fake: true };
                    }
                }
            } else {
                this.playerTarget = undefined;
            }
        } else {
            //const humans = players.filter((player: Player | AIPlayer) => player instanceof Player);
            const humans = players;
            let minIndex: number[] = [];
            let minDistance = Infinity;
            humans.forEach((player: Player | AIPlayer, i: number) => {
                if (player.address === this.address) return;
                const dist = distance([player.x, player.y], [this.x, this.y]);
                if (dist < minDistance) {
                    minDistance = dist;
                    minIndex = [i].concat(minIndex);
                    minIndex = minIndex.splice(0, minIndex.length > 3 ? 3 : minIndex.length);
                }
            });
            this.playerTarget = humans[minIndex[Math.floor(Math.random() * minIndex.length)]];
            if (!this.playerTarget) {
                this.playerTarget = { x: Math.random() * 10000, y: Math.random() * 10000, dead: false, fake: true };
            }
        }
    }
}

const randomNeg = () => Math.random() - 0.5;
