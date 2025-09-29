import * as fs from 'fs';
import * as path from 'path';

const guild_filepath: string = path.join(__dirname, '../data.json');

export interface MemberData {
    messageCount?: number;
    verificationDate?: string
}

export interface GuildData {
    members: Record<string, MemberData>;
}

let cachedGuild: GuildData = {members: {}};
let loaded: boolean = false;

function testOfficialGuild(guild_id: string) {
    if(guild_id !== process.env.GUILD_ID)
        throw Error("Tried to access data in unauthorized guild.");
}

export function readGuild(guild_id: string): GuildData {
    testOfficialGuild(guild_id);

    if(loaded)
        return cachedGuild;
    
    if(!fs.existsSync(guild_filepath))
        throw new Error("Guild file does not exist.");

    cachedGuild = JSON.parse(fs.readFileSync(guild_filepath).toString());
    loaded = true;
    return cachedGuild;
}

export function readMember(guild_id: string, user_id: string): MemberData | undefined {
    const guild_data = readGuild(guild_id);
    return guild_data.members[user_id];
}

export function initStorage() {
    setInterval(() => {
        if(loaded)
            fs.writeFileSync(guild_filepath, JSON.stringify(cachedGuild, null, 4));
    }, 60_000);
}

export function minimumAdultDate() {
    const current_date = new Date();
    return new Date(current_date.getFullYear() - 18, current_date.getMonth(), current_date.getDate());
}