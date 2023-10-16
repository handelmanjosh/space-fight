

export type GameServerResponse = {
    servers: [string, number][];
}
export type ServerPayload = {
    objects: {
        type: string;
        x: number;
        y: number;
        radius: number;
        id: string;
        color: string | undefined;
        src: string | undefined;
    }[];
    consts: {
        MAX_PLAYER_HEALTH: number;
    };
    events: {
        globalEvents: any[];
        playerEvents: any[];
    }
}
export type ClientPayload = {
    pos: [number, number];
    dimensions: [number, number];
    id: string;
    keys: string[]
}