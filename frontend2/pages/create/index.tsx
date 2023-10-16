

import { useState, useRef, useEffect } from 'react';
import AWS from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { createNFT, swapSOL } from '@/components/utils';
import BasicButton from '@/components/BasicButton';
let img: HTMLImageElement;

const WalletDisconnectButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletDisconnectButton,
    { ssr: false }
);
const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);
export default function Create() {
    const [drawing, setDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { publicKey, signTransaction } = useWallet();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    useEffect(() => {
        if (!isLoading) {
            const canvas = canvasRef.current!;
            const context = canvas.getContext('2d')!;
            img = document.createElement("img");
            img.src = '/space-fight/spaceship.png'; // Replace with your image URL
            img.onload = () => {
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }
    }, [isLoading]);

    const handleMouseDown = () => {
        setDrawing(true);
    };

    const handleMouseUp = () => {
        setDrawing(false);
    };

    const handleMouseMove = (e: any) => {
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        if (drawing) {
            context.strokeStyle = color;
            context.lineWidth = 5;
            context.lineJoin = 'round';
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
            context.lineTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
            context.stroke();
        }
    };
    const handleUpload = async () => {
        if (!publicKey || !signTransaction) return;
        setIsLoading(true);
        const canvas = canvasRef.current!;
        const s3 = new AWS.S3({
            accessKeyId: "AKIAZB55MEJTS36KNS2U",
            secretAccessKey: "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",
            region: "us-east-1"
        });
        console.log(s3);
        const dataUrl = canvas.toDataURL('image/png');

        const base64Data = Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const Key = `${Date.now()}.png`;
        console.log(Key);
        const params: PutObjectRequest = {
            Bucket: 'ai-crypto-app-6969696969',
            Key,
            Body: base64Data,
            ContentType: 'image/png',
            ContentEncoding: 'base64'
        };
        s3.putObject(params, function (err, data) {
            if (err) {
                console.error("Error uploading to S3", err);
            } else {
                console.log("Successfully uploaded to S3", data);
                const imageUrl = `https://ai-crypto-app-6969696969.s3.amazonaws.com/${Key}`;
                console.log(imageUrl);
                swapSOL(publicKey.toString(), 0.1, signTransaction).then(() => {
                    createNFT(publicKey.toString(), {
                        name: `Spaceship #${Math.floor(Math.random() * 1000000)}`,
                        description: 'A spaceship',
                        image: imageUrl,
                        level: 0,
                        pointsMultiplierLevel: 0,
                        powerUpDurationLevel: 0,
                        trophyMultiplierLevel: 0,
                        kills: 0,
                        type: "basic",
                    }).then(() => {
                        setIsLoading(false);
                    });
                }).catch((err) => {
                    console.log(err);
                    setIsLoading(false);
                });
            };
        });
    };
    return (
        <div className="flex flex-col items-center justify-start gap-10 p-2">
            <div className="flex flex-row justify-between items-center gap-2 w-full">
                <div className="flex flex-row justify-start items-center gap-2">
                    <BasicButton onClick={() => window.location.href = "/"} text="Play" />
                    <BasicButton onClick={() => window.location.href = "/shop"} text="Shop" />
                </div>
                <div className="flex flex-row justify-center items-center gap-2">
                    <WalletMultiButtonDynamic />
                    <WalletDisconnectButtonDynamic />
                </div>
            </div>
            {isLoading ?
                <p className="text-black">Uploading...</p>
                :
                <>
                    <canvas
                        ref={canvasRef}
                        width="500"
                        height="500"
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        className="border"
                    ></canvas>
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="mt-4"
                    />
                    <BasicButton onClick={handleUpload} text="Create NFT (0.1 SOL)" />
                </>
            }
        </div>
    );
};