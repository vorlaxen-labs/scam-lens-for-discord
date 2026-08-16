import { SlashCommandBuilder } from 'discord.js';
import { getDb } from '../infra/database/connection.js';
import { ScamHashRepository } from '../infra/database/repositories/scam-hash.repository.js';
import { refreshRuntimeCaches } from '../infra/bootstrap/create-services.js';
import type { BotCommand } from '../shared/types/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { ImageFetchError } from '../shared/utils/image-fetch.util.js';
import { client } from '../infra/bot/client.js';
import { validateScamHash } from './get-hash.command.js';

const AddScamCommand: BotCommand = {
  name: 'add-scam',
  description: 'Add a scam image hash to this server blocklist',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('add-scam')
    .setDescription('Add a scam image hash to this server blocklist')
    .addAttachmentOption((option) =>
      option.setName('image').setDescription('Scam image attachment').setRequired(false),
    )
    .addStringOption((option) =>
      option.setName('scam-hash').setDescription('Known scam hash hex').setRequired(false),
    )
    .addStringOption((option) =>
      option.setName('label').setDescription('Optional label').setRequired(false),
    ),
  async execute(interaction) {
    const image = interaction.options.getAttachment('image');
    const scamHash = interaction.options.getString('scam-hash');
    const label = interaction.options.getString('label');

    if (!image && !scamHash) {
      await interaction.reply({
        content: 'Provide either an image attachment or a scam-hash value.',
        ephemeral: true,
      });
      return;
    }

    let hash = scamHash?.toLowerCase() ?? null;
    if (image) {
      if (!image.contentType?.startsWith('image/')) {
        await interaction.reply({ content: 'Attachment must be an image.', ephemeral: true });
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      try {
        hash = await client.services!.phashService.computeHashFromUrl(image.url);
      } catch (error) {
        const message =
          error instanceof ImageFetchError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Failed to process image';
        await interaction.editReply({ content: message });
        return;
      }
    } else if (!validateScamHash(hash!)) {
      await interaction.reply({ content: 'Invalid scam-hash format.', ephemeral: true });
      return;
    }

    const guildId = interaction.guildId!;
    const repo = new ScamHashRepository(getDb());
    repo.upsertGuild(guildId, hash!, label, interaction.user.id);
    refreshRuntimeCaches(client.services!);

    const reply = {
      embeds: [EmbedBuilder.success('Hash added', `\`${hash}\``)],
      ephemeral: true,
    };

    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply(reply);
    }
  },
};

export default AddScamCommand;
