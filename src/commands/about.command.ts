import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';

const AboutCommand: BotCommand = {
  name: 'about',
  description: 'About Scam Lens For Discord',
  settings: { guildOnly: false },
  data: new SlashCommandBuilder().setName('about').setDescription('About Scam Lens For Discord'),
  async execute(interaction) {
    const services = client.services!;
    await interaction.reply(services.detectionLogService.buildAboutEmbed());
  },
};

export default AboutCommand;
