import BasicButton from "@/components/BasicButton";

const HowToPlayPage = () => {
    return (
        <div className="p-4 bg-gray-800 text-white min-h-screen w-screen">
            <div className="flex flex-row justify-start items-center gap-2 mb-4">
                <BasicButton onClick={() => window.location.href = "/"} text="Play" />
                <BasicButton onClick={() => window.location.href = "/shop"} text="Shop" />
            </div>
            <h1 className="text-3xl font-bold mb-6">How to Play</h1>
            <section className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Controlling the Spaceship</h2>
                <p>Move your spaceship by moving your mouse. The spaceship will follow the direction of the cursor.</p>
                <p>Press G to grapple onto nearby asteroids, rapidly changing direction</p>
                <p>Make sure not to hit the asteroids, as {`you'll`} die!</p>
            </section>
            <section className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Power-ups</h2>
                <p>Use the keys <span className="font-bold">Z</span>, <span className="font-bold">X</span>, <span className="font-bold">C</span>, <span className="font-bold">V</span>, and <span className="font-bold">B</span> or click on the power-up icon to activate the following power-ups sequentially:</p>
                <ul className="list-disc pl-6">
                    <li>Health</li>
                    <li>Heavy Bullet</li>
                    <li>Fast Bullet</li>
                    <li>Speed</li>
                    <li>Machine Bullet</li>
                </ul>
            </section>
            <section className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Earning NFTs</h2>
                <p>{`On your first play, you'll mint an NFT representing your spaceship. This NFT can be upgraded with tokens you collect in-game.`}</p>
            </section>
            <section className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Collecting Cash and Trophies</h2>
                <p>Earn cash by staying alive, collecting pop-ups in the game, and destroying asteroids. Collect trophies to upgrade your character and receive extra bonuses such as extended power-up durations and additional points and trophies from gameplay.</p>
            </section>
            <section className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Power-up Tokens</h2>
                <p>Every power-up in the game represents a token. These can either be collected during gameplay or purchased in the in-game shop using cash.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold mb-2">Level Up Your NFT</h2>
                <p>{`As you destroy more players, your spaceship's NFT will level up and change color, representing your increasing prowess in the game`}.</p>
                <p>{`As you level up, you'll unlock class upgrades to supercharge your spaceship`}</p>
                <ul className="list-disc pl-6">
                    <li>MultiShot - Double the shots, double the destruction</li>
                    <li>TripleShot - Cover the area with a rain of bullets</li>
                    <li>{`Shoot backwards and forwards so you're never caught off guard`}</li>
                </ul>
                <p>More class upgrades coming soon...</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold mb-2">Gamemodes</h2>
                <ul className="list-disc pl-6">
                    <li>Casual - Pay a fee of SOL to play against AI only</li>
                    <li>Normal - the normal game. Play against your friends or the AI</li>
                    <li>Competitive - Pay SOL to play, earn SOL when killing other players {`No AI opponents in competitive`}</li>
                </ul>
            </section>
        </div>
    );
};

export default HowToPlayPage;