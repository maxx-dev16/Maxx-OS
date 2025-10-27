import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  SlashCommandBuilder,
  Collection
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Voice Imports
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus
} from '@discordjs/voice';

// 🔹 Lade Umgebungsvariablen (.env)
dotenv.config();

// 🔹 Lade config.json mit Fehlerbehandlung
let config;
try {
  config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
  console.log('✅ Config loaded successfully');
} catch (error) {
  console.error('❌ Config file error:', error.message);
  console.log('📝 Creating default config...');
  
  config = {
    joinVoiceId: "SET_ME_IN_CONFIG_JSON",
    controlChannelId: "SET_ME_IN_CONFIG_JSON", 
    categoryId: "SET_ME_IN_CONFIG_JSON"
  };
  
  // Erstelle config.json Template
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
  console.log('📁 config.json created. Please fill in your channel IDs!');
  process.exit(1);
}

// 🔹 Discord Client erstellen
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Collections für Commands und Music Player
client.commands = new Collection();
client.musicPlayers = new Collection();

const activeTempTalks = new Map();

// 🔹 MusicPlayer Klasse (MP3 VERSION)
class MusicPlayer {
  constructor(guild, textChannel, voiceChannel) {
    this.guild = guild;
    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;
    this.audioPlayer = createAudioPlayer();
    this.queue = [];
    this.currentTrack = null;
    this.isPlaying = false;
    this.connection = null;
    this.volume = 0.3;
    
    this.setupAudioPlayer();
    this.connectToVoice();
  }

