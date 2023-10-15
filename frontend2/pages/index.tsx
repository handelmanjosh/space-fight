import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import BasicButton from "@/components/BasicButton";
import PowerUpSelector, { PowerUpButton } from "@/components/PowerUpSelector";
import { NFTMetadata, powerUps, swapSOL } from "@/components/utils";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
const WalletDisconnectButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletDisconnectButton,
  { ssr: false }
);
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);
let socket: Socket;
let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;
let mousePos: [number, number] | undefined;
let spectatingPlayer: any;
let pubkey: string;
let backgroundImage: HTMLImageElement;
let imageMap: Map<string, HTMLImageElement> = new Map<string, HTMLImageElement>();
const down: string[] = [];
const MAX_HEALTH = 15; // change max health here
const names = ["health", "heavybullet", "fastbullet", "speed", "machinebullet"];
const powerUpLongNames = ["Health", "Heavy Bullet", "Fast Bullet", "Speed", "Machine Bullet"];
const powerUpKeys = ["z", "x", "c", "v", "b"];

const gamemodes = ["casual", "normal", "competitive"];

export default function SpaceFightPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  //const [publicKey, setPublicKey] = useState<string>("");
  //const [connected, setIsConnected] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [killedBy, setKilledBy] = useState<string>("");
  const [mainMessages, setMainMessages] = useState<Map<number, string>>(new Map<number, string>());
  const [spectating, setSpectating] = useState<boolean>(false);
  const [spectatingAddress, setSpectatingAddress] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<{ address: string, points: number; }[]>([]);
  const [inTop5, setInTop5] = useState<boolean>(false);
  const [me, setMe] = useState<{ address: string, points: number; } | null>(null);
  const spectateSwitch = useRef<boolean>(false);
  const [loadedPowerUps, setLoadedPowerUps] = useState<[string, number][]>([]);
  const [myPowerUps, setMyPowerUps] = useState<Map<string, number>>(new Map<string, number>(names.map((name) => [name, 0])));
  const [gameMessages, setGameMessages] = useState<string[][]>([]);
  const [selectedNFT, setSelectedNFT] = useState<(NFTMetadata & { nft: string; }) | null>(null);
  const [canSpectate, setCanSpectate] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [selectedGamemode, setSelectedGamemode] = useState<number>(1);
  useEffect(() => {
    canvas = document.getElementById("gameField") as HTMLCanvasElement;
    context = canvas.getContext("2d") as CanvasRenderingContext2D;
    canvas.height = canvas.parentElement!.offsetHeight;
    canvas.width = canvas.parentElement!.offsetWidth;
    const sendStateInterval = setInterval(move, 20);
    backgroundImage = document.createElement("img");
    backgroundImage.src = "/space-fight/background.png";
    ["spaceship.png", "spaceship-red.png"].forEach((url: string) => {
      const adjUrl = `/space-fight/${url}`;
      imageMap.set(adjUrl, createImage(adjUrl));
    });
    [
      "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-normal.png",
      "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-green.png",
      "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-blue.png",
      "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-yellow.png",
    ].forEach((url: string) => {
      imageMap.set(url, createImage(url));
    });
    for (let i = 0, name = "/asteroids/asteroid"; i < 4; i++) {
      let temp = `${name}${i}.png`;
      imageMap.set(temp, createImage(temp));
    }
    for (let i = 0, name = "/explosions/explosion"; i < 5; i++) {
      let temp = `${name}${i}.png`;
      imageMap.set(temp, createImage(temp));
    }
    return () => {
      //@ts-ignore
      canvas = context = undefined;
      clearInterval(sendStateInterval);
    };
  }, []);
  const createImage = (src: string): HTMLImageElement => {
    const img = document.createElement("img");
    img.src = src;
    return img;
  };
  useEffect(() => {
    if (connected && publicKey) {
      if (socket) {
        socket.disconnect();
      }
      console.log(process.env.NEXT_PUBLIC_BACKEND_URL!);
      socket = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
        // let newSocket = io('http://localhost:4000', {
        auth: {
          token: publicKey
        },
        autoConnect: false,
      });

      document.addEventListener("mousemove", mousemove);
      document.addEventListener("touchmove", touchmove, { passive: false });
      document.addEventListener("keydown", keydown);
      document.addEventListener("keyup", keyup);
      document.addEventListener("mousedown", mousedown);
      document.addEventListener("mouseup", mouseup);
      socket.connect();
      // socket.on("recieveKey", (data) => {
      //   pubkey = data.pubkey;
      // });
      pubkey = publicKey.toString();
      socket.on('connect', () => {
        console.log(`connected: ${socket.id}`);

      });
      socket.on("gameState", draw);
      socket.on("dead", endgame);
      socket.on("roomsRecieve", () => null);
      socket.on("recieveLeaderboard", recieveLeaderboard);
      socket.on("recieveMessages", recieveMessages);
      socket.on("recieveMainMessage", recieveMainMessage);
      return () => {
        socket.disconnect();
        document.removeEventListener("mousemove", mousemove);
        document.removeEventListener("touchmove", touchmove);
        document.removeEventListener("keyup", keyup);
        document.removeEventListener("keydown", keydown);
        socket.off("gameState", draw);
        socket.off("dead", endgame);
        socket.off("roomsRecieve", () => null);
        socket.off("recieveLeaderboard", recieveLeaderboard);
        socket.off("recieveMessages", recieveMessages);
        socket.off("recieveMainMessage", recieveMainMessage);
      };
    }
  }, [publicKey, connected]);
  const recieveMessages = (messages: string[][]) => {
    if (messages) {
      setGameMessages(messages);
    }
  };
  const recieveMainMessage = (message: string) => {
    const key = Date.now();
    setMainMessages(prev => {
      const newMap = new Map<number, string>(prev);
      newMap.set(key, message);
      return newMap;
    });
    setTimeout(() => {
      setMainMessages(prev => {
        const newMap = new Map<number, string>(prev);
        newMap.delete(key);
        return newMap;
      });
    }, 1500);
  };
  const recieveLeaderboard = (leaderboard: { address: string, points: number; }[]) => {
    leaderboard = leaderboard.sort((a: { address: string, points: number; }, b: { address: string, points: number; }) => {
      return b.points - a.points;
    });
    const me = leaderboard.find((value) => value.address === pubkey)!;
    setMe(me);
    leaderboard = leaderboard.splice(0, leaderboard.length > 5 ? 5 : leaderboard.length);
    let includes = false;
    for (const item of leaderboard) {
      if (item.address == pubkey) {
        includes = true;
        break;
      }
    }
    if (includes) {
      setInTop5(true);
    } else {
      setInTop5(false);
    }
    setLeaderboard(leaderboard);
  };

  const play = async () => {
    if (!pubkey || !socket) {
      alert("Connect your wallet!");
    } else {
      setCanSpectate(true);
      setSpectating(false);
      const map = new Map<string, number>(loadedPowerUps);
      for (const powerUp of Array.from(powerUps)) {
        if (!map.has(powerUp[0])) {
          map.set(powerUp[0], 0);
        }
      }
      console.log(selectedNFT);
      if (selectedNFT === null) {
        setLoadingMessage("Minting your first NFT...");
        setTimeout(() => {
          setLoadingMessage("");
        }, 30000);
      };
      if (gamemodes[selectedGamemode] != "normal") {
        await swapSOL(publicKey!.toString(), 0.1, signTransaction!);
      }
      socket.emit("respawn", { pubkey, powerUps: Array.from(map), nft: selectedNFT, gamemode: gamemodes[selectedGamemode] });
      setIsPlaying(true);
    }
  };
  const mousedown = () => {
    if (!down.includes(" ")) {
      down.push(" ");
    }
  };
  const mouseup = () => {
    if (down.includes(" ")) {
      down.splice(down.indexOf(" "), 1);
    }
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key == " ") {
      if (!down.includes(" ")) {
        down.push(" ");
      }
    } else if (event.key == "g") {
      if (!down.includes("g")) {
        down.push("g");
      }
    }
  };
  const keyup = (event: KeyboardEvent) => {
    if (event.key == " ") {
      if (down.includes(" ")) {
        down.splice(down.indexOf(" "), 1);
      }
    } else if (event.key == "g") {
      if (down.includes("g")) {
        down.splice(down.indexOf("g"), 1);
      }
    } else if (powerUpKeys.includes(event.key)) {
      document.getElementById(event.key)?.click();
    }
  };
  const mousemove = (event: MouseEvent) => {
    mousePos = adjustToCanvas(event.clientX, event.clientY);
  };
  const touchmove = (event: TouchEvent) => {
    mousePos = adjustToCanvas(event.touches[0].clientX, event.touches[0].clientY);
  };
  const adjustToCanvas = (x: number, y: number): [number, number] | undefined => {
    const canvasRect = canvas.getBoundingClientRect();
    const [adjX, adjY] = [x - canvasRect.left - window.scrollX, y - canvasRect.top - window.scrollY];
    if (adjX > 0 && adjX < canvas.width && adjY > 0 && adjY < canvas.height) {
      return [x - canvasRect.left - window.scrollX, y - canvasRect.top - window.scrollY];
    }
  };
  const endgame = (killer: string) => {
    setKilledBy(killer === "Asteroid" ? killer : shortenAddress(killer));
    console.log(`Killed by ${killer}`);
    setTimeout(() => {
      setIsPlaying(false);
      setKilledBy("");
    }, 1500);
  };
  const sendPowerUp = (type: string) => {
    socket.emit("usePowerUp", { type, address: pubkey });
  };
  const move = () => {
    if (mousePos) {
      socket.emit("move", { pos: mousePos, address: pubkey, dimensions: [canvas.width, canvas.height], down });
    }
  };
  const draw = (data: any) => {
    if (spectatingPlayer && spectatingPlayer.dead) spectatingPlayer = undefined;
    let player = data.find((object: any) => object.address === pubkey);
    let found = false;
    if (!player) {
      setSpectating(true);
      if (spectatingPlayer && !spectateSwitch.current) {
        player = data.find((object: any) => object.address === spectatingPlayer.address);
        if (!player) {
          player = spectate(data);
        }
      } else {
        //console.log("new player found");
        player = spectate(data);
        spectateSwitch.current = false;
      }
    } else {
      found = true;
    }
    if (found) {
      setMyPowerUps(new Map<string, number>(player.powerUps));
    }
    if (player) {
      resetCanvas([player.x, player.y]);
      for (const object of data) {
        if (object.address && object.address === player.address) {
          drawPlayer(player.x, player.y, player.angle, player.width, player.width, player.imgSrc, player.grapplePressed, player.grapplePosition, player.health);
        } else {
          drawObject(object.angle, object.x - player.x, object.y - player.y, object.width, object.height ?? object.width, object.imgSrc, object.health, object.color);
        }
      }
    } else {

    }
  };
  const spectate = (data: any[]) => {
    const players = data.filter(item => item.address);
    const selected = players[Math.floor(players.length * Math.random())];
    if (selected) {
      spectatingPlayer = selected;
      setSpectatingAddress(selected.address ? shortenAddress(selected.address) : "Anonymous");
      return selected;
    }
  };
  const originToCanvasCoords = (x: number, y: number) => {
    //converts distances relative to origin to relative to top corner of canvas
    return [x + canvas.width / 2, y + canvas.height / 2];
  };
  const drawPlayer = (x: number, y: number, angle: number, width: number, height: number, imgSrc: string, grapplePressed: boolean, grapplePosition: [number, number], health: number) => {
    const img = imageMap.get(imgSrc);

    if (grapplePressed) {
      context.strokeStyle = "white";
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(canvas.width / 2, canvas.height / 2);
      let adjX = (canvas.width / 2) + grapplePosition[0] - x;
      let adjY = (canvas.height / 2) + grapplePosition[1] - y;
      context.lineTo(adjX, adjY);
      context.stroke();
      context.beginPath();
      context.arc(adjX, adjY, 5, 0, 2 * Math.PI);
      context.fillStyle = 'red';
      context.fill();
    }

    //translate and draw image
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(angle);
    context.drawImage(img!, -1 * width / 2, -1 * height / 2, width, height);
    context.restore();

    //draw circle
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2, width * 3, 0, 2 * Math.PI);
    context.lineWidth = 1;
    context.strokeStyle = "green";
    context.stroke();

    drawHealthbar(canvas.width / 2, canvas.height / 2 + 10, health);
  };
  const drawHealthbar = (x: number, y: number, health: number) => {
    const width = 50;
    const height = 5;
    context.strokeStyle = "white";
    context.beginPath();
    context.rect(x - width / 2, y, width, height);
    context.stroke();
    const percentage = health / MAX_HEALTH;
    context.fillStyle = percentage > .75 ? "green" : percentage > .25 ? "yellow" : "red";
    context.fillRect(x - width / 2, y, percentage * width, height);
  };
  const drawObject = (angle: number, relX: number, relY: number, width: number, height: number, imgSrc: string, health: number, color: string) => {
    context.save();
    [relX, relY] = originToCanvasCoords(relX, relY);
    context.translate(relX, relY);
    context.rotate(angle ?? 0);
    if (imgSrc) {
      const img = imageMap.get(imgSrc);
      if (!img) alert(`${imgSrc}, ${img}, ${height}`);
      context.drawImage(img!, -1 * width / 2, -1 * height / 2, width, height);
    } else if (color !== "") {
      context.beginPath();
      context.arc(-1 * width / 2, -1 * height / 2, width, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    } else {
      context.beginPath();
      context.arc(-1 * width / 2, -1 * height / 2, width, 0, Math.PI * 2);
      context.fillStyle = "red";
      context.fill();
    }
    context.restore();
    if (health) {
      drawHealthbar(relX, relY + 10, health);
    }
  };
  const resetCanvas = (center: [number, number]) => {
    let [x, y] = center;
    context.save();
    context.translate(-1 * x, -1 * y);
    //todo: make this more efficient using % and only drawing around player
    for (let x = 0; x < 15; x++) {
      for (let y = 0; y < 15; y++) {
        context.drawImage(backgroundImage, x * 1000, y * 1000, 1000, 1000);
      }
    }
    context.strokeStyle = "red";
    context.strokeRect(canvas.width / 2, canvas.height / 2, 10000, 10000);
    context.restore();
  };
  const spectateNewPlayer = () => {
    console.log("switched");
    spectateSwitch.current = true;
  };
  const onChangePowerUps = (m: Map<string, number>) => {
    setLoadedPowerUps(Array.from(m));
  };
  const onSelectNft = (n: NFTMetadata & { nft: string; }) => {
    setSelectedNFT(n);
  };
  return (
    <div className="flex flex-col justify-center items-center w-screen h-screen">
      <div className="relative w-full h-full flex" style={{ userSelect: "none" }}>
        <canvas id="gameField" />
        {leaderboard ?
          <div id="leaderboard" className="absolute top-0 right-0 m-4 w-[20%] h-auto bg-gray-800/60 rounded-lg p-4">
            {leaderboard.map((value: { address: string, points: number; }, i: number) => {
              return (
                <LeaderboardRow {...value} targetAddress={pubkey} key={i} />
              );
            })}
            {inTop5 ?
              <></>
              :
              me ?
                <>
                  <SmallGap />
                  <LeaderboardRow {...me} targetAddress={pubkey} />
                </>
                :
                <></>
            }
          </div>
          :
          <></>
        }

        {message !== "" ?
          <div id="message" className="absolute top-0 left-0 w-full h-full">
            <div className="w-[80%] md:w-[50%] h-auto text-center text-xl">
              {message}
            </div>
          </div> :
          <></>
        }
        {loadingMessage !== "" &&
          <div className="absolute top-0 left-0 w-full flex flex-row justify-center items-center text-gray-600 p-4 rounded-lg mt-2">
            <p className="text-lg text-center text-red-600">{loadingMessage}</p>
          </div>
        }
        {!isPlaying ?
          <>
            <div id="join-game-button" className="absolute w-full h-full flex items-center justify-center bg-gray-500/90">
              <div className="flex flex-col justify-center items-center gap-2 w-auto z-50">
                <button onClick={play} className="w-full h-auto px-8 py-4 rounded-lg bg-green-600 hover:brightness-90 active:brightness-75">
                  {"Play"}
                </button>
                <div className="flex flex-row justify-center items-center gap-2">
                  {gamemodes.map((mode: string, i: number) => (
                    <button
                      onClick={() => setSelectedGamemode(i)} className={`w-auto h-12 rounded-lg px-6 border-black ${selectedGamemode === i ? "bg-green-600 hover:brightness-90 active:brightness-75" : "bg-gray-600 hover:brightness-90 active:brightness-75"}`}
                      key={i}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
                {canSpectate &&
                  <button onClick={() => setIsPlaying(true)} className="w-full h-auto px-8 py-4 rounded-lg bg-blue-600 hover:brightness-90 active:brightness-75">
                    {"Spectate"}
                  </button>
                }
                <div className="text-red-600 bg-white rounded-md flex flex-col justify-center items-center p-2">
                  <p>Note: game is on devnet. Prices are lowered for exploration purposes</p>
                  <p>I also do not have enough SOL for minting on mainnet</p>
                </div>
                <PowerUpSelector onChangePowerUps={onChangePowerUps} onSelectNft={onSelectNft} />
              </div>
            </div>
            <div className="absolute top-0 left-0 w-full flex flex-row justify-between gap-2 m-2">
              <div className="flex flex-row justify-center items-center gap-2">
                <BasicButton text="Shop" onClick={() => window.location.href = "/shop"} />
                <BasicButton onClick={() => window.location.href = "/how-to-play"} text="How to Play" />
              </div>
              <div className="flex flex-row justify-center items-center gap-2">
                <WalletMultiButtonDynamic />
                <WalletDisconnectButtonDynamic />
              </div>
            </div>
          </>
          :
          <></>
        }
        {isPlaying && (killedBy !== "" || mainMessages.size > 0) ?
          <div className="absolute flex justify-center items-center w-full h-full">
            <div className="flex flex-col justify-center items-center gap-2 rounded-md bg-slate-700/75 p-4">
              {killedBy !== "" ? <p style={{ userSelect: "none" }}>{`You were killed by `}<span className="text-red-600 font-bold">{killedBy}</span></p> : <></>}
              {Array.from(mainMessages).map((value: [number, string], i: number) => {
                return (
                  <>
                    {processStringToHTML(value[1])}
                  </>
                );
              })}
            </div>
          </div>
          :
          <></>
        }
        {isPlaying && !spectating &&
          <div className="absolute bottom-0 gap-1 left-0 m-2 flex flex-row justify-center items-center">
            {Array.from(myPowerUps).map(
              ([key, value]: [string, number], i: number) => {
                return (
                  <PowerUpButton
                    key={i}
                    text={powerUpLongNames[i]}
                    number={value}
                    onClick={() => sendPowerUp(key)}
                    id={powerUpKeys[i]}
                  />
                );
              }
            )}
          </div>
        }
        {spectating ?
          <>
            <div id="toggle" className="absolute flex flex-col justify-center items-center bottom-0 right-0 m-2">
              {isPlaying ?
                <div className="flex flex-col justify-center items-center">
                  {gameMessages.map((message: string[], i: number) => (
                    <p key={i}>
                      <span className="text-green-600 font-bold">{`${message[0] === "Asteroid" ? `${message[0]}` : shortenAddress(message[0])}`}</span>
                      {` killed `}
                      <span className="text-red-600 font-bold">{`${shortenAddress(message[1])}`}</span>
                    </p>
                  ))}
                </div>
                :
                <></>
              }
              <div className="flex flex-row justify-center items-center gap-2">
                {isPlaying ?
                  <button onClick={() => setIsPlaying(false)} className="w-auto h-12 rounded-lg px-6 border-black bg-blue-600 hover:brightness-90 active:brightness-75">
                    {"Back to Menu"}
                  </button>
                  :
                  <></>
                }
                <button onClick={spectateNewPlayer} className="w-auto h-12 rounded-lg px-6 border-black bg-yellow-600 hover:brightness-90 active:brightness-75">
                  {"Next"}
                </button>
              </div>
            </div>
            <div className="absolute flex flex-row items-center justify-center w-full top-0 left-0 text-center m-2">
              <p>{`Spectating ${spectatingAddress}`}</p>
            </div>
          </>
          :
          <></>
        }
      </div>
    </div >
  );
}
const shortenAddress = (address: string) => {
  if (address) {
    return `${address.substring(0, 4)}..${address.substring(address.length - 4)}`;
  } else {
    return address;
  }
};
const processStringToHTML = (str: string) => {
  type Types = "green" | "null";
  const textType: [Types, string][] = [];
  let curr = "";
  let open = "";
  for (let i = 0; i < str.length; i++) {
    if (str[i] == "*") {
      if (open !== "") {
        open = "";
        textType.push(["green", curr]);
        curr = "";
      } else {
        textType.push(["null", curr]);
        curr = "";
        open = "*";
      }
    } else {
      curr += str[i];
    }
  }
  textType.push(["null", curr]);
  return (
    <p style={{ userSelect: "none" }}>
      {textType.map((value: [Types, string], i: number) => {
        if (value[0] == "null") {
          return (
            ` ${value[1]} `
          );
        } else {
          return (
            <span className="text-green-600 font-bold" key={i}>
              {value[1]}
            </span>
          );
        }
      })}
    </p>
  );
};
function LeaderboardRow({ address, points, targetAddress }: { address: string, points: number, targetAddress: string; }) {
  if (targetAddress === address) {
    return (
      <div className="flex flex-row justify-between items-center w-full h-auto">
        <p className="text-yellow-600 font-bold">{shortenAddress(address)}</p>
        <p>{points}</p>
      </div>
    );
  } else {
    return (
      <div className="flex flex-row justify-between items-center w-full h-auto">
        <p>{shortenAddress(address)}</p>
        <p>{points}</p>
      </div>
    );
  }
}

const SmallGap = () => (<div className="h-2"></div>);;
