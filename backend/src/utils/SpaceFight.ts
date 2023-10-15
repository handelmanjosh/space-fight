import { Socket } from "socket.io";


export default function setUpSpaceFight(socket: Socket, gameId: string, games: Map<string, any>) {
    socket.on("move", (data: { pos: [number, number]; dimensions: [number, number], address: string; down: string[]; }) => {
        if (data.address) {
            const game = games.get(gameId);
            const player = game.PlayerController.find(player => player.address == data.address);
            if (player) {
                const [x, y] = data.pos;
                const [width, height] = data.dimensions;
                player.updateVelocity(x, y, width, height);
                if (data.down.includes(' ')) {
                    if (player.canShoot) {
                        player.shoot();
                    }
                }
                if (data.down.includes("g")) {
                    player.grapplePressed = true;
                } else {
                    player.grapplePressed = false;
                }

            }
        }
    });
}