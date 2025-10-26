require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error('TOKEN in .env fehlt');
  process.exit(1);
}

// IDs (kannst via .env anpassen, hier Default aus Anfrage)
const TRIGGER_VOICE_ID = process.env.TRIGGER_VOICE_ID || '1432031135382372474';
const CONTROL_CHANNEL_ID = process.env.CONTROL_CHANNEL_ID || '1432030850324627576';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

// In-memory store: channelId -> { ownerId, autodelete:boolean, controlMessageId }
const tempChannels = new Map();

client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
});

function buildControlEmbed(guild, channelId) {
  const info = tempChannels.get(channelId);
  const channel = guild.channels.cache.get(channelId);
  const userLimit = channel ? (channel.userLimit || 0) : 0;
  const owner = info ? `<@${info.ownerId}>` : 'Unbekannt';
  const autodel = info && info.autodelete ? 'Ja' : 'Nein';
  return new EmbedBuilder()
    .setTitle('TempTalk Steuerung')
    .setDescription('Verwalte deinen Kanal mit den Buttons unten.')
    .addFields(
      { name: 'Owner', value: owner, inline: true },
      { name: 'Userlimit', value: `${userLimit}`, inline: true },
      { name: 'Auto-Löschung', value: autodel, inline: true }
    )
    .setColor(0x2f3136)
    .setFooter({ text: `Channel ID: ${channelId}` });
}

function buildControlRow(channelId) {
  // Buttons: Lock, Limit, Transfer, Invite, Block, Delete, ToggleAuto
  const lock = new ButtonBuilder().setCustomId(`temp_lock:${channelId}`).setLabel('🔒 Kanal sperren').setStyle(ButtonStyle.Primary);
  const limit = new ButtonBuilder().setCustomId(`temp_limit:${channelId}`).setLabel('🎚️ Limit setzen').setStyle(ButtonStyle.Secondary);
  const transfer = new ButtonBuilder().setCustomId(`temp_transfer:${channelId}`).setLabel('👑 Inhaber übertragen').setStyle(ButtonStyle.Success);
  const invite = new ButtonBuilder().setCustomId(`temp_invite:${channelId}`).setLabel('➕ Benutzer einladen').setStyle(ButtonStyle.Primary);
  const block = new ButtonBuilder().setCustomId(`temp_block:${channelId}`).setLabel('⛔ Benutzer blockieren').setStyle(ButtonStyle.Danger);
  const del = new ButtonBuilder().setCustomId(`temp_delete:${channelId}`).setLabel('🗑️ Kanal löschen').setStyle(ButtonStyle.Danger);
  // Note: Discord erlaubt max 5 buttons per ActionRow, wir packen in zwei Reihen
  const row1 = new ActionRowBuilder().addComponents(lock, limit, transfer, invite, block);
  const row2 = new ActionRowBuilder().addComponents(del);
  return [row1, row2];
}

async function createControlMessage(guild, channelId) {
  const controlChannel = guild.channels.cache.get(CONTROL_CHANNEL_ID);
  if (!controlChannel) return null;
  const embed = buildControlEmbed(guild, channelId);
  const rows = buildControlRow(channelId);
  const msg = await controlChannel.send({ embeds: [embed], components: rows });
  // store message id
  const info = tempChannels.get(channelId) || {};
  info.controlMessageId = msg.id;
  tempChannels.set(channelId, info);
  return msg;
}

async function updateControlMessage(guild, channelId) {
  const info = tempChannels.get(channelId);
  if (!info || !info.controlMessageId) return;
  const controlChannel = guild.channels.cache.get(CONTROL_CHANNEL_ID);
  if (!controlChannel) return;
  try {
    const msg = await controlChannel.messages.fetch(info.controlMessageId);
    await msg.edit({ embeds: [buildControlEmbed(guild, channelId)] });
  } catch (err) {
    // message ggf. gelöscht -> neu erstellen
    await createControlMessage(guild, channelId);
  }
}

