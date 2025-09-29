import { FetchMessagesOptions, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { Command } from '../command'
import { GuildData, readGuild } from '../storage';

async function sleep(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

const FetchMessages : Command = {
    data: new SlashCommandBuilder()
        .setName('fetch-messages')
		.setDescription('Fetch messages in bulk to estimate user activity.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction, client) {
        if(interaction.guildId !== process.env.GUILD_ID)
            return interaction.reply({content: 'Unauthorized.', flags: 'Ephemeral'});

        interaction.deferReply();
        const channels = await interaction.guild?.channels.fetch()!;
        let guild_data = readGuild(interaction.guildId);
        let seen_members = new Set<string>();
        let total_messages = 0, total_channels = 0;
        for(const [id, channel] of channels) {
            total_channels++;
            if(!channel?.isTextBased() || !channel?.isSendable()) continue;
            let last_id;
            while(true) {
                let options: FetchMessagesOptions = {limit: 100};
                if(last_id) options.before = last_id;
                const messages = await channel.messages.fetch(options);
                if(messages.size == 0) break;
                for(const [message_id, message] of messages) {
                    total_messages++;
                    try {
                        const author_id = message.author.id;
                        if(!seen_members.has(author_id))
                        {
                            guild_data.members[author_id] ??= {messageCount: 0};
                            guild_data.members[author_id].messageCount = 0;
                            seen_members.add(author_id);
                        }
                        guild_data.members[author_id]!.messageCount!++;
                        last_id = messages.last()?.id;
                        console.info(message_id);
                    }
                    catch (err) {
                        console.error(`Error fetching messages in #${channel.name}>: ${err}`);
                        await sleep(60_000);
                    }
                }
                await sleep(2_000);
            }
        }
        interaction.editReply(`Fetching complete. Scanned ${total_messages} messages across ${total_channels} channels.`);
    }
};

export = FetchMessages;