  setupAudioPlayer() {
    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      console.log(`🎵 Playing: ${this.currentTrack?.title}`);
      this.isPlaying = true;
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.isPlaying = false;
      this.playNext();
    });

    this.audioPlayer.on('error', error => {
      console.error('❌ Audio Player Error:', error);
      this.isPlaying = false;
      this.playNext();
    });
  }

  async connectToVoice() {
    try {
      this.connection = joinVoiceChannel({
        channelId: this.voiceChannel.id,
        guildId: this.guild.id,
        adapterCreator: this.guild.voiceAdapterCreator,
        selfDeaf: false
      });

      this.connection.subscribe(this.audioPlayer);

      this.connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`🔊 Connected to ${this.voiceChannel.name}`);
      });

      this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          this.cleanup();
        }
      });

    } catch (error) {
      console.error('❌ Voice connection error:', error);
    }
  }

  // 🔹 MP3 ABSPIELEN - SUPER EINFACH!
  async play(track) {
    try {
      console.log(`🔊 Playing MP3: ${track.filePath}`);

      // Erstelle Resource direkt aus MP3 Datei
      const resource = createAudioResource(track.filePath, {
        inlineVolume: true
      });

      resource.volume.setVolume(this.volume);
      this.audioPlayer.play(resource);
      this.currentTrack = track;
      
      await this.sendNowPlayingEmbed(track);
      
      return true;
    } catch (error) {
      console.error('❌ Play error:', error);
      return false;
    }
  }

  async playNext() {
    if (this.queue.length === 0) {
      this.currentTrack = null;
      this.isPlaying = false;
      await this.sendQueueEndedEmbed();
      return;
    }

    const nextTrack = this.queue.shift();
    const success = await this.play(nextTrack);
    
    if (!success) {
      console.error('❌ Play failed, skipping to next track...');
      await this.playNext();
    }
  }

  // 🔹 SONG-SUCHFUNKTION
  async searchSongs(query) {
    try {
      const musicDir = './music';
      if (!fs.existsSync(musicDir)) {
        fs.mkdirSync(musicDir);
        console.log('📁 Music folder created');
        return [];
      }

      const files = fs.readdirSync(musicDir);
      const mp3Files = files.filter(file => 
        file.toLowerCase().endsWith('.mp3')
      );

      if (mp3Files.length === 0) {
        return [];
      }

      // Suche nach ähnlichen Dateinamen
      const searchTerm = query.toLowerCase();
      const matchedSongs = mp3Files.filter(file => {
        const fileName = path.parse(file).name.toLowerCase();
        return fileName.includes(searchTerm);
      });

      // Falls keine direkte Übereinstimmung, zeige alle Songs
      if (matchedSongs.length === 0) {
        return mp3Files.slice(0, 10); // Zeige max. 10 Songs
      }

      return matchedSongs;
    } catch (error) {
      console.error('❌ Search error:', error);
      return [];
    }
  }

  // 🔹 SONG ZUR QUEUE HINZUFÜGEN
  async addToQueue(songFileName, requestedBy) {
    try {
      const filePath = path.join('./music', songFileName);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Song file not found');
      }

      const trackInfo = {
        title: path.parse(songFileName).name,
        author: 'Local File',
        duration: 'Unknown',
        filePath: filePath,
        requestedBy: requestedBy
      };

      console.log(`✅ Adding to queue: ${trackInfo.title}`);

      this.queue.push(trackInfo);
      await this.sendAddedToQueueEmbed(trackInfo);
      
      if (!this.isPlaying && this.queue.length === 1) {
        await this.playNext();
      }

      return trackInfo;
    } catch (error) {
      console.error('❌ Add to queue error:', error);
      throw error;
    }
  }

  async sendNowPlayingEmbed(track) {
    const embed = new EmbedBuilder()
      .setTitle('🎵 Now Playing')
      .setDescription(`**${track.title}**`)
      .setColor(0x00FF00)
      .addFields(
        { name: '👤 Artist', value: track.author, inline: true },
        { name: '⏱️ Duration', value: track.duration, inline: true },
        { name: '👤 Requested By', value: track.requestedBy, inline: true }
      );

    if (this.textChannel) {
      await this.textChannel.send({ embeds: [embed] });
    }
  }

  async sendAddedToQueueEmbed(track) {
    const position = this.queue.length;
    const embed = new EmbedBuilder()
      .setTitle('📥 Added to Queue')
      .setDescription(`**${track.title}**`)
      .setColor(0x0099FF)
      .addFields(
        { name: '👤 Artist', value: track.author, inline: true },
        { name: '⏱️ Duration', value: track.duration, inline: true },
        { name: '📊 Position', value: `#${position}`, inline: true },
        { name: '👤 Requested By', value: track.requestedBy, inline: true }
      );

    if (this.textChannel) {
      await this.textChannel.send({ embeds: [embed] });
    }
  }

  async sendQueueEndedEmbed() {
    const embed = new EmbedBuilder()
      .setTitle('🏁 Queue Ended')
      .setDescription('The music queue has ended. Add more songs to continue!')
      .setColor(0xFFA500);

    if (this.textChannel) {
      await this.textChannel.send({ embeds: [embed] });
    }
  }

  skip() {
    this.audioPlayer.stop();
  }

  pause() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
      this.audioPlayer.pause();
      return true;
    }
    return false;
  }

  resume() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
      this.audioPlayer.unpause();
      return true;
    }
    return false;
  }

  stop() {
    this.audioPlayer.stop();
    this.queue = [];
    this.currentTrack = null;
    this.isPlaying = false;
  }

  getQueue() {
    return this.queue;
  }

  cleanup() {
    if (this.connection) {
      this.connection.destroy();
    }
    this.audioPlayer.stop();
  }
}

// 🔹 Slash Commands definieren
const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a song from local files')
      .addStringOption(option =>
        option.setName('song')
          .setDescription('Song name to search for')
          .setRequired(true)),
    execute: playCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('search')
      .setDescription('Search for available songs')
      .addStringOption(option =>
        option.setName('query')
          .setDescription('Search term')
          .setRequired(false)),
    execute: searchCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Skip the current song'),
    execute: skipCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Stop the music and clear the queue'),
    execute: stopCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('queue')
      .setDescription('Show the current music queue'),
    execute: queueCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('pause')
      .setDescription('Pause the current song'),
    execute: pauseCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('resume')
      .setDescription('Resume the paused song'),
    execute: resumeCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('listsongs')
      .setDescription('List all available songs'),
    execute: listSongsCommand
  }
];

