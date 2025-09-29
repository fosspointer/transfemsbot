import { CacheType, Channel, ChatInputCommandInteraction, Client, Collection, EmbedBuilder, Events, GatewayIntentBits, InteractionReplyOptions, PermissionsBitField } from "discord.js";
import { Command, isCommand } from "./command";
import path from 'path';
import fs from 'fs';
import _dotenv from 'dotenv';
import { GuildData, initStorage, readGuild } from "./storage";
_dotenv.config();

const environment_variables = [
    process.env.GUILD_ID,
    process.env.WELCOME_CHANNEL_ID,
    process.env.RULES_CHANNEL_ID,
    process.env.VERIFICATION_CHANNEL_ID,
    process.env.TOKEN,
    process.env.ADULT_VERIFIED_ROLE_ID,
    process.env.MINOR_VERIFIED_ROLE_ID,
    process.env.TRUSTED_ROLE_ID
];

for(const variable in environment_variables)
    if(!variable)
    {
        console.error("Provided missing or incomplete .env file");
        process.exit(-1);
    }

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]});
let welcome_channel: Channel | undefined; 

let up: boolean = false;

let new_members: Array<string> = [];

client.on(Events.GuildMemberAdd, member => {
    new_members.push(member.user.id);
});

setInterval(async () => {
    if(!up || new_members.length == 0) return;
    const guild = await client.guilds.fetch(process.env.GUILD_ID!);
    for(let i = 0; i < new_members.length; i++)
    {
        const is_member = guild.members.cache.has(new_members[i]);
        if(!is_member)
        {
            new_members.splice(i, 1);
            i--;
        }
    }
    if(new_members.length == 0) return;
    const new_member_string = new_members.map(id => `<@${id}>`).join(' ');
    console.info(new_member_string);
    const embed = new EmbedBuilder()
        .setTitle('Welcome to Transfems Greece')
        .setColor('Aqua')
        .setDescription(
            `Αποδεχτείτε τα <#${process.env.RULES_CHANNEL_ID}> για να μπείτε στον server!\n` +
            `Accept the <#${process.env.RULES_CHANNEL_ID}> to join the server!`
        )
        .setImage(client.guilds.cache.get(process.env.GUILD_ID!)?.iconURL() ?? null)
        .setFooter({text: 'Note: you\'ll need to react with \'✅\' to Carl\'s message'});
    new_members = [];
    if(!welcome_channel?.isSendable()) return console.error("Welcome channel is not sendable!!");
    welcome_channel.send({embeds: [embed], content: new_member_string})
}, 30_000);

const commands = new Collection<string, Command>();
const command_path = path.join(__dirname, 'commands');
const command_files = fs.readdirSync(command_path).filter(file => file.endsWith('.ts'));

for(const file of command_files) {
    const filepath = path.join(command_path, file);
    const command = require(filepath);
    if(isCommand(command)) {
        commands.set(command.data.name, command);
    }
    else {
        console.warn(`Warning: '${filepath}' does not implement the 'Command' interface!`);
    }
}

client.once(Events.ClientReady, async ready_client => {
    console.log(`Transfems Greece bot logged in as ${ready_client.user.tag}`);
    up = true;
    welcome_channel = ready_client.channels.cache.get(process.env.WELCOME_CHANNEL_ID!);
    const guilds = await ready_client.guilds.fetch();
    for(const [id, guild] of ready_client.guilds.cache)
        if(id !== process.env.GUILD_ID)
            guild.leave().catch(err => console.error(`An error occured while leaving unauthorized guild with id ${id}`));
});

const handleCommandInteraction = async (interaction: ChatInputCommandInteraction<CacheType>) => {
    if(interaction.guildId !== process.env.GUILD_ID)
        return interaction.reply({content: 'Unauthorized', flags: 'Ephemeral'});

    const command = commands.get(interaction.commandName);
    if(!command) return console.log(`Command ${interaction.commandName} was null.`);

    try {
        if(interaction.guildId != process.env.GUILD_ID) return;
        await command.execute(interaction, client);
    }
    catch (error) {
        console.error(error);
        let message_string = "An error occured during the execution of this command.";
        if(typeof interaction.member?.permissions != "string" && interaction.member?.permissions.has(PermissionsBitField.Flags.ManageGuild))
            message_string += "\n```\n" + error + "```";

        const message: InteractionReplyOptions = {
            content: message_string, ephemeral: true
        }
        if(interaction.replied || interaction.deferred)
            await interaction.followUp(message);
        else await interaction.reply(message);
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if(interaction.isChatInputCommand())
        return await handleCommandInteraction(interaction);
});

client.on(Events.MessageCreate, message => {
    if(message.author.bot) return;
    
    let guild = readGuild(message.guildId!);
    const author_id = message.author.id;

    guild.members[author_id] ??= {messageCount: 0}
    guild.members[author_id].messageCount ??= 0;
    guild.members[author_id].messageCount++;

    if(guild.members[author_id].messageCount >= 500 && !message.member?.roles.cache.has(process.env.TRUSTED_ROLE_ID!))
        message.guild?.roles.fetch(process.env.TRUSTED_ROLE_ID!)?.then(role => {
            message.member!.roles.add(role!);
        })!;
});

client.on(Events.GuildBanAdd, ban => {
    let guild = readGuild(ban.guild.id);
    if(guild.members[ban.user.id])
        delete guild.members[ban.user.id];
})

client.login(process.env.TOKEN);
initStorage();