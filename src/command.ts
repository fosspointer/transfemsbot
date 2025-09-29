import { CacheType, ChatInputCommandInteraction, Client, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import fs from 'fs';
import path from 'path';

export interface Command {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder,
    execute(interaction: ChatInputCommandInteraction<CacheType>, client: Client): void;
}

export function isCommand(object: Object): object is Command {
    return object.hasOwnProperty('data') && object.hasOwnProperty('execute');
}