// 🔹 Command Functions
async function playCommand(interaction) {
  const query = interaction.options.getString('song');
  const voiceChannel = interaction.member.voice.channel;
  
  if (!voiceChannel) {
    return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
  }

  await interaction.deferReply();

  try {
    let musicPlayer = client.musicPlayers.get(interaction.guild.id);
    if (!musicPlayer) {
      musicPlayer = new MusicPlayer(interaction.guild, interaction.channel, voiceChannel);
      client.musicPlayers.set(interaction.guild.id, musicPlayer);
    }

    // Suche nach Songs
    const availableSongs = await musicPlayer.searchSongs(query);
    
    if (availableSongs.length === 0) {
      return interaction.editReply({ 
        content: '❌ No songs found! Use `/listsongs` to see available songs.' 
      });
    }

    // Nimm den ersten gefundenen Song
    const songToPlay = availableSongs[0];
    const trackInfo = await musicPlayer.addToQueue(songToPlay, interaction.user.username);
    
    await interaction.editReply({ 
      content: `🎵 Added **${trackInfo.title}** to the queue!` 
    });

  } catch (error) {
    console.error('Play command error:', error);
    await interaction.editReply({ 
      content: '❌ Failed to play song! Make sure the music folder exists with MP3 files.' 
    });
  }
}

async function searchCommand(interaction) {
  const query = interaction.options.getString('query') || '';
  const voiceChannel = interaction.member.voice.channel;
  
  if (!voiceChannel) {
    return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
  }

  await interaction.deferReply();

  try {
    let musicPlayer = client.musicPlayers.get(interaction.guild.id);
    if (!musicPlayer) {
      musicPlayer = new MusicPlayer(interaction.guild, interaction.channel, voiceChannel);
      client.musicPlayers.set(interaction.guild.id, musicPlayer);
    }

    const availableSongs = await musicPlayer.searchSongs(query);
    
    if (availableSongs.length === 0) {
      return interaction.editReply({ 
        content: '❌ No songs found! Add some MP3 files to the music folder.' 
      });
    }

    const songList = availableSongs.map((song, index) => 
      `**${index + 1}.** ${path.parse(song).name}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🔍 Available Songs')
      .setDescription(songList)
      .setColor(0x0099FF)
      .setFooter({ 
        text: `Found ${availableSongs.length} songs • Use /play "song name" to play` 
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Search command error:', error);
    await interaction.editReply({ 
      content: '❌ Search failed!' 
    });
  }
}

async function listSongsCommand(interaction) {
  try {
    const musicDir = './music';
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir);
      return interaction.reply({ 
        content: '📁 Music folder created! Add some MP3 files to get started.' 
      });
    }

    const files = fs.readdirSync(musicDir);
    const mp3Files = files.filter(file => 
      file.toLowerCase().endsWith('.mp3')
    );

    if (mp3Files.length === 0) {
      return interaction.reply({ 
        content: '❌ No MP3 files found in music folder! Add some songs to get started.' 
      });
    }

    const songList = mp3Files.map((song, index) => 
      `**${index + 1}.** ${path.parse(song).name}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📋 All Available Songs')
      .setDescription(songList)
      .setColor(0x00FF00)
      .setFooter({ 
        text: `Total: ${mp3Files.length} songs • Use /play "song name" to play` 
      });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('List songs error:', error);
    await interaction.reply({ 
      content: '❌ Failed to list songs!' 
    });
  }
}

async function skipCommand(interaction) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  
  if (!musicPlayer) {
    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
  }

  musicPlayer.skip();
  await interaction.reply({ content: '⏭️ Skipped current song!' });
}

async function stopCommand(interaction) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  
  if (!musicPlayer) {
    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
  }

  musicPlayer.stop();
  await interaction.reply({ content: '⏹️ Stopped music and cleared queue!' });
}

