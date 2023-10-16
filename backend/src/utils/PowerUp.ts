import { mints, sendToken } from "../solana/coins";
import Player, { levelToPowerUpDuration } from "./Player";


export type AvailablePowerUp = "basic" | "health" | "heavybullet" | "fastbullet" | "machinebullet" | "speed";
export const getPowerUp = (type: AvailablePowerUp, x: number, y: number) => {
    if (type == "basic") {
        return new BasicPowerUp(x, y);
    } else if (type == "health") {
        return new HealthPowerUp(x, y);
    } else if (type == "heavybullet") {
        return new HeavyBulletPowerUp(x, y);
    } else if (type == "fastbullet") {
        return new FastBulletPowerUp(x, y);
    } else if (type == "speed") {
        return new SpeedPowerUp(x, y);
    } else {
        return new MachineBulletPowerUp(x, y);
    }
};
export class PowerUp {
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number; //collision detection is screwed because this represents a radius before we use the image
    duration: number;
    color: string;
    delete: boolean;
    name: string;
    constructor(x: number, y: number, vMax: number, duration: number, color: string, name: string) {
        this.x = x;
        this.y = y;
        this.name = name;
        const angle = Math.random() * 2 * Math.PI;
        this.vx = Math.cos(angle) * vMax;
        this.vy = Math.sin(angle) * vMax;
        this.width = 15;
        this.duration = duration;
        this.color = color;
    }
    collect(player: Player) {
        this.delete = true;
        const mint = mints.get(this.name);
        if (mint) {
            //sendToken(mint, player.address, 1); // don't need to do this here
            player.powerUps.set(this.name, (player.powerUps.get(this.name) || 0) + 1);
        } else {
            this.powerUp(player);
        }
    }
    move() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x > 10000 || this.y > 10000 || this.x < 0 || this.y < 0) {
            this.delete = true;
        }
    }
    powerUp(player: Player) {
        this.delete = true;
        this.start(player);
        if (this.duration !== -1) {
            setTimeout(() => {
                this.end(player);
            }, this.duration * levelToPowerUpDuration(player.metadata.powerUpDurationLevel));
        }
    }
    start(player: Player) { }
    end(player: Player) { }
    asObject() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            color: this.color,
        };
    }
}
class BasicPowerUp extends PowerUp {
    constructor(x: number, y: number) {
        super(x, y, 2, -1, "yellow", "basic");
    }
    start(player: Player) {
        player.points += 500;
    }
}
class SpeedPowerUp extends PowerUp {
    constructor(x: number, y: number) {
        super(x, y, 2, 10000, "purple", "speed");
    }
    start(player: Player): void {
        player.vMax += 4;
    }
    end(player: Player): void {
        player.vMax -= 4;
    }
}
class HealthPowerUp extends PowerUp {
    constructor(x: number, y: number) {
        super(x, y, 3, -1, "green", "health");
    }
    start(player: Player) {
        player.health = player.health + 10 > 50 ? 50 : player.health + 10;
    }
}
class HeavyBulletPowerUp extends PowerUp {
    constructor(x: number, y: number) {
        //set duration in ms
        super(x, y, 5, 10000, "red", "heavybullet");
    }
    start(player: Player) {
        player.selectedBullet = "heavy";
    }
    end(player: Player) {
        player.selectedBullet = "basic";
    }
}
class FastBulletPowerUp extends PowerUp {
    constructor(x: number, y: number) {
        super(x, y, 5, 10000, "blue", "fastbullet");
    }
    start(player: Player) {
        player.selectedBullet = "fast";
    }
    end(player: Player) {
        player.selectedBullet = "basic";
    }
}
class MachineBulletPowerUp extends PowerUp {
    constructor(x: number, y: number) {
        super(x, y, 5, 10000, "orange", "machinebullet");
    }
    start(player: Player) {
        player.selectedBullet = "machine";
    }
    end(player: Player) {
        player.selectedBullet = "basic";
    }
}
