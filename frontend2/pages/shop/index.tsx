import BasicButton from '@/components/BasicButton';
import { NFTButton } from '@/components/PowerUpSelector';
import { NFTMetadata, findNFTsWithAddress, getAllCoins, mints, sendToken, swapTokens, updateNFT } from '@/components/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';


const WalletDisconnectButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletDisconnectButton,
    { ssr: false }
);
const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);
const levelToPointsMultiplier = (level: number) => 1 + level * 0.1;
const levelToPowerUpDuration = (level: number) => 1 + level * 0.05;
const levelToTrophyMultiplier = (level: number) => 1 + level * 0.02;
const killsToNextLevel = (level: number) => level + 1; // made easy to level up for demo

const powerUpNames = ["health", "heavybullet", "fastbullet", "speed", "machinebullet"];
const powerUpLongNames = ["Health", "Heavy Bullet", "Fast Bullet", "Speed", "Machine Bullet"];
const powerUpPrices = [1000, 2000, 3000, 4000, 5000];
/*
      "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-normal.png",
      "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-green.png",
      "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-blue.png",
      "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-yellow.png",
 */
export default function Shop() {
    const { publicKey, signTransaction } = useWallet();
    const [cash, setCash] = useState<number>(0);
    const [trophy, setTrophy] = useState<number>(0);
    const [nfts, setNfts] = useState<(NFTMetadata & { nft: string; })[]>([]);
    const [selectedNFT, setSelectedNFT] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    useEffect(() => {
        if (publicKey) {
            getAllCoins(publicKey.toString()).then((coins: any) => {
                setCash(Math.floor(coins.get("cash") || 0));
                setTrophy(Math.floor(coins.get("trophy") || 0));
            });
        }
    }, [publicKey, isLoading]);
    useEffect(() => {
        if (publicKey) {
            findNFTsWithAddress(publicKey.toString()).then((nfts: any) => {
                console.log(nfts);
                setNfts(nfts);
            });
        }
    }, [publicKey, isLoading]);
    const upgrade = async (key: string, nft: string, value: any, cost: number) => {
        if (cost > 0) {
            await swapTokens("trophy", publicKey!.toString(), cost, signTransaction!);
        }
        const metadata = nfts[selectedNFT];

        // @ts-ignore
        metadata[key] = value;
        metadata.image = metadata.level < 2 ? "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-normal.png" :
            metadata.level < 5 ? "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-green.png" :
                metadata.level < 10 ? "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-blue.png" :
                    "https://ai-crypto-app-6969696969.s3.amazonaws.com/spaceship-yellow.png";
        setIsLoading(true);
        updateNFT(nft, metadata).then(() => {
            setIsLoading(false);
        });
    };
    const buy = async (name: string, cost: number) => {
        setIsLoading(true);
        await swapTokens("cash", publicKey!.toString(), cost, signTransaction!);
        await sendToken(mints.get(name)!, publicKey!.toString(), 1);
        setIsLoading(false);
    };
    return (
        <div className="flex flex-col justify-start items-center w-screen h-screen bg-slate-800 p-4 gap-10">
            <div className="flex flex-row justify-between items-center w-full">
                <div className="flex flex-row justify-center items-center gap-2">
                    <p className="text-2xl">Shop</p>
                    <BasicButton onClick={() => window.location.href = "/"} text="Play" />
                    <BasicButton onClick={() => window.location.href = "/how-to-play"} text="How to Play" />
                </div>
                <div className="flex flex-row justify-center items-center gap-2">
                    <WalletMultiButtonDynamic />
                    <WalletDisconnectButtonDynamic />
                </div>
            </div>
            {isLoading ?
                <p>Upgrading...</p>
                :
                <>
                    <div className="flex flex-col justify-center items-center w-full gap-2">
                        <p>Your Balance</p>
                        <div className="flex flex-row justify-center items-center gap-2">
                            <p>Cash: {cash}</p>
                            <p>Trophy: {trophy}</p>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center items-center w-full gap-2">
                        <p>{`Power Ups: (Cost cash)`}</p>
                        <div className="flex flex-row justify-center items-center gap-2">
                            {powerUpNames.map((name: string, i: number) => (
                                <BulletBuyModal name={powerUpLongNames[i]} price={powerUpPrices[i]} onClick={() => buy(name, powerUpPrices[i])} key={i} />
                            ))}
                        </div>
                        <div className="flex flex-col justify-center items-center w-full gap-2">
                            {nfts.length === 0 ?
                                <p>No NFTs</p>
                                :
                                <>
                                    <p>Select Your NFT</p>
                                    <div className='flex flex-row justify-center items-center gap-2'>
                                        {nfts.map((nft: NFTMetadata, i: number) => (
                                            <NFTButton
                                                index={i}
                                                isSelected={selectedNFT === i}
                                                onClick={() => setSelectedNFT(i)}
                                                {...nft}
                                                key={i}
                                            />
                                        ))}
                                    </div>
                                    <p>{`Upgrades (cost Trophy)`}</p>
                                    {nfts[selectedNFT] &&
                                        <div className="grid grid-cols-2 justify-center items-center gap-2 w-auto">
                                            <UpgradeableAttribute
                                                name="Points Multiplier"
                                                level={nfts[selectedNFT].pointsMultiplierLevel}
                                                upgradeCost={(level: number) => 10 + level * 10}
                                                upgrade={(cost: number) => upgrade("pointsMultiplierLevel", nfts[selectedNFT].nft, nfts[selectedNFT].pointsMultiplierLevel + 1, cost)}
                                                currentStat={levelToPointsMultiplier}
                                                tag="%"
                                            />
                                            <UpgradeableAttribute
                                                name="Power Up Duration"
                                                level={nfts[selectedNFT].powerUpDurationLevel}
                                                upgradeCost={(level: number) => 10 + level * 10}
                                                upgrade={(cost: number) => upgrade("powerUpDurationLevel", nfts[selectedNFT].nft, nfts[selectedNFT].powerUpDurationLevel + 1, cost)}
                                                currentStat={levelToPowerUpDuration}
                                                tag="%"
                                            />
                                            <UpgradeableAttribute
                                                name="Trophy Multiplier"
                                                level={nfts[selectedNFT].trophyMultiplierLevel}
                                                upgradeCost={(level: number) => 10 + level * 10}
                                                upgrade={(cost: number) => upgrade("trophyMultiplierLevel", nfts[selectedNFT].nft, nfts[selectedNFT].trophyMultiplierLevel + 1, cost)}
                                                currentStat={levelToTrophyMultiplier}
                                                tag="%"
                                            />
                                            <BarAttribute
                                                name="Kills to next level"
                                                level={nfts[selectedNFT].level}
                                                current={nfts[selectedNFT].kills}
                                                getStat={killsToNextLevel}
                                                onClick={() => upgrade("level", nfts[selectedNFT].nft, nfts[selectedNFT].level + 1, 0)}
                                            />
                                        </div>
                                    }
                                    <p>{`Class Upgrades (cost Trophy)`}</p>
                                    {(nfts[selectedNFT] && nfts[selectedNFT].level >= 3 && nfts[selectedNFT].type === "basic") ?
                                        <div className="flex flex-row justify-center items-center gap-2 w-auto">
                                            <SelectAttribute
                                                name="TripleShot"
                                                cost={1000}
                                                description="Your bullets will fire in three directions"
                                                onClick={() => upgrade("type", nfts[selectedNFT].nft, "tripleshot", 1000)}
                                            />
                                            <SelectAttribute
                                                name="RearGuard"
                                                cost={1000}
                                                description="Your bullets will fire forward and backward"
                                                onClick={() => upgrade("type", nfts[selectedNFT].nft, "rearguard", 1000)}
                                            />
                                            <SelectAttribute
                                                name="MultiShot"
                                                cost={1000}
                                                description="Double the fire rate, double the destruction"
                                                onClick={() => upgrade("type", nfts[selectedNFT].nft, "multishot", 1000)}
                                            />
                                        </div>
                                        :
                                        (nfts[selectedNFT] && nfts[selectedNFT].level >= 7 && nfts[selectedNFT].type !== "basic") ?
                                            <div className="flex flex-row justify-center items-center gap-2 w-auto">
                                                <SelectAttribute
                                                    name="QuintupleShot"
                                                    cost={1000}
                                                    description="Your bullets will fire in three directions"
                                                    onClick={() => upgrade("type", nfts[selectedNFT].nft, "quintupleshot", 1000)}
                                                />
                                                <SelectAttribute
                                                    name="TriShot"
                                                    cost={1000}
                                                    description="Your bullets will fire forward and backward"
                                                    onClick={() => upgrade("type", nfts[selectedNFT].nft, "trishot", 1000)}
                                                />
                                                <SelectAttribute
                                                    name="RapidFire"
                                                    cost={1000}
                                                    description="Bullet mayhem..."
                                                    onClick={() => upgrade("type", nfts[selectedNFT].nft, "rapidfire", 1000)}
                                                />
                                                <SelectAttribute
                                                    name="Massive"
                                                    cost={1000}
                                                    description="Bigger is better..."
                                                    onClick={() => upgrade("type", nfts[selectedNFT].nft, "massive", 1000)}
                                                />
                                                <SelectAttribute
                                                    name="SuperRearGuard"
                                                    cost={1000}
                                                    description="Protect the Nest!"
                                                    onClick={() => upgrade("type", nfts[selectedNFT].nft, "superreadguard", 1000)}
                                                />
                                            </div>
                                            :
                                            <p>Level up to unlock more upgrades!</p>
                                    }
                                </>
                            }
                        </div>
                    </div>
                </>
            }
        </div>
    );
};
type SelectAttributeProps = {
    name: string;
    cost: number;
    description: string;
    onClick: () => any;
};
function SelectAttribute({ name, cost, description, onClick }: SelectAttributeProps) {
    return (
        <div className="flex flex-col justify-center items-center bg-green-600 p-2 rounded-md">
            <p>{name}</p>
            <p>{`Cost: ${cost}`}</p>
            <p>{description}</p>
            <BasicButton
                onClick={onClick}
                text="Choose (decision is final)"
            />
        </div>
    );
}
type BulletBuyModalProps = {
    name: string;
    price: number;
    onClick: () => any;
};
function BulletBuyModal({ name, price, onClick }: BulletBuyModalProps) {
    return (
        <div className="flex flex-col justify-center items-center gap-2 bg-green-600 p-2 rounded-lg">
            <p>{name}</p>
            <p>Price: {price}</p>
            <BasicButton
                onClick={onClick}
                text="Buy"
            />
        </div>
    );
}
type BarAttributeProps = {
    name: string;
    level: number;
    current: number;
    getStat: (level: number) => number;
    onClick: () => any;
};
function BarAttribute({ name, level, current, getStat, onClick }: BarAttributeProps) {
    return (
        <div className={`flex flex-col justify-center items-center gap-2 ${current >= getStat(level) ? "bg-green-600" : "bg-red-600"} rounded-lg p-2 w-full`}>
            <p>{name}</p>
            <div className="flex flex-row justify-center items-center gap-2">
                <p>Current Value: {current}</p>
                <p>Required for level up: {getStat(level)}</p>
            </div>

            {current >= getStat(level) &&
                <>
                    <p>{`Level: ${level} -> ${level + 1}`}</p>
                    <BasicButton
                        onClick={onClick}
                        text="Level Up"
                    />
                </>
            }
        </div>
    );
}
type UpgradeableAttributeProps = {
    name: string;
    level: number;
    upgradeCost: (level: number) => number;
    upgrade: (cost: number) => void;
    currentStat: (level: number) => number;
    tag?: string;
};
function UpgradeableAttribute({ name, level, upgradeCost, upgrade, currentStat, tag }: UpgradeableAttributeProps) {
    return (
        <div className="flex flex-row justify-center items-center gap-2 bg-yellow-600 p-2 rounded-lg w-full">
            <div className="flex flex-col justify-center items-center gap-1">
                <p>{name}</p>
                <p>{`Level: ${level}`}</p>
                <p>{`Upgrade cost: ${upgradeCost(level)}`}</p>
            </div>
            <p>{`${currentStat(level)}${tag ?? ""} -> ${currentStat(level + 1)}${tag ?? ""}`}</p>
            <BasicButton
                onClick={() => upgrade(upgradeCost(level))}
                text="Upgrade"
            />
        </div>
    );
}