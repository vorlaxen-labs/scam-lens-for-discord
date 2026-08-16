import { SlashCommandBuilder } from 'discord.js';
import { appConfig } from '../config/index.js';
import type { AboutEmbedContext, BotCommand } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';

const AboutCommand: BotCommand = {
  name: 'about',
  description: 'About Scam Lens For Discord',
  settings: { guildOnly: false },
  data: new SlashCommandBuilder().setName('about').setDescription('About Scam Lens For Discord'),
  async execute(interaction) {
    const services = client.services!;
    const hashCounts = services.phashService.getHashCounts();

    const context: AboutEmbedContext = {
      version: appConfig.version,
      globalDomainCount: services.domainBlocklistService.getGlobalDomainCount(),
      globalHashCount: hashCounts.global,
      guildCount: client.guilds.cache.size,
    };

    if (interaction.guildId) {
      const settings = services.guildSettingsService.getOrCreate(interaction.guildId);
      context.guild = {
        enabled: settings.enabled,
        actionMode: settings.actionMode,
        phashThreshold: settings.phashThreshold,
        phashStrictThreshold: settings.phashStrictThreshold,
        customDomainCount: services.domainBlocklistService.listGuildDomains(interaction.guildId).length,
        logChannelId: settings.logChannelId,
        guildHashCount: services.phashService.countForGuild(interaction.guildId),
      };
    }

    await interaction.reply(services.detectionLogService.buildAboutEmbed(context));
  },
};

export default AboutCommand;
