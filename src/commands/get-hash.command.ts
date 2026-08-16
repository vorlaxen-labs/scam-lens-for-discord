import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';
import { isValidHexHash } from '../shared/utils/hamming.util.js';

const GetHashCommand: BotCommand = {
  name: 'get-hash',
  description: 'Compute perceptual hash for an image attachment',
  settings: { manageGuildRequired: true, cooldownSeconds: 3 },
  data: new SlashCommandBuilder()
    .setName('get-hash')
    .setDescription('Compute perceptual hash for an image attachment')
    .addAttachmentOption((option) =>
      option.setName('image').setDescription('Image attachment').setRequired(true),
    ),
  async execute(interaction) {
    const attachment = interaction.options.getAttachment('image', true);
    if (!attachment.contentType?.startsWith('image/')) {
      await interaction.reply({ content: 'Attachment must be an image.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const hash = await client.services!.phashService.computeHashFromUrl(attachment.url);
    await interaction.editReply({ content: `\`${hash}\`` });
  },
};

export default GetHashCommand;

export function validateScamHash(value: string): boolean {
  return isValidHexHash(value);
}