// Voice state handler: create temp channel when joining trigger channel
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    // user joined the trigger channel
    if ((!oldState.channelId || oldState.channelId !== TRIGGER_VOICE_ID) && newState.channelId === TRIGGER_VOICE_ID) {
      const member = newState.member;
      const guild = newState.guild;
      const triggerChannel = guild.channels.cache.get(TRIGGER_VOICE_ID);
      if (!triggerChannel) return;
      // create voice channel under same category as trigger
      const name = `TempTalk - ${member.user.username}`;
      const newChannel = await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: triggerChannel.parentId || null,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
            // CONNECT handled by lock toggle
          },
          {
            id: member.id,
            allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
          }
        ],
      });

      // move member to new channel
      await member.voice.setChannel(newChannel);

      // store metadata
      tempChannels.set(newChannel.id, { ownerId: member.id, autodelete: true, controlMessageId: null });

      // send control message in control channel
      await createControlMessage(guild, newChannel.id);
      console.log(`Created TempTalk ${newChannel.id} for ${member.user.tag}`);
    }

    // Auto-delete logic: when a temp channel becomes empty
    // If newState.channelId !== the temp channel and oldState.channelId was the temp channel
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
      const channel = oldState.guild.channels.cache.get(oldState.channelId);
      if (channel && channel.members.size === 0) {
        const info = tempChannels.get(oldState.channelId);
        if (info && info.autodelete) {
          // small delay to avoid race conditions
          setTimeout(async () => {
            const ch = oldState.guild.channels.cache.get(oldState.channelId);
            if (!ch) return;
            if (ch.members.size === 0) {
              try {
                if (info.controlMessageId) {
                  const ctrl = oldState.guild.channels.cache.get(CONTROL_CHANNEL_ID);
                  if (ctrl) {
                    try { await ctrl.messages.delete(info.controlMessageId); } catch (e) { /* ignore */ }
                  }
                }
                await ch.delete('TempTalk auto-delete');
                tempChannels.delete(oldState.channelId);
                console.log(`Auto-deleted TempTalk ${oldState.channelId}`);
              } catch (err) {
                console.error('Error deleting channel:', err);
              }
            }
          }, 3000);
        }
      } else {
        // if channel still has members, keep it
      }
    }
  } catch (err) {
    console.error('voiceStateUpdate error:', err);
  }
});

