import { createTransferInstruction, getAccount, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction, clusterApiUrl } from "@solana/web3.js";
import { SignerWalletAdapterProps } from "@solana/wallet-adapter-base";
import { Metaplex, bundlrStorage, keypairIdentity } from "@metaplex-foundation/js";
import { io } from "socket.io-client";

const connection = new Connection(clusterApiUrl("devnet"));
export const mints: Map<string, string> = new Map(
    [
        ['health', '2depViUgAp8m9FDezLAe3NvVVyYhoueAkem3sXLEzR7q'],
        ['heavybullet', 'B9wVtPhi3HRKtBJ2ZQwARCygBr8C7dMsS94HPWmwZ3K1'],
        ['fastbullet', '87R9Zg7YcGGYPw3gydAh4TwAK8AqP4HDmutxwMc9r2Wk'],
        ['machinebullet', 'Gazdv5xogWYhkxsPWik2n18pXQJr7MRs3ihysPYM8xRf'],
        ['speed', 'DdZssfqVhEsvW7YfZVXEe8iBS8FVEGuNMejz2zsNW3Uj'],
        ['cash', 'H9rfwegPfKs3rHTxvKzkrbnx6enVywFxZn994qFL2VSx'],
        ['trophy', 'FKfZgqWpe1ietirDeea1wa8s2oRLAUgLWmRq6esErKw3']
    ]
);
export const powerUps = new Map(
    [
        ['health', '2depViUgAp8m9FDezLAe3NvVVyYhoueAkem3sXLEzR7q'],
        ['heavybullet', 'B9wVtPhi3HRKtBJ2ZQwARCygBr8C7dMsS94HPWmwZ3K1'],
        ['fastbullet', '87R9Zg7YcGGYPw3gydAh4TwAK8AqP4HDmutxwMc9r2Wk'],
        ['machinebullet', 'Gazdv5xogWYhkxsPWik2n18pXQJr7MRs3ihysPYM8xRf'],
        ['speed', 'DdZssfqVhEsvW7YfZVXEe8iBS8FVEGuNMejz2zsNW3Uj'],
    ]
);
export const coins = new Map(
    [
        ['cash', 'H9rfwegPfKs3rHTxvKzkrbnx6enVywFxZn994qFL2VSx'],
        ['trophy', 'FKfZgqWpe1ietirDeea1wa8s2oRLAUgLWmRq6esErKw3']
    ]
);
const privateKey = [
    191, 76, 115, 6, 172, 144, 226, 103, 102, 80, 207,
    249, 19, 215, 10, 26, 55, 119, 99, 131, 30, 43,
    152, 228, 131, 170, 111, 52, 150, 40, 21, 51, 128,
    242, 90, 132, 48, 12, 206, 3, 224, 9, 156, 153,
    112, 171, 208, 166, 62, 118, 43, 31, 47, 52, 157,
    19, 100, 117, 33, 89, 61, 178, 230, 234
];
export const admin = Keypair.fromSecretKey(new Uint8Array(privateKey));
export async function getAllCoins(address: string): Promise<Map<string, number>> {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getParsedTokenAccountsByOwner(
        pubkey,
        {
            programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        }
    );
    const result: [string, number][] = accountInfo.value.map((account) => {
        const mint = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        for (const [key, value] of Array.from(coins)) {
            if (mint === value) {
                return [key, amount];
            }
        }
    }).filter((x) => x !== undefined) as [string, number][];
    return new Map(result);
}
export async function getAllPowerUps(address: string): Promise<Map<string, number>> {
    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getParsedTokenAccountsByOwner(
        pubkey,
        {
            programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        }
    );
    const result: [string, number][] = accountInfo.value.map((account) => {
        const mint = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        for (const [key, value] of Array.from(powerUps)) {
            if (mint === value) {
                return [key, amount];
            }
        }
    }).filter((x) => x !== undefined) as [string, number][];
    return new Map(result);
}
export async function sendToken(mint: string, address: string, amount: number) {
    const fromWallet = admin;
    const toWallet = new PublicKey(address);
    const mintKey = new PublicKey(mint);
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mintKey, fromWallet.publicKey);
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mintKey, toWallet);
    console.log(`Sending user ${amount * LAMPORTS_PER_SOL} tokens`);
    const signature = await transfer(
        connection,
        fromWallet,
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        amount * LAMPORTS_PER_SOL
    );
    console.log(`Signature: ${signature}`);
}
export async function swapTokens(tokenName: string, userAddress: string, amount: number, signTransaction: (...any: any[]) => any) {
    const tokenAddress = mints.get(tokenName)!;
    const recipient = Keypair.fromSecretKey(new Uint8Array(privateKey));
    const mintToken = new PublicKey(tokenAddress);
    const recipientAddress = recipient.publicKey;
    const publicKey = new PublicKey(userAddress);
    const transactionInstructions: TransactionInstruction[] = [];
    const associatedTokenFrom = await getAssociatedTokenAddress(
        mintToken,
        publicKey
    );
    const fromAccount = await getAccount(connection, associatedTokenFrom);
    const associatedTokenTo = await getAssociatedTokenAddress(mintToken, recipientAddress);
    transactionInstructions.push(
        createTransferInstruction(
            fromAccount.address, // source
            associatedTokenTo, // dest
            publicKey,
            amount * LAMPORTS_PER_SOL // transfer 1 USDC, USDC on solana devnet has 6 decimal
        )
    );
    const transaction = new Transaction().add(...transactionInstructions);
    const signature = await configureAndSendCurrentTransaction(
        transaction,
        connection,
        publicKey,
        signTransaction
    );
    console.log(`Signature: ${signature}`);
}

