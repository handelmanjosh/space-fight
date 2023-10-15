

// get player nft stats

import { CreateCompressedNftOutput, PublicKey, toMetaplexFile, token } from "@metaplex-foundation/js";
import { metaplex, collectionMintAddress } from "../server";
import fs from 'fs';
import path from 'path';
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
export async function initializeCollection() {
    // const fullPath = path.join(__dirname, "../assets/spaceship.png");
    // const buffer = fs.readFileSync(fullPath);
    // const file = toMetaplexFile(buffer, "image.png");
    // const imageUri = await metaplex.storage().upload(file);
    const { uri } = await metaplex.nfts().uploadMetadata({
        name: "Spaceships",
        description: "Spaceships",
        image: "",
        level: 1,
    });
    const collection = await metaplex.nfts().create(
        {
            uri,
            name: "Spaceships",
            sellerFeeBasisPoints: 0,
            isCollection: true,
        },
        { commitment: "finalized" }
    );
    return collection;
}
export async function createNFT(src: string, to: string, metadata: NFTMetadata, num: number): Promise<NFTMetadata & { nft: string; }> {
    // const buffer = fs.readFileSync(src);
    // const file = toMetaplexFile(buffer, "image.png");
    // const imageUri = await metaplex.storage().upload(file);
    //metadata.image = imageUri;
    // not going to use src to avoid fees
    const { uri } = await metaplex.nfts().uploadMetadata(metadata);
    console.log("uploaded");
    const { nft } = await metaplex.nfts().create(
        {
            uri,
            name: `Spaceship #${num}`,
            sellerFeeBasisPoints: 0,
            collection: new PublicKey(collectionMintAddress),
        },
        { commitment: "finalized" }
    );
    console.log("created");
    const address = nft.address;
    await metaplex.nfts().verifyCollection({
        mintAddress: nft.address,
        collectionMintAddress: new PublicKey(collectionMintAddress),
        isSizedCollection: false,
    });
    console.log("verified");
    //console.log(nft);
    // await metaplex.nfts().mint({
    //     nftOrSft: nft,
    //     toOwner: new PublicKey(to),
    // });
    await metaplex.nfts().transfer({
        nftOrSft: nft,
        toOwner: new PublicKey(to),
    });
    console.log("minted");
    return {
        ...metadata,
        nft: address.toBase58(),
    };
}
export async function updateNFT(nft: string, newMetadata: NFTMetadata) {
    const NFT = await metaplex.nfts().findByMetadata({
        metadata: new PublicKey(nft),
    });
    const { uri } = await metaplex.nfts().uploadMetadata(newMetadata);
    console.log("uploaded");
    const { response } = await metaplex.nfts().update(
        {
            nftOrSft: NFT,
            name: NFT.name,
            uri,
        },
        { commitment: "finalized" }
    );
    console.log("updated");
    return response;
}
export async function retrieveNFT(nft: string) {
    const NFT = await metaplex.nfts().findByMint({
        mintAddress: new PublicKey(nft),
    });
    return NFT;
}