async function queueCommand(interaction) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  
  if (!musicPlayer || musicPlayer.getQueue().length === 0) {
    return interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
  }

  const queue = musicPlayer.getQueue();
  const queueList = queue.slice(0, 10).map((track, index) => 
    `**${index + 1}.** ${track.title}`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('📋 Music Queue')
    .setDescription(queueList)
    .setColor(0x0099FF)
    .setFooter({ text: `Total: ${queue.length} songs` });

  await interaction.reply({ embeds: [embed] });
}

async function pauseCommand(interaction) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  
  if (!musicPlayer) {
    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
  }

  const success = musicPlayer.pause();
  if (success) {
    await interaction.reply({ content: '⏸️ Music paused!' });
  } else {
    await interaction.reply({ content: '❌ Music is not playing!', ephemeral: true });
  }
}

async function resumeCommand(interaction) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  
  if (!musicPlayer) {
    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
  }

  const success = musicPlayer.resume();
  if (success) {
    await interaction.reply({ content: '▶️ Music resumed!' });
  } else {
    await interaction.reply({ content: '❌ Music is not paused!', ephemeral: true });
  }
}

// 🔹 Commands zur Collection hinzufügen
commands.forEach(command => {
  client.commands.set(command.data.name, command);
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online als ${client.user.tag}`);
  
  // Erstelle music Ordner falls nicht vorhanden
  if (!fs.existsSync('./music')) {
    fs.mkdirSync('./music');
    console.log('📁 Music folder created');
  }
  
  // Slash Commands registrieren
  try {
    const commandData = commands.map(cmd => cmd.data.toJSON());
    await client.application.commands.set(commandData);
    console.log('✅ Slash Commands registered');
    
    // Debug: Zeige registrierte Commands
    const registeredCommands = await client.application.commands.fetch();
    console.log('📋 Registrierte Commands:', registeredCommands.map(cmd => cmd.name));
    
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
});

// 🔹 TEMPTALK FUNKTIONEN (Rest des Codes bleibt gleich...)
// 🔹 TEMPTALK FUNKTIONEN
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  // Wenn User einem bestimmten VoiceChannel joint → TempTalk erstellen
  if (!oldState.channelId && newState.channelId === config.joinVoiceId) {
    const guild = newState.guild;
    const member = newState.member;
    const category = guild.channels.cache.get(config.categoryId);

    // Temporären Channel erstellen
    const tempChannel = await guild.channels.create({
      name: `🔊 ${member.user.username}'s Raum`,
      type: ChannelType.GuildVoice,
      parent: category?.type === ChannelType.GuildCategory ? category.id : undefined,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.Connect]
        },
        {
          id: member.id,
          allow: [
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.MuteMembers,
            PermissionsBitField.Flags.MoveMembers,
            PermissionsBitField.Flags.ManageChannels
          ]
        }
      ]
    });

    // User in seinen Channel verschieben
    await member.voice.setChannel(tempChannel);

    // Channel speichern
    activeTempTalks.set(tempChannel.id, {
      ownerId: member.id,
      channelId: tempChannel.id,
      controlMessage: null
    });

    // Erweiterte Steuerungs-Embed senden
    const controlChannel = guild.channels.cache.get(config.controlChannelId);
    if (controlChannel) {
      const embed = new EmbedBuilder()
        .setTitle("🎛️ TempTalk Steuerung")
        .setDescription(`Steuerung für ${member.user.username}'s Raum`)
        .setColor("Blurple")
        .addFields(
          { name: "🔊 Voice Channel", value: `<#${tempChannel.id}>`, inline: true },
          { name: "👑 Besitzer", value: `<@${member.id}>`, inline: true },
          { name: "🎵 Musik", value: "Verwende /play um Musik abzuspielen!", inline: true }
        );

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`lock_${tempChannel.id}`)
          .setLabel("🔒 Lock")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`unlock_${tempChannel.id}`)
          .setLabel("🔓 Unlock")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`kick_${tempChannel.id}`)
          .setLabel("🚪 Kick User")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`delete_${tempChannel.id}`)
          .setLabel("🗑️ Delete")
          .setStyle(ButtonStyle.Danger)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`music_${tempChannel.id}`)
          .setLabel("🎵 Music Control")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rename_${tempChannel.id}`)
          .setLabel("✏️ Rename")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`limit_${tempChannel.id}`)
          .setLabel("👥 Limit")
          .setStyle(ButtonStyle.Secondary)
      );

      const message = await controlChannel.send({ 
        content: `🎉 Neuer TempTalk erstellt von ${member.user.username}!`,
        embeds: [embed], 
        components: [row1, row2] 
      });

      // Kontrollnachricht speichern
      activeTempTalks.get(tempChannel.id).controlMessage = message;
    }
  }

  // Wenn User TempTalk verlässt und Channel leer ist → löschen
  if (oldState.channel && activeTempTalks.has(oldState.channel.id)) {
    const channel = oldState.channel;
    if (channel.members.size === 0) {
      const talkData = activeTempTalks.get(channel.id);
      
      // Music Player cleanup
      const musicPlayer = client.musicPlayers.get(channel.guild.id);
      if (musicPlayer && musicPlayer.voiceChannel?.id === channel.id) {
        musicPlayer.cleanup();
        client.musicPlayers.delete(channel.guild.id);
      }
      
      activeTempTalks.delete(channel.id);
      await channel.delete().catch(() => {});
    }
  }
});

// 🔹 BUTTON INTERAKTIONEN
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      await interaction.reply({ content: '❌ There was an error executing this command!', ephemeral: true });
    }
    return;
  }

  if (!interaction.isButton()) return;

  const [action, channelId] = interaction.customId.split("_");
  const talkData = activeTempTalks.get(channelId);

  if (!talkData) {
    return interaction.reply({ content: "❌ Channel nicht gefunden oder bereits gelöscht.", ephemeral: true });
  }

  if (interaction.user.id !== talkData.ownerId) {
    return interaction.reply({ content: "❌ Nur der Ersteller darf diesen Button benutzen.", ephemeral: true });
  }

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel)
    return interaction.reply({ content: "❌ Channel existiert nicht mehr.", ephemeral: true });

  switch (action) {
    case "lock":
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
      await interaction.reply({ content: "🔒 Channel gesperrt!", ephemeral: true });
      break;

    case "unlock":
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
      await interaction.reply({ content: "🔓 Channel geöffnet!", ephemeral: true });
      break;

    case "kick":
      if (channel.members.size === 0)
        return interaction.reply({ content: "🚫 Niemand im Channel.", ephemeral: true });

      const kicked = [];
      for (const [id, member] of channel.members) {
        if (member.id !== talkData.ownerId) {
          await member.voice.disconnect().catch(() => {});
          kicked.push(member.user.username);
        }
      }

      await interaction.reply({
        content: kicked.length ? `🚪 Gekickt: ${kicked.join(", ")}` : "🚫 Keine User zum Kicken.",
        ephemeral: true
      });
      break;

    case "delete":
      await interaction.reply({ content: "🗑️ Channel wird gelöscht...", ephemeral: true });
      
      // Music Player cleanup
      const musicPlayer = client.musicPlayers.get(interaction.guild.id);
      if (musicPlayer && musicPlayer.voiceChannel?.id === channel.id) {
        musicPlayer.cleanup();
        client.musicPlayers.delete(interaction.guild.id);
      }
      
      activeTempTalks.delete(channel.id);
      await channel.delete().catch(() => {});
      break;

    case "music":
      await showMusicControl(interaction, channelId);
      break;

    case "play_music":
      const playMusicPlayer = client.musicPlayers.get(interaction.guild.id);
      if (playMusicPlayer) {
        if (playMusicPlayer.audioPlayer.state.status === AudioPlayerStatus.Paused) {
          playMusicPlayer.resume();
          await interaction.reply({ content: '▶️ Music resumed!', ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ Music is not paused!', ephemeral: true });
        }
      } else {
        await interaction.reply({ content: '❌ No music player found! Use /play first.', ephemeral: true });
      }
      break;

    case "pause_music":
      const pauseMusicPlayer = client.musicPlayers.get(interaction.guild.id);
      if (pauseMusicPlayer) {
        if (pauseMusicPlayer.audioPlayer.state.status === AudioPlayerStatus.Playing) {
          pauseMusicPlayer.pause();
          await interaction.reply({ content: '⏸️ Music paused!', ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ Music is not playing!', ephemeral: true });
        }
      } else {
        await interaction.reply({ content: '❌ No music player found! Use /play first.', ephemeral: true });
      }
      break;

    case "skip_music":
      const skipMusicPlayer = client.musicPlayers.get(interaction.guild.id);
      if (skipMusicPlayer) {
        skipMusicPlayer.skip();
        await interaction.reply({ content: '⏭️ Song skipped!', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ No music player found! Use /play first.', ephemeral: true });
      }
      break;

    case "rename":
      await interaction.showModal({
        customId: `rename_modal_${channelId}`,
        title: "Channel umbenennen",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                customId: "new_name",
                label: "Neuer Channel Name",
                style: 1,
                placeholder: "Mein cooler Channel",
                required: true,
                max_length: 32
              }
            ]
          }
        ]
      });
      break;

    case "limit":
      await interaction.showModal({
        customId: `limit_modal_${channelId}`,
        title: "User Limit setzen",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                customId: "user_limit",
                label: "Maximale User Anzahl (0 = unbegrenzt)",
                style: 1,
                placeholder: "5",
                required: true,
                max_length: 2
              }
            ]
          }
        ]
      });
      break;
  }
});

// 🔹 Musik-Steuerung anzeigen
async function showMusicControl(interaction, channelId) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  const embed = new EmbedBuilder()
    .setTitle("🎵 Musik Steuerung")
    .setColor(0x00FF00);

  if (musicPlayer && musicPlayer.currentTrack) {
    embed.setDescription(`**Jetzt spielt:** ${musicPlayer.currentTrack.title}`)
         .addFields(
           { name: "📊 Warteschlange", value: `${musicPlayer.getQueue().length} Songs`, inline: true },
           { name: "🔊 Status", value: musicPlayer.isPlaying ? "▶️ Playing" : "⏸️ Paused", inline: true }
         );
  } else {
    embed.setDescription("Keine Musik wird aktuell abgespielt.\nVerwende `/play` um Musik hinzuzufügen!");
  }

  const isPlaying = musicPlayer?.audioPlayer.state.status === AudioPlayerStatus.Playing;
  const isPaused = musicPlayer?.audioPlayer.state.status === AudioPlayerStatus.Paused;

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`play_music_${channelId}`)
      .setLabel("▶️ Play")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!musicPlayer || isPlaying),
    new ButtonBuilder()
      .setCustomId(`pause_music_${channelId}`)
      .setLabel("⏸️ Pause")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!musicPlayer || isPaused),
    new ButtonBuilder()
      .setCustomId(`skip_music_${channelId}`)
      .setLabel("⏭️ Skip")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!musicPlayer)
  );

  await interaction.reply({ 
    embeds: [embed], 
    components: [controlRow],
    ephemeral: true 
  });
}

// 🔹 Modal Interaktionen
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  const customId = interaction.customId;
  
  if (customId.startsWith("rename_modal_")) {
    const channelId = customId.replace("rename_modal_", "");
    const newName = interaction.fields.getTextInputValue("new_name");
    
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel) {
      await channel.setName(newName);
      await interaction.reply({ 
        content: `✅ Channel wurde umbenannt zu: **${newName}**`,
        ephemeral: true 
      });
    }
  }
  else if (customId.startsWith("limit_modal_")) {
    const channelId = customId.replace("limit_modal_", "");
    const userLimit = parseInt(interaction.fields.getTextInputValue("user_limit"));
    
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel) {
      await channel.setUserLimit(userLimit);
      const limitText = userLimit === 0 ? "unbegrenzt" : userLimit;
      await interaction.reply({ 
        content: `✅ User Limit wurde auf **${limitText}** gesetzt`,
        ephemeral: true 
      });
    }
  }
});

// 🔹 Login mit Token
client.login(process.env.TOKEN);
