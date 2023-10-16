import { createServer } from 'http';
import express from 'express';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import GameController from './utils/GameController';
import Player, { Destroyer, Massive, MultiShot, QuintupleShot, RapidFire, RearGuard, SuperRearGuard, TriShot, TripleShot } from './utils/Player';
import setUpSpaceFight from './utils/SpaceFight';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { Metaplex, bundlrStorage, keypairIdentity } from '@metaplex-foundation/js';
import { NFTMetadata, createNFT, initializeCollection, retrieveNFT, updateNFT } from './solana/nft';
import { checkBalance, createToken, fullMint, mintToken, mints, sendToken } from './solana/coins';

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'UPDATE']
    }
});

const port = 3005;

export const connection = new Connection(clusterApiUrl("devnet"));
export const mypubkey = "9gMXPu1JdmREs4CkkY1KGtW42tRhxgGHSKcSxf9chuhT";
const privateKey = [
    191, 76, 115, 6, 172, 144, 226, 103, 102, 80, 207,
    249, 19, 215, 10, 26, 55, 119, 99, 131, 30, 43,
    152, 228, 131, 170, 111, 52, 150, 40, 21, 51, 128,
    242, 90, 132, 48, 12, 206, 3, 224, 9, 156, 153,
    112, 171, 208, 166, 62, 118, 43, 31, 47, 52, 157,
    19, 100, 117, 33, 89, 61, 178, 230, 234
];
export const admin = Keypair.fromSecretKey(new Uint8Array(privateKey));
export const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(admin))
    .use(bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
    }));
export const collectionMintAddress = "8y6DkvKcw9VEJ2vY4seAii3zhPiN3nSEP2WWrRc2w1LY";
let number = 0;
async function main() {
    //await connection.requestAirdrop(admin.publicKey, 1000000000);
    //const collection = await initializeCollection();
    // update and retrieve and create work, collection is initialized, admin is funded
    const games: Map<string, GameController> = new Map<string, GameController>();
    const vMax = 10;
    const generateRandomId = () => String(Math.floor(Math.random() * 1000000));
    const shortenAddress = (address: string) => `${address.substring(0, 4)}..${address.substring(address.length - 4)}`;
    const genPlayer = (socket: Socket, pubkey: string, metadata: NFTMetadata & { nft: string; }): Player => {
        let player: Player;
        switch (metadata.type) {
            case "tripleshot":
                player = new TripleShot(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            case "rearguard":
                player = new RearGuard(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            case "multishot":
                player = new MultiShot(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            case "destroyer":
                player = new Destroyer(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            case "massive":
                player = new Massive(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            case "rapidfire":
                player = new RapidFire(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            case "trishot":
                player = new TriShot(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            case "quintupleshot":
                player = new QuintupleShot(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            case "superrearguard":
                player = new SuperRearGuard(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
            default:
                player = new Player(30, vMax, pubkey,
                    (killer: string) => socket.emit("dead", killer),
                    (killee: string) => socket.emit("recieveMainMessage", `You killed *${shortenAddress(killee)}*`),
                    false,
                    metadata
                );
                break;
        }
        return player;
    };
    const findRoom = (socket: Socket, type: string, gamemode: string) => {
        //const player: Player = genPlayer(socket);
        for (const game of games) {
            if (game[1].PlayerController.length < 10 && game[1].type == type && game[1].gamemode == gamemode) {
                return game[0];
            }
        }
        const id = generateRandomId();
        let gameController: any;
        switch (type) {
            case "SpaceFight":
                gameController = new GameController(type, gamemode);
                break;
            default:
                break;
        }
        games.set(id, gameController);
        return id;
    };
    const gameLoop = setInterval(() => {
        for (const game of games) {
            game[1].frame();
            const gameObjects = game[1].asSerializeable();
            game[1].sockets.forEach((socket: Socket) => {
                const objects = game[1].getRelevantObjects(gameObjects, socket.data.pubkey);
                socket.emit("gameState", objects);
            });
            io.to(game[0]).emit("recieveLeaderboard", game[1].getLeaderboard());
            io.to(game[0]).emit("recieveMessages", game[1].getRecentMessages());
            io.to(game[0]).emit("recieveBounties", game[1].getBounties());
        }
    }, 1000 / 60);
    io.on("connection", async (socket) => {
        console.log("Connected to: ", socket.id);
        const type = "SpaceFight";
        let gameId: string = findRoom(socket, type, "basic");
        socket.join(gameId); // need to add this
        socket.emit("recieveKey", { pubkey: socket.data.pubkey });
        socket.on("respawn", async (data: { pubkey: string, powerUps: [string, number][]; nft: NFTMetadata & { nft: string; }; gamemode: string; }) => {
            //NEED TO SET player.game outside of constructor
            socket.leave(gameId);
            gameId = findRoom(socket, type, data.gamemode);
            socket.join(gameId);
            let metadata: NFTMetadata & { nft: string; } = data.nft;
            if (!data.nft) {
                let nft = await createNFT("", data.pubkey, {
                    name: `Spaceship #${number}`,
                    description: "A Spaceship",
                    image: "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-normal.png",
                    level: 0,
                    pointsMultiplierLevel: 0,
                    powerUpDurationLevel: 0,
                    trophyMultiplierLevel: 0,
                    kills: 0,
                    type: "basic",
                }, 1);
                metadata = nft;
                number++;
            }
            const player = genPlayer(socket, data.pubkey, metadata);
            player.powerUps = new Map(data.powerUps);
            const game = games.get(gameId)!;
            player.game = game;
            game.addPlayer(player, socket);
        });
        socket.on("disconnect", () => {
            const game = games.get(gameId)!;
            if (game) {
                game.remove(socket);
                if (game.connected.length == 0) {
                    console.log(`Deleted game ${gameId}`);
                    games.delete(gameId);
                }
            }
        });
        socket.on("usePowerUp", (data: { type: string, address: string; }) => {
            const game = games.get(gameId)!;
            const player = game.PlayerController.find((player) => player.address === data.address);
            if (player) {
                player.usePowerUp(data.type);
            }
        });
        socket.on("updateNFT", (data: { nft: string, newMetadata: NFTMetadata; }) => {
            console.log("recieved: ", data);
            updateNFT(data.nft, data.newMetadata).then(() => {
                socket.emit("updateNFT");
            }).catch(() => socket.emit("updateNFT"));
        });
        socket.on("createNFT", (data: { account: string, metadata: NFTMetadata; }) => {
            createNFT(data.metadata.image, data.account, data.metadata, 1).then((nft) => {
                socket.emit("createNFT", nft);
            }).catch(() => socket.emit("createNFT"));
        });
        socket.on("createBounty", (data: { address: string, target: string, amount: number; }) => {
            const game = games.get(gameId)!;
            game.createBounty(data.target, data.amount);
        });
        socket.on("move", (data: { pos: [number, number]; dimensions: [number, number], address: string; down: string[]; }) => {
            if (data.address) {
                const game = games.get(gameId)!;
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
        // switch (type) {
        //     case "SpaceFight":
        //         setUpSpaceFight(socket, gameId, games);
        //         break;
        //     default:
        //         break;
        // }
    });
}

main();

httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})

