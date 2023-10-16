import Player from "./Player";

export type AvailableBullet = "basic" | "heavy" | "fast" | "machine";
export const genBullet = (type: AvailableBullet, x: number, y: number, angle: number, creator: Player): Bullet => {
    if (type == "basic") {
        return new BasicBullet(x, y, angle, creator);
    } else if (type == "heavy") {
        return new HeavyBullet(x, y, angle, creator);
    } else if (type == "fast") {
        return new FastBullet(x, y, angle, creator);
    } else {
        return new MachineBullet(x, y, angle, creator);
    }
};
export class Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number; //collision detection is screwed because this represents a radius before we use the image
    delete: boolean;
    damage: number;
    cooldown: number;
    creator: Player;
    color: string;
    constructor(x: number, y: number, angle: number, width: number, vMax: number, damage: number, cooldown: number, creator: Player, color: string) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle - Math.PI / 2) * vMax;
        this.vy = Math.sin(angle - Math.PI / 2) * vMax;
        this.width = width;
        this.damage = damage;
        this.cooldown = cooldown;
        this.creator = creator;
        this.color = color;
    }
    move() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.y < 0 || this.x > 10000, this.y > 10000 || bulletToPlayer(this, this.creator) > 1000) {
            this.delete = true;
        }
    }
    asObject() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            color: this.color,
        };
    }
}

const bulletToPlayer = (bullet: Bullet, player: Player) => {
    return Math.sqrt((bullet.x - player.x) ** 2 + (bullet.y - player.y) ** 2);
};


export class BasicBullet extends Bullet {
    constructor(x: number, y: number, angle: number, creator: Player) {
        super(x, y, angle, 2, 20, 1, 150, creator, "red");
    }
}
export class HeavyBullet extends Bullet {
    constructor(x: number, y: number, angle: number, creator: Player) {
        super(x, y, angle, 4, 30, 5, 250, creator, "red");
    }
}

export class FastBullet extends Bullet {
    constructor(x: number, y: number, angle: number, creator: Player) {
        super(x, y, angle, 4, 40, 10, 300, creator, "blue");
    }
}
export class MachineBullet extends Bullet {
    constructor(x: number, y: number, angle: number, creator: Player) {
        super(x, y, angle, 2, 10, 1, 50, creator, "orange");
    }
}

export class Rocket extends Bullet {

}