// Interaction handler for buttons & modals
client.on('interactionCreate', async (interaction) => {
  try {
    // Modal submissions
    if (interaction.isModalSubmit()) {
      const [action, channelId] = interaction.customId.split(':');
      const guild = interaction.guild;
      if (!tempChannels.has(channelId)) return interaction.reply({ content: 'Dieser TempTalk existiert nicht mehr.', ephemeral: true });
      const info = tempChannels.get(channelId);
      if (interaction.user.id !== info.ownerId) return interaction.reply({ content: 'Nur der Ersteller kann diese Aktion durchführen.', ephemeral: true });

      const channel = guild.channels.cache.get(channelId);
      if (!channel) return interaction.reply({ content: 'TempTalk Kanal nicht gefunden.', ephemeral: true });

      if (action === 'temp_limit_modal') {
        const limitStr = interaction.fields.getTextInputValue('limit_input');
        const num = Math.max(0, Math.min(99, parseInt(limitStr) || 0));
        await channel.edit({ userLimit: num });
        await interaction.reply({ content: `Limit gesetzt auf ${num}`, ephemeral: true });
        await updateControlMessage(guild, channelId);
        return;
      }

      if (action === 'temp_transfer_modal') {
        const userStr = interaction.fields.getTextInputValue('transfer_input').trim();
        const match = userStr.match(/<@!?(\d+)>/) || userStr.match(/^(\d+)$/);
        if (!match) return interaction.reply({ content: 'Bitte eine gültige Erwähnung oder ID angeben.', ephemeral: true });
        const newOwnerId = match[1];
        const member = guild.members.cache.get(newOwnerId) || await guild.members.fetch(newOwnerId).catch(() => null);
        if (!member) return interaction.reply({ content: 'Benutzer im Server nicht gefunden.', ephemeral: true });
        info.ownerId = newOwnerId;
        tempChannels.set(channelId, info);
        // update permission overwrites: give new owner ManageChannels & Connect
        await channel.permissionOverwrites.edit(newOwnerId, { ManageChannels: true, Connect: true, Speak: true });
        await interaction.reply({ content: `Inhaber übertragen an ${member.user.tag}`, ephemeral: true });
        await updateControlMessage(guild, channelId);
        return;
      }

      if (action === 'temp_invite_modal') {
        const userStr = interaction.fields.getTextInputValue('invite_input').trim();
        const match = userStr.match(/<@!?(\d+)>/) || userStr.match(/^(\d+)$/);
        if (!match) return interaction.reply({ content: 'Bitte eine gültige Erwähnung oder ID angeben.', ephemeral: true });
        const targetId = match[1];
        const targetMember = guild.members.cache.get(targetId) || await guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: 'Benutzer im Server nicht gefunden.', ephemeral: true });
        // create invite
        const invite = await channel.createInvite({ maxAge: 60 * 60, maxUses: 1, unique: true, reason: `Invite by ${interaction.user.tag}` });
        try {
          await targetMember.send(`Du wurdest eingeladen in ${guild.name} - ${channel.name}\n${invite.url}`);
          await interaction.reply({ content: `Einladung per DM an ${targetMember.user.tag} gesendet.`, ephemeral: true });
        } catch {
          await interaction.reply({ content: `Konnte DM nicht senden. Invite-Link: ${invite.url}`, ephemeral: true });
        }
        return;
      }

      if (action === 'temp_block_modal') {
        const userStr = interaction.fields.getTextInputValue('block_input').trim();
        const match = userStr.match(/<@!?(\d+)>/) || userStr.match(/^(\d+)$/);
        if (!match) return interaction.reply({ content: 'Bitte eine gültige Erwähnung oder ID angeben.', ephemeral: true });
        const targetId = match[1];
        // add overwrite deny Connect
        await channel.permissionOverwrites.edit(targetId, { Connect: false });
        // if they are currently in the channel, move them out
        const member = guild.members.cache.get(targetId) || await guild.members.fetch(targetId).catch(() => null);
        if (member && member.voice.channelId === channelId) {
          await member.voice.disconnect().catch(() => { /* ignore */ });
        }
        await interaction.reply({ content: `Benutzer <@${targetId}> wurde blockiert (kein Verbinden).`, ephemeral: true });
        return;
      }
    }

    // Button interactions
    if (!interaction.isButton()) return;
    const [action, channelId] = interaction.customId.split(':');
    const guild = interaction.guild;
    if (!tempChannels.has(channelId)) return interaction.reply({ content: 'Dieser TempTalk existiert nicht (mehr).', ephemeral: true });
    const info = tempChannels.get(channelId);
    // permission check
    if (interaction.user.id !== info.ownerId) return interaction.reply({ content: 'Nur der Ersteller kann diese Aktion durchführen.', ephemeral: true });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: 'TempTalk Kanal nicht gefunden.', ephemeral: true });

    if (action === 'temp_lock') {
      // toggle lock: deny Connect for everyone
      const everyone = guild.roles.everyone;
      const currentOverwrite = channel.permissionOverwrites.cache.get(everyone.id);
      const isLocked = currentOverwrite && currentOverwrite.deny.has(PermissionsBitField.Flags.Connect);
      if (isLocked) {
        await channel.permissionOverwrites.edit(everyone.id, { Connect: null });
        await interaction.reply({ content: 'Kanal entsperrt.', ephemeral: true });
      } else {
        await channel.permissionOverwrites.edit(everyone.id, { Connect: false });
        await interaction.reply({ content: 'Kanal gesperrt (everyone kann nicht verbinden).', ephemeral: true });
      }
      await updateControlMessage(guild, channelId);
      return;
    }

    if (action === 'temp_limit') {
      // show modal to set limit
      const modal = new ModalBuilder().setCustomId(`temp_limit_modal:${channelId}`).setTitle('Userlimit setzen');
      const input = new TextInputBuilder().setCustomId('limit_input').setLabel('Max Anzahl (0 = unbegrenzt)').setStyle(TextInputStyle.Short).setPlaceholder('z.B. 0 oder 5').setRequired(true);
      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);
      await interaction.showModal(modal);
      return;
    }

    if (action === 'temp_transfer') {
      const modal = new ModalBuilder().setCustomId(`temp_transfer_modal:${channelId}`).setTitle('Inhaber übertragen');
      const input = new TextInputBuilder().setCustomId('transfer_input').setLabel('Erwähne neuen Inhaber (Mention oder ID)').setStyle(TextInputStyle.Short).setPlaceholder('<@123456789012345678> oder 123456789012345678').setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (action === 'temp_invite') {
      const modal = new ModalBuilder().setCustomId(`temp_invite_modal:${channelId}`).setTitle('Benutzer einladen');
      const input = new TextInputBuilder().setCustomId('invite_input').setLabel('Erwähne Benutzer (Mention oder ID)').setStyle(TextInputStyle.Short).setPlaceholder('<@1234> oder 1234').setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (action === 'temp_block') {
      const modal = new ModalBuilder().setCustomId(`temp_block_modal:${channelId}`).setTitle('Benutzer blockieren');
      const input = new TextInputBuilder().setCustomId('block_input').setLabel('Erwähne Benutzer (Mention oder ID)').setStyle(TextInputStyle.Short).setPlaceholder('<@1234> oder 1234').setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (action === 'temp_delete') {
      // delete channel and control message
      try {
        const info = tempChannels.get(channelId);
        if (info && info.controlMessageId) {
          try {
            const ctrl = guild.channels.cache.get(CONTROL_CHANNEL_ID);
            if (ctrl) await ctrl.messages.delete(info.controlMessageId);
          } catch {}
        }
        await channel.delete('Deleted by owner via control button');
        tempChannels.delete(channelId);
        await interaction.reply({ content: 'Kanal gelöscht.', ephemeral: true });
      } catch (err) {
        console.error('delete error:', err);
        await interaction.reply({ content: 'Fehler beim Löschen des Kanals.', ephemeral: true });
      }
      return;
    }

    // default
    await interaction.reply({ content: 'Unbekannte Aktion.', ephemeral: true });

  } catch (err) {
    console.error('interactionCreate error:', err);
    if (interaction.replied || interaction.deferred) {
      try { await interaction.followUp({ content: 'Beim Ausführen ist ein Fehler aufgetreten.', ephemeral: true }); } catch {}
    } else {
      try { await interaction.reply({ content: 'Beim Ausführen ist ein Fehler aufgetreten.', ephemeral: true }); } catch {}
    }
  }
});

client.login(TOKEN);