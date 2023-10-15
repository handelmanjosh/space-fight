import { distance } from "./utils";


type Locateable = {
    x: number;
    y: number;
    width: number;
};
export default function SpawnAway(objects: Locateable[], range: [number, number]) {
    let spawnPos: [number, number] = genSpawn(range);
    let iterations = 0;
    while (true) {
        if (iterations > 50) {
            console.error("Something absolutely terrible happened");
            console.error("This should never occur.");
            console.error("This means that we tried to find a spawn point 50 times and could not");
            break;
        }
        let oops = false;
        objects.forEach((object: Locateable) => {
            const dist = distance([object.x, object.y], spawnPos);
            if (dist < object.width) {
                oops = true;
            }
        });
        if (!oops) {
            break;
        }
        spawnPos = genSpawn(range);
        iterations++;
    }
    return spawnPos;
}
const genSpawn = (range: [number, number]): [number, number] => {
    return [Math.floor(Math.random() * range[0]), Math.floor(Math.random() * range[1])];

};
