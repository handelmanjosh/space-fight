


export default class Asteroid {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    angleDelta: number;
    dead: boolean;
    delete: boolean;
    width: number;
    imgSrc: string;
    constructor(x: number, y: number, vx: number, vy: number, angleDelta: number, width: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.angle = 0;
        this.vx = vx;
        this.vy = vy;
        this.imgSrc = `/asteroids/asteroid${[0, 1, 2, 3][Math.floor(Math.random() * 4)]}.png`;
        this.angleDelta = angleDelta;
    }
    end() {
        this.dead = true;
        this.animateExplode(0);
    }
    animateExplode(i: number) {
        this.imgSrc = `/explosions/explosion${i}.png`;
        if (i < 4) {
            setTimeout(() => {
                this.animateExplode(i + 1);
            }, 150);
        } else {
            this.delete = true;
        }
    }
    move() {
        if (this.dead) return;
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.angleDelta;
        if (this.x < -20 || this.y < -20 || this.y > 10020 || this.x > 10020) {
            this.delete = true;
        }
    }
    asObject() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            angle: this.angle,
            imgSrc: this.imgSrc,
        };
    }
}