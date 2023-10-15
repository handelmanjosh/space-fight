import { useEffect, useState } from "react";
import BasicButton from "./BasicButton";
import { type NFTMetadata, findNFTs, getAllPowerUps, powerUps, sendToken, swapTokens, findNFTsWithAddress } from "./utils";
import { useWallet } from "@solana/wallet-adapter-react";

type PowerUpSelectorProps = {
    onChangePowerUps: (m: Map<string, number>) => any;
    onSelectNft: (nft: NFTMetadata & { nft: string; }) => any;
};
const names = ["health", "heavybullet", "fastbullet", "speed", "machinebullet"];
const powerUpLongNames = ["Health", "Heavy Bullet", "Fast Bullet", "Speed", "Machine Bullet"];
export default function PowerUpSelector({ onChangePowerUps, onSelectNft }: PowerUpSelectorProps) {
    const { publicKey, signTransaction } = useWallet();
    const [active, setActive] = useState<boolean>(false);
    const [userPowerUps, setUserPowerUps] = useState<Map<string, number>>(new Map<string, number>());
    const [selectedPowerUps, setSelectedPowerUps] = useState<Map<string, number>>(new Map<string, number>(names.map((name) => [name, 0])));
    const [nfts, setNfts] = useState<(NFTMetadata & { nft: string; })[]>([]);
    const [warning, setWarning] = useState<string>("");
    const [selectedNFT, setSelectedNFT] = useState<number>(0);
    useEffect(() => {
        if (publicKey) {
            getAllPowerUps(publicKey.toString()).then((powerUps: any) => {
                for (const name of names) {
                    if (!powerUps.has(name)) {
                        powerUps.set(name, 0);
                    }
                }
                setUserPowerUps(powerUps);
            });
        }
    }, [publicKey]);
    useEffect(() => {
        if (publicKey) {
            findNFTsWithAddress(publicKey.toString()).then((nfts: any) => {
                setNfts(nfts);
            });
        }
    }, [publicKey]);
    const selectNFT = (index: number) => {
        setSelectedNFT(index);
    };
    useEffect(() => {
        if (selectedNFT < nfts.length) {
            onSelectNft(nfts[selectedNFT]);
        }
    }, [selectedNFT, nfts]);
    if (!active) {
        return (
            <BasicButton onClick={() => setActive(true)} text="Select Power Ups" />
        );
    } else {
        return (
            <div className="flex flex-col justify-center items-center gap-2">
                <p>Wallet Power Ups</p>
                <div className="flex flex-row justify-center items-center gap-1">
                    {Array.from(userPowerUps).map(([key, value]: [string, number], i: number) => (
                        <PowerUpButton
                            onClick={async () => {
                                const newUserPowerUps = new Map<string, number>(userPowerUps);
                                try {
                                    swapTokens(key, publicKey!.toString(), 1, signTransaction!);
                                    newUserPowerUps.set(key, value - 1);
                                    setSelectedPowerUps(newUserPowerUps);
                                    const newSelectedPowerUps = new Map<string, number>(selectedPowerUps);
                                    newSelectedPowerUps.set(key, (newSelectedPowerUps.get(key) ?? 0) + 1);
                                    setSelectedPowerUps(newSelectedPowerUps);
                                    setUserPowerUps(newUserPowerUps);
                                    onChangePowerUps(newSelectedPowerUps);
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            text={powerUpLongNames[names.indexOf(key)]}
                            number={value}
                            key={i}
                        />
                    ))}
                </div>
                <p>Game Power Ups</p>
                <div className="flex flex-row gap-1 justify-center items-center">
                    {Array.from(selectedPowerUps).map(([key, value]: [string, number], i: number) => (
                        <PowerUpButton
                            onClick={async () => {
                                const newSelectedPowerUps = new Map<string, number>(selectedPowerUps);
                                newSelectedPowerUps.set(key, value - 1);
                                console.log(key, publicKey!.toString());
                                for (const [name, value] of Array.from(powerUps)) {
                                    if (name === key) {

                                        sendToken(value, publicKey!.toString(), 1);
                                        setSelectedPowerUps(newSelectedPowerUps);
                                        onChangePowerUps(newSelectedPowerUps);
                                        const newUserPowerUps = new Map<string, number>(userPowerUps);
                                        newUserPowerUps.set(key, (newUserPowerUps.get(key) ?? 0) + 1);
                                        setUserPowerUps(newUserPowerUps);
                                        setWarning("Power up might take a few seconds to show up in wallet!");
                                        setInterval(() => {
                                            setWarning("");
                                        }, 5000);
                                    }
                                }
                            }}
                            text={powerUpLongNames[names.indexOf(key)]}
                            number={value}
                            key={i}
                        />
                    ))}
                </div>
                {warning && <p className="text-red-600">{warning}</p>}
                <p>Your NFTs</p>
                <div className="flex flex-row gap-1 justify-center items-center">
                    {nfts.map((nft: NFTMetadata, i: number) => (
                        <NFTButton {...nft} onClick={selectNFT} index={i} key={i} isSelected={i === selectedNFT} />
                    ))}
                </div>
                <BasicButton onClick={() => setActive(false)} text="Done" />
            </div>
        );
    }
}
type PowerUpButtonProps = {
    onClick: () => any;
    text: string;
    number: number;
    id?: string;
};

export function PowerUpButton({ onClick, text, number, id }: PowerUpButtonProps) {
    const bgColor = number === 0 ? "bg-gray-600" : "bg-green-600";

    return (
        <button
            className={`p-4 w-28 h-28 rounded-md aspect-w-1 aspect-h-1 flex flex-col hover:brightness-90 active:brightness-75 justify-center items-center ${bgColor}`}
            disabled={number === 0}
            onClick={onClick}
            id={id}
        >
            <p className="text-white text-md">{text}</p>
            <p className="text-white text-md">{number}</p>
            {id && <p className="text-white text-md">{`Press: ${id}`}</p>}
        </button>
    );
}

export function NFTButton({
    name,
    description,
    image,
    level,
    onClick,
    index,
    isSelected
}: NFTMetadata & { onClick: (index: number) => any; index: number; isSelected: boolean; }) {

    const borderColor = isSelected ? "border-green-400" : "border-transparent";

    return (
        <button
            className={`relative p-4 w-28 h-28 rounded-md aspect-w-1 aspect-h-1 flex flex-col justify-between items-center hover:brightness-90 active:brightness-75 border-2 ${borderColor}`}
            onClick={() => onClick(index)}
        >
            {/* Image with overlay */}
            <div className="absolute inset-0 overflow-hidden rounded-md">
                <img src={image} alt={name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>
            {/* Text contents */}
            <div className="absolute top-0 left-0 flex flex-col justify-center items-center gap-1 w-full h-full">
                <p className="text-white text-lg z-10">{name}</p>
                <p className="text-white text-sm z-10">{`Level: ${level}`}</p>
            </div>
        </button>
    );
}