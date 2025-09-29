import { SlashCommandBuilder, Permissions, PermissionsBitField, EmbedBuilder } from 'discord.js'
import { Command } from '../command'
import { MemberData, minimumAdultDate, readGuild, readMember } from '../storage';

const Verify : Command = {
    data: new SlashCommandBuilder()
        .setName('verify')
		.setDescription('Give verified access to a user.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addUserOption(user =>
            user.setName('user')
                .setDescription('The user to verify.')
                .setRequired(true)
        )
        .addStringOption(date =>
            date.setName('date')
                .setDescription('The user\'s date of birth')
                .setRequired(true)
        ),
    async execute(interaction, client) {
        if(interaction.guildId !== process.env.GUILD_ID)
            return interaction.reply({content: 'Unauthorized.', flags: 'Ephemeral'});
        else if(interaction.channelId !== process.env.VERIFICATION_CHANNEL_ID)
            return interaction.reply({content: "Invalid channel for verification", flags: 'Ephemeral'});

        const user_option = interaction.options.getUser('user', true);
        const date_option = interaction.options.getString('date', true);
        const match = date_option.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        let member: MemberData | undefined;

        if(!match)
            return interaction.reply({content: "Invalid date format; Use dd.mm.yyyy!", flags: 'Ephemeral'});

        else if(user_option.bot || interaction.user.bot)
            return interaction.reply({content: 'Verification is not intended for bot users.', flags: 'Ephemeral'});

        else if(!!(member = readMember(interaction.guildId, user_option.id)) && !!member?.verificationDate) {
            return interaction.reply({content: "User has already been verified before.", flags: 'Ephemeral'});
        }

        const [_, day, month, year] = match;
        const date = new Date(+year, +month - 1, +day);
        const formatted = date.toLocaleDateString('el-GR');
        const is_adult = date <= minimumAdultDate();

        let guild_data = readGuild(interaction.guildId);
        guild_data.members[user_option.id] ??= {};
        guild_data.members[user_option.id].verificationDate = date_option;

        if(is_adult)
        {
            const role = await interaction.guild?.roles.fetch(process.env.ADULT_VERIFIED_ROLE_ID!);
            const member = await interaction.guild?.members.fetch(user_option.id);
            await member?.roles.add(role!);
        }
        else
        {
            const role = await interaction.guild?.roles.fetch(process.env.MINOR_VERIFIED_ROLE_ID!);
            const member = await interaction.guild?.members.fetch(user_option.id);
            await member?.roles.add(role!);
        }

        const embed = new EmbedBuilder()
            .setTitle("Verification successful")
            .setColor('Green')
            .setDescription(`Date ${formatted} set for user <@${user_option.id}>`)
            .addFields([
                {name: "Is an adult", value: is_adult? "Yes ✅": "No ❌"},
                {name: "Display name", value: user_option.displayName},
                {name: "Username", value: user_option.username},
                {name: "Verification time and date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`}
            ])
            .setThumbnail(user_option.avatarURL());
        await interaction.reply({embeds: [embed]});
    }
};

export = Verify;