

type Locateable = {
    x: number;
    y: number;
    width: number;
};
export const distance = (a: [number, number], b: [number, number]) => {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
};
export function tooClose(a: Locateable, b: Locateable): boolean {
    const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    if (dist > a.width && dist > b.width) {
        return true;
    } else {
        return false;
    }
}
export const distance2 = (a: { x: number, y: number; }, b: { x: number, y: number; }) => {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};

export function CheckRadialCollisionCenter(collider: Locateable, collidee: Locateable, onCollision: () => any) {
    let d = distance([collider.x, collider.y], [collidee.x, collidee.y]);
    let colliderR = collider.width / 2;
    let collideeR = collidee.width / 2;
    if (d < colliderR || d < collideeR) {
        onCollision();
    }
}
export function CheckRadialCollisionTopLeft(collider: Locateable, collidee: Locateable, onCollision: () => any) {
    let [colliderX, colliderY] = [collider.x + collider.width / 2, collider.y + collider.width / 2];
    let [collideeX, collideeY] = [collidee.x + collidee.width / 2, collidee.y + collidee.width / 2];
    let d = distance([colliderX, colliderY], [collideeX, collideeY]);
    let colliderR = collider.width / 2;
    let collideeR = collidee.width / 2;
    if (d < colliderR || d < collideeR) {
        onCollision();
    }
}