export const configureAndSendCurrentTransaction = async (
    transaction: Transaction,
    connection: Connection,
    feePayer: PublicKey,
    signTransaction: SignerWalletAdapterProps['signTransaction']
) => {
    const blockHash = await connection.getLatestBlockhash();
    transaction.feePayer = feePayer;
    transaction.recentBlockhash = blockHash.blockhash;
    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({
        blockhash: blockHash.blockhash,
        lastValidBlockHeight: blockHash.lastValidBlockHeight,
        signature
    });
    return signature;
};
const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(admin))
    .use(bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://devnet.solana.com",
        timeout: 60000,
    }));
export const collectionMintAddress = "8y6DkvKcw9VEJ2vY4seAii3zhPiN3nSEP2WWrRc2w1LY";
export type NFTMetadata = {
    name: string;
    description: string;
    image: string;
    level: number;
    kills: number;
    type: string;
    powerUpDurationLevel: number;
    pointsMultiplierLevel: number;
    trophyMultiplierLevel: number;
};
export async function findNFTs(address: string): Promise<NFTMetadata[]> {
    const pubkey = new PublicKey(address);
    let nfts = await metaplex.nfts().findAllByOwner({
        owner: pubkey,
    });
    nfts = nfts.filter((nft) => nft.collection?.address.toString() === collectionMintAddress);
    const finalNfts = [];
    for (const nft of nfts) {
        const json = await (await fetch(nft.uri)).json();
        finalNfts.push(
            json
        );
    }
    return finalNfts;
}
export async function findNFTsWithAddress(address: string): Promise<(NFTMetadata & { nft: string; })[]> {
    const pubkey = new PublicKey(address);
    let nfts = await metaplex.nfts().findAllByOwner({
        owner: pubkey,
    });
    nfts = nfts.filter((nft) => nft.collection?.address.toString() === collectionMintAddress);
    const finalNfts = [];
    for (const nft of nfts) {
        const json = await (await fetch(nft.uri)).json();
        finalNfts.push(
            {
                ...json,
                nft: nft.address.toString()
            }
        );
    }
    return finalNfts;

}
export async function updateNFT(nft: string, newMetadata: NFTMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(process.env.NEXT_PUBLIC_BACKEND_URL);
        const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
            // let newSocket = io('http://localhost:4000', {
            autoConnect: false,
        });
        socket.connect();
        console.log(socket);
        socket.on('connect', () => {
            console.log(`connected: ${socket.id}`);
            socket.emit("updateNFT", { nft, newMetadata });
        });
        socket.on("updateNFT", () => {
            socket.disconnect();
            resolve(undefined);
        });
    });
}
export async function swapSOL(userAddress: string, amount: number, signTransaction: (...any: any[]) => any) {
    try {
        const publicKey = new PublicKey(userAddress);
        console.log(amount * LAMPORTS_PER_SOL);
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: admin.publicKey,
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );
        const signature = await configureAndSendCurrentTransaction(
            transaction,
            connection,
            publicKey,
            signTransaction
        );
        console.log(`Signature: ${signature}`);
        return signature;
    } catch (e) {
        // window.location.reload()
        console.log(e);
        console.log(amount * LAMPORTS_PER_SOL);
    }
}


