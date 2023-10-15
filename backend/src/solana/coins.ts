import { Account, createAccount, createMint, getAccount, getMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from "@solana/spl-token";
import { admin, connection } from "../server";
import { PublicKey } from "@metaplex-foundation/js";
import { Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";


// here have functionality to get player power up and bullet balance

export const LAMPORTS_PER_SOL = 1000000000;
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
export async function fullMint(): Promise<string> {
    const { tokenAccount, mint, wallet } = await createToken();
    console.log("created");
    await mintToken(wallet, mint, tokenAccount);
    console.log("minted");
    console.log("Balance: ", await checkBalance(mint.toBase58()));
    // console.log(
    //     `TOKEN DATA: token address: ${mint}, 
    // token account: ${tokenAccount.address} 
    // wallet: ${wallet} 
    // public key: ${wallet.publicKey} 
    // secret key: ${wallet.secretKey}
    // associated token account : ${(await getOrCreateAssociatedTokenAccount(connection, wallet, mint, wallet.publicKey)).address.toBase58()}
    // `
    // );
    return mint.toString();
}
export async function createToken() {
    //const fromAirdropSignature = await connection.requestAirdrop(fromWallet.publicKey, LAMPORTS_PER_SOL);
    //await connection.confirmTransaction(fromAirdropSignature);
    let mint: PublicKey = await createMint(connection, admin, admin.publicKey, null, 9);
    console.log("mint created");
    //console.log(`Create token: ${mint.toBase58()}`);
    const fromTokenAccount: Account = await getOrCreateAssociatedTokenAccount(
        connection,
        admin,
        mint,
        admin.publicKey
    );
    console.log("token account created");
    return { tokenAccount: fromTokenAccount, mint: mint, wallet: admin };
}
export async function mintToken(fromWallet: Keypair, mint: PublicKey, fromTokenAccount: Account) {
    const signature = await mintTo(
        connection,
        fromWallet,
        mint,
        fromTokenAccount.address,
        fromWallet.publicKey,
        //we have 9 decimal points, same as sol, so we have the same amount of lamports as a SOL
        100000000 * LAMPORTS_PER_SOL
    );
    //console.log(`Mint signature ${signature}`);
    return signature;
}


export async function checkBalance(mint: string, keypair: Keypair = admin) {
    const fromWallet = keypair;
    const mintKey = new PublicKey(mint);
    const mintInfo = await getMint(connection, mintKey);
    //console.log(`Supply: ${mintInfo.supply}`);
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mintKey, fromWallet.publicKey);
    //console.log("fromtokenaccount");
    const tokenAccountInfo = await getAccount(connection, fromTokenAccount.address);
    //console.log("tokenaccountinfo");
    return tokenAccountInfo.amount;
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
        Math.floor(amount * LAMPORTS_PER_SOL)
    );
    console.log(`Signature: ${signature}`);
}
export async function sendSol(address: string, amount: number) {
    const transaction = new Transaction();
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: admin.publicKey,
            toPubkey: new PublicKey(address),
            lamports: LAMPORTS_PER_SOL * amount,
        }),
    );
    const signature = await sendAndConfirmTransaction(connection, transaction, [admin]);
    return signature;
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
        const name = mints.get(mint);
        if (name) {
            return [name, amount];
        }
    }).filter((x) => x !== undefined) as [string, number][];
    return new Map(result);
}