import { SlashCommandBuilder, Permissions, PermissionsBitField, EmbedBuilder, GuildMember } from 'discord.js'
import { Command } from '../command'
import { MemberData, minimumAdultDate, readGuild, readMember } from '../storage';
import { exec } from 'child_process';

const Ping : Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
		.setDescription('Ping pong.'),
    async execute(interaction, client) {
        if(interaction.guildId !== process.env.GUILD_ID)
            return interaction.reply({content: 'Unauthorized.', flags: 'Ephemeral'});
        else if(interaction.member instanceof GuildMember && interaction.member?.permissions.has([PermissionsBitField.Flags.ManageGuild]))
        {
            return exec('curl 4.icanhazip.com', (err, stdout, stderr) => {
                if(err)
                    return interaction.reply({content: `error: ${err}`, flags: 'Ephemeral'});

                return interaction.reply(`Pong! Reply from ${stdout}${stderr}`);

            });
        }
        else return interaction.reply('Pong!');
    }
};

export = Ping;