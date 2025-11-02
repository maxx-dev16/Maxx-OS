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
  Collection,
  Partials,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import cron from "node-cron";

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

console.log('🚀 Starting bot initialization...');

// 🔹 MySQL Connection Pool
const pool = mysql.createPool({
  host: 'db.novium.world',
  port: 3306,
  user: 'u113_HmasG0S0s7',
  password: '!oNCB8S72Z+.euzVQgp+88cJ',
  database: 's113_Maxx-OS-Main',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 🔹 Quests und Shop Konfiguration - AKTUALISIERT
const QUESTS_CONFIG = {
  quests_channel: "1434546092309217452",
  shop_channel: "1434546182947995818",
  daily_quests_count: 3,
  possible_quests: [
    {
      id: "chatting",
      description: "Schreibe 20 Nachrichten",
      reward: 30,
      type: "message_count",
      target: 20,
      category: "Chatting"
    },
    {
      id: "voice_quest",
      description: "Verbringe 5min in einem Voice Channel",
      reward: 40,
      type: "voice_time",
      target: 5,
      category: "Voice Quest"
    },
    {
      id: "counting",
      description: "Counte 10 mal in Counting",
      reward: 20,
      type: "counting",
      target: 10,
      category: "Sonstiges"
    },
    {
      id: "reactions",
      description: "Reagiere auf 15 Nachrichten",
      reward: 25,
      type: "reaction",
      target: 15,
      category: "Chatting"
    },
    {
      id: "voice_30min",
      description: "Verbringe 30min in einem Voice Channel",
      reward: 60,
      type: "voice_time",
      target: 30,
      category: "Voice Quest"
    }
  ]
};

const SHOP_CONFIG = {
  categories: {
    farben: [
      {
        name: "Rot",
        price: 150,
        role_id: "ROLE_ID_FÜR_ROT",
        emoji: "🔴",
        description: "Rote Namensfarbe"
      },
      {
        name: "Blau", 
        price: 150,
        role_id: "ROLE_ID_FÜR_BLAU",
        emoji: "🔵",
        description: "Blaue Namensfarbe"
      },
      {
        name: "Grün",
        price: 150, 
        role_id: "ROLE_ID_FÜR_GRÜN",
        emoji: "🟢",
        description: "Grüne Namensfarbe"
      },
      {
        name: "Lila",
        price: 200,
        role_id: "ROLE_ID_FÜR_LILA", 
        emoji: "🟣",
        description: "Lila Namensfarbe"
      }
    ],
    rollen: [
      {
        name: "Premium",
        price: 800,
        role_id: "ROLE_ID_FÜR_PREMIUM",
        emoji: "🌸",
        description: "Erhalte eine Premium Rolle."
      },
      {
        name: "Elite", 
        price: 1000,
        role_id: "ROLE_ID_FÜR_ELITE",
        emoji: "🏅",
        description: "Erhalte eine Elite Rolle."
      },
      {
        name: "VIP",
        price: 1500,
        role_id: "ROLE_ID_FÜR_VIP", 
        emoji: "🏆",
        description: "Erhalte eine VIP Rolle."
      }
    ],
    icons: [
      {
        name: "Stern Icon",
        price: 300,
        role_id: "ROLE_ID_FÜR_STERN",
        emoji: "⭐",
        description: "Stern Icon neben deinem Namen"
      },
      {
        name: "Feuer Icon",
        price: 350,
        role_id: "ROLE_ID_FÜR_FEUER",
        emoji: "🔥",
        description: "Feuer Icon neben deinem Namen"
      }
    ]
  }
};

// 🔹 Logging Konfiguration
const LOG_CHANNEL_ID = "1434572776999485603";
const MAX_LOG_MESSAGES = 500;

// Test DB Connection und erstelle Tabellen falls nicht vorhanden
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS temptalks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        channel_id VARCHAR(255) NOT NULL UNIQUE,
        owner_id VARCHAR(255) NOT NULL,
        guild_id VARCHAR(255) NOT NULL,
        control_message_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ temptalks table checked/created');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_tag VARCHAR(255) NOT NULL,
        problem TEXT NOT NULL,
        datum DATE NOT NULL,
        uStunde TIME NOT NULL,
        status ENUM('offen', 'geschlossen') DEFAULT 'offen',
        channel_id VARCHAR(255),
        thread_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ tickets table checked/created');

    // Quests Tabellen
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_quests (
        user_id VARCHAR(255) PRIMARY KEY,
        daily_quests TEXT,
        completed_quests TEXT,
        claimed_rewards TEXT,
        last_reset_date DATE,
        total_coins INT DEFAULT 0,
        voice_time INT DEFAULT 0,
        message_count INT DEFAULT 0,
        reaction_count INT DEFAULT 0,
        counting INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ user_quests table checked/created');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        item_type ENUM('farbe', 'rolle', 'icon') NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        role_id VARCHAR(255),
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX user_idx (user_id)
      )
    `);
    console.log('✅ user_inventory table checked/created');
    
    connection.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}

initializeDatabase();

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
    categoryId: "SET_ME_IN_CONFIG_JSON",
    ticketChannelId: "1434502097537204304",
    staffRoleId: "1414700262941130927"
  };
  
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
  console.log('📝 config.json created. Please fill in your channel IDs!');
  process.exit(1);
}

// 🔹 Discord Client erstellen - MIT KORRIGIERTEN INTENTS
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildIntegrations
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction
  ]
});

console.log('✅ Client created with all necessary intents');

// Collections für Commands und Music Player
client.commands = new Collection();
client.musicPlayers = new Collection();

const activeTempTalks = new Map();
const ticketSessions = new Map();
const userVoiceSessions = new Map();
const channelMessages = new Map();

// 🔹 Logging System
async function logAction(action, description, color = 0x3498DB, user = null) {
  try {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) {
      console.error('❌ Log channel not found!');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📝 ${action}`)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (user) {
      embed.setAuthor({
        name: user.tag || user.username || 'Unknown User',
        iconURL: user.displayAvatarURL?.() || null
      });
    }

    await logChannel.send({ embeds: [embed] });
    console.log(`📝 LOG: ${action} - ${description}`);

    // Prüfe ob zu viele Nachrichten im Log-Channel sind
    await cleanupLogChannel();
  } catch (error) {
    console.error('❌ Error logging action:', error);
  }
}

// 🔹 Automatische Bereinigung des Log-Channels
async function cleanupLogChannel() {
  try {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const messages = await logChannel.messages.fetch({ limit: 100 });
    
    if (messages.size > MAX_LOG_MESSAGES) {
      const messagesToDelete = Array.from(messages.values()).slice(MAX_LOG_MESSAGES);
      
      for (const message of messagesToDelete) {
        await message.delete().catch(() => {});
      }
      
      console.log(`🧹 Cleaned ${messagesToDelete.length} old log messages`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up log channel:', error);
  }
}

// 🔹 Quests System Funktionen
function generateDailyQuests() {
  const allQuests = QUESTS_CONFIG.possible_quests;
  const shuffled = [...allQuests].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, QUESTS_CONFIG.daily_quests_count);
}

async function getUserQuestData(userId) {
  try {
    const [rows] = await pool.query('SELECT * FROM user_quests WHERE user_id = ?', [userId]);
    const today = new Date().toISOString().split('T')[0];
    
    if (rows.length === 0) {
      // Neuer User
      const dailyQuests = generateDailyQuests();
      const userData = {
        user_id: userId,
        daily_quests: JSON.stringify(dailyQuests),
        completed_quests: JSON.stringify([]),
        claimed_rewards: JSON.stringify([]),
        last_reset_date: today,
        total_coins: 0,
        voice_time: 0,
        message_count: 0,
        reaction_count: 0,
        counting: 0
      };
      
      await pool.query(
        'INSERT INTO user_quests (user_id, daily_quests, completed_quests, claimed_rewards, last_reset_date, total_coins) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, userData.daily_quests, userData.completed_quests, userData.claimed_rewards, today, 0]
      );
      
      return {
        ...userData,
        daily_quests: dailyQuests,
        completed_quests: [],
        claimed_rewards: []
      };
    }
    
    const userData = rows[0];
    
    // Tägliches Reset prüfen
    if (userData.last_reset_date !== today) {
      const dailyQuests = generateDailyQuests();
      await pool.query(
        'UPDATE user_quests SET daily_quests = ?, completed_quests = ?, last_reset_date = ?, voice_time = 0, message_count = 0, reaction_count = 0, counting = 0 WHERE user_id = ?',
        [JSON.stringify(dailyQuests), JSON.stringify([]), today, userId]
      );
      
      return {
        ...userData,
        daily_quests: dailyQuests,
        completed_quests: [],
        voice_time: 0,
        message_count: 0,
        reaction_count: 0,
        counting: 0
      };
    }
    
    return {
      ...userData,
      daily_quests: JSON.parse(userData.daily_quests || '[]'),
      completed_quests: JSON.parse(userData.completed_quests || '[]'),
      claimed_rewards: JSON.parse(userData.claimed_rewards || '[]')
    };
  } catch (error) {
    console.error('Error getting user quest data:', error);
    return null;
  }
}

async function updateUserQuestData(userId, data) {
  try {
    await pool.query(
      'UPDATE user_quests SET daily_quests = ?, completed_quests = ?, claimed_rewards = ?, last_reset_date = ?, total_coins = ?, voice_time = ?, message_count = ?, reaction_count = ?, counting = ? WHERE user_id = ?',
      [
        JSON.stringify(data.daily_quests),
        JSON.stringify(data.completed_quests),
        JSON.stringify(data.claimed_rewards),
        data.last_reset_date,
        data.total_coins,
        data.voice_time || 0,
        data.message_count || 0,
        data.reaction_count || 0,
        data.counting || 0,
        userId
      ]
    );
  } catch (error) {
    console.error('Error updating user quest data:', error);
  }
}

async function checkAndCompleteQuests(userId, questData) {
  const userData = await getUserQuestData(userId);
  if (!userData) return;

  let updated = false;
  let completedQuests = [];

  for (const quest of userData.daily_quests) {
    if (userData.completed_quests.includes(quest.id)) continue;

    let completed = false;

    switch (quest.type) {
      case 'message_count':
        if (userData.message_count >= quest.target) {
          completed = true;
        }
        break;
      case 'voice_time':
        if (userData.voice_time >= quest.target) {
          completed = true;
        }
        break;
      case 'counting':
        if (userData.counting >= quest.target) {
          completed = true;
        }
        break;
      case 'reaction':
        if (userData.reaction_count >= quest.target) {
          completed = true;
        }
        break;
    }

    if (completed) {
      userData.completed_quests.push(quest.id);
      userData.total_coins += quest.reward;
      completedQuests.push(quest);
      updated = true;
    }
  }

  if (updated) {
    await updateUserQuestData(userId, userData);
    
    // Benachrichtigung senden
    try {
      const user = await client.users.fetch(userId);
      if (completedQuests.length > 0) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 Quest abgeschlossen!')
          .setColor(0x00FF00)
          .setDescription(`Du hast ${completedQuests.length} Quest(s) abgeschlossen und **${completedQuests.reduce((sum, q) => sum + q.reward, 0)} Coins** erhalten!`);
        
        for (const quest of completedQuests) {
          embed.addFields({
            name: quest.description,
            value: `+${quest.reward} Coins`
          });
        }
        
        await user.send({ embeds: [embed] });
        
        // Log Quest completion
        await logAction(
          'Quest Abgeschlossen', 
          `${user.tag} hat ${completedQuests.length} Quest(s) abgeschlossen und ${completedQuests.reduce((sum, q) => sum + q.reward, 0)} Coins erhalten`,
          0x00FF00,
          user
        );
      }
    } catch (error) {
      console.error('Error sending quest completion message:', error);
    }
  }
}

// 🔹 Nachrichten-Management für Quests und Shop
async function updateChannelMessage(channelId, embed, components = []) {
  try {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
      console.error(`❌ Channel ${channelId} nicht gefunden!`);
      return;
    }

    // Alte Nachrichten im Channel löschen (außer Systemnachrichten)
    const messages = await channel.messages.fetch({ limit: 50 });
    for (const [id, message] of messages) {
      // Lösche nur Bot-Nachrichten, die Shop/Quests betreffen
      if (message.author.bot && (message.embeds.length > 0 || message.components.length > 0)) {
        await message.delete().catch(() => {});
      }
    }

    // Warte kurz bevor neue Nachricht gesendet wird
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Neue Nachricht senden
    const newMessage = await channel.send({ 
      embeds: [embed], 
      components: components.length > 0 ? [components] : [] 
    });
    
    channelMessages.set(channelId, newMessage.id);
    console.log(`✅ Nachricht in Channel ${channel.name} aktualisiert`);
    
    // Log channel update
    await logAction(
      'Channel Nachricht Aktualisiert',
      `Nachricht in ${channel.name} wurde aktualisiert`,
      0x9B59B6
    );
    
    return newMessage;
  } catch (error) {
    console.error(`Error updating channel message ${channelId}:`, error);
  }
}

async function createQuestsMessage() {
  const embed = new EmbedBuilder()
    .setTitle('## 🎯 Quests')
    .setDescription('**Hier siehst du die Aufgaben für Heute.**')
    .setColor(0x00AE86)
    .setThumbnail('https://cdn.discordapp.com/emojis/1128724402557988874.png?size=96');

  // Quests nach Kategorien gruppieren
  const questsByCategory = {};
  QUESTS_CONFIG.possible_quests.forEach(quest => {
    if (!questsByCategory[quest.category]) {
      questsByCategory[quest.category] = [];
    }
    questsByCategory[quest.category].push(quest);
  });

  // Kategorien in gewünschter Reihenfolge
  const categoryOrder = ['Chatting', 'Voice Quest', 'Sonstiges'];
  
  for (const category of categoryOrder) {
    if (questsByCategory[category]) {
      let categoryText = '';
      questsByCategory[category].forEach(quest => {
        categoryText += `**${quest.description}**\n- **${quest.reward} Coins**\n\n`;
      });
      
      embed.addFields({
        name: `## 📝 ${category}`,
        value: categoryText,
        inline: false
      });
    }
  }

  // Fortschritt Button
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('check_quests')
      .setLabel('🎯 Meine Quests anzeigen')
      .setStyle(ButtonStyle.Primary)
  );

  await updateChannelMessage(QUESTS_CONFIG.quests_channel, embed, row);
}

async function createShopMessage() {
  const embed = new EmbedBuilder()
    .setTitle('## 🛒 Laden')
    .setDescription('**Hier kannst du dir von Maxxcloud Coins Items kaufen!**')
    .setColor(0x9B59B6)
    .setThumbnail('https://cdn.discordapp.com/emojis/1128724404329197658.png?size=96');

  // Kategorien in gewünschter Reihenfolge
  embed.addFields({
    name: '## 📁 Kategorien',
    value: '• **Farben** - Kaufe dir Farben, um deinen Namen schöner zu gestalten.\n• **Icons** - Rüste dich mit Icons aus, um deinen Namen zu personalisieren.\n• **Rollen** - Kaufe dir Rollen, um höher gelistet zu werden.',
    inline: false
  });

  // Farben Kategorie
  let colorsText = '';
  SHOP_CONFIG.categories.farben.forEach(color => {
    colorsText += `${color.emoji} **${color.name}** - ${color.price} Coins\n`;
  });

  embed.addFields({
    name: '## 🎨 Farben',
    value: colorsText,
    inline: true
  });

  // Rollen Kategorie
  let rolesText = '';
  SHOP_CONFIG.categories.rollen.forEach(role => {
    rolesText += `${role.emoji} **${role.name}** - ${role.price} Coins\n`;
  });

  embed.addFields({
    name: '## 👑 Rollen',
    value: rolesText,
    inline: true
  });

  // Icons Kategorie
  let iconsText = '';
  SHOP_CONFIG.categories.icons.forEach(icon => {
    iconsText += `${icon.emoji} **${icon.name}** - ${icon.price} Coins\n`;
  });

  embed.addFields({
    name: '## ⭐ Icons',
    value: iconsText,
    inline: false
  });

  // Kontostand und Inventar Info
  embed.addFields({
    name: '## 💼 Konto & Inventar',
    value: '• **Konto** - Sieh dir deinen aktuellen Kontostand an\n• **Inventar** - Sieh dir deine gekauften Items an und nutze sie',
    inline: false
  });

  // Shop Buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('shop_buy')
      .setLabel('🛒 Items kaufen')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('shop_inventory')
      .setLabel('💼 Mein Inventar')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('shop_balance')
      .setLabel('💰 Kontostand')
      .setStyle(ButtonStyle.Secondary)
  );

  await updateChannelMessage(QUESTS_CONFIG.shop_channel, embed, row);
}

// 🔹 Tägliches Reset der Quests
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Resetting daily quests and updating messages...');
  
  const today = new Date().toISOString().split('T')[0];
  const [users] = await pool.query('SELECT user_id FROM user_quests');
  
  for (const user of users) {
    const dailyQuests = generateDailyQuests();
    await pool.query(
      'UPDATE user_quests SET daily_quests = ?, completed_quests = ?, last_reset_date = ?, voice_time = 0, message_count = 0, reaction_count = 0, counting = 0 WHERE user_id = ?',
      [JSON.stringify(dailyQuests), JSON.stringify([]), today, user.user_id]
    );
  }
  
  // Nachrichten aktualisieren
  await createQuestsMessage();
  
  // Log daily reset
  await logAction(
    'Daily Quests Reset',
    `Tägliche Quests wurden für ${users.length} User zurückgesetzt`,
    0xFFA500
  );
  
  // Benachrichtigung im Quests-Channel
  const channel = client.channels.cache.get(QUESTS_CONFIG.quests_channel);
  if (channel) {
    const embed = new EmbedBuilder()
      .setTitle('🔄 Neue Daily Quests verfügbar!')
      .setDescription('Die täglichen Quests wurden aktualisiert!')
      .setColor(0x00FF00);
    
    const notification = await channel.send({ embeds: [embed] });
    setTimeout(() => notification.delete().catch(() => {}), 10000);
  }
});

// 🔹 TempTalk Auto-Cleanup (alle 30 Sekunden prüfen)
setInterval(async () => {
  for (const [channelId, talkData] of activeTempTalks.entries()) {
    try {
      const voiceChannel = client.channels.cache.get(channelId);
      if (!voiceChannel) {
        // Channel existiert nicht mehr
        await cleanupTempTalk(channelId, talkData);
        continue;
      }

      // Prüfe ob Channel leer ist
      if (voiceChannel.members.size === 0) {
        console.log(`🗑️ Auto-deleting empty TempTalk: ${voiceChannel.name}`);
        await cleanupTempTalk(channelId, talkData);
      }
    } catch (error) {
      console.error('Error in TempTalk cleanup:', error);
    }
  }
}, 30000); // Alle 30 Sekunden

// 🔹 Cleanup Funktion für TempTalks
async function cleanupTempTalk(channelId, talkData) {
  try {
    // Lösche Control Message
    if (talkData.controlMessage) {
      await talkData.controlMessage.delete().catch(() => {});
    }

    // Lösche aus DB
    await pool.query('DELETE FROM temptalks WHERE channel_id = ?', [channelId]);

    // Music Player cleanup
    const guild = client.guilds.cache.find(g => g.channels.cache.has(channelId));
    if (guild) {
      const musicPlayer = client.musicPlayers.get(guild.id);
      if (musicPlayer && musicPlayer.voiceChannel?.id === channelId) {
        musicPlayer.cleanup();
        client.musicPlayers.delete(guild.id);
      }
    }

    // Lösche Channel
    const voiceChannelToDelete = client.channels.cache.get(channelId);
    if (voiceChannelToDelete) {
      await voiceChannelToDelete.delete().catch(() => {});
    }

    activeTempTalks.delete(channelId);
    console.log(`✅ TempTalk ${channelId} cleaned up`);
    
    // Log TempTalk cleanup
    await logAction(
      'TempTalk Gelöscht',
      `TempTalk Channel wurde gelöscht (${channelId})`,
      0xFF0000
    );
  } catch (error) {
    console.error('Error in cleanupTempTalk:', error);
  }
}

// 🔹 DM TICKET SYSTEM - MIT BIDIREKTIONALER KOMMUNIKATION
client.on(Events.MessageCreate, async (message) => {
  // Ignoriere Nachrichten von Bots
  if (message.author.bot) return;

  console.log(`📨 Message received from ${message.author.tag}: "${message.content}"`);
  console.log(`   Channel Type: ${message.channel.type}`);
  console.log(`   Guild: ${message.guild ? message.guild.name : 'DM'}`);

  // 🔹 Quest Tracking: Nachrichten zählen
  if (message.guild) {
    const userData = await getUserQuestData(message.author.id);
    if (userData) {
      userData.message_count = (userData.message_count || 0) + 1;
      await updateUserQuestData(message.author.id, userData);
      await checkAndCompleteQuests(message.author.id);
    }
  }

  // Prüfe ob es eine DM ist
  if (message.channel.type === ChannelType.DM) {
    console.log(`💌 DM DETECTED from ${message.author.tag}!`);
    
    const userId = message.author.id;
    const userTag = message.author.tag;
    const content = message.content.trim();

    try {
      // Prüfe ob User bereits eine Ticket-Session hat
      const session = ticketSessions.get(userId);

      if (!session) {
        // Prüfe ob der User ein offenes Ticket hat und sendet eine DM-Nachricht
        const [tickets] = await pool.query(
          'SELECT * FROM tickets WHERE user_id = ? AND status = "offen" ORDER BY created_at DESC LIMIT 1',
          [userId]
        );

        if (tickets.length > 0) {
          const ticket = tickets[0];
          console.log(`📝 User ${userTag} has open ticket #${ticket.id}, forwarding message to thread`);
          
          // Sende die DM-Nachricht in den Ticket-Thread
          if (ticket.thread_id) {
            try {
              const thread = await client.channels.fetch(ticket.thread_id);
              if (thread) {
                const userMessageEmbed = new EmbedBuilder()
                  .setTitle('💬 Nachricht vom User')
                  .setDescription(content)
                  .setColor(0x0099FF)
                  .setAuthor({ 
                    name: userTag, 
                    iconURL: message.author.displayAvatarURL() 
                  })
                  .setFooter({ text: `Ticket #${ticket.id} • User DM` })
                  .setTimestamp();

                await thread.send({ embeds: [userMessageEmbed] });
                console.log(`✅ User message forwarded to thread for ticket #${ticket.id}`);
                
                // Log DM message forwarded
                await logAction(
                  'DM Nachricht Weitergeleitet',
                  `Nachricht von ${userTag} an Ticket #${ticket.id} weitergeleitet`,
                  0x0099FF,
                  message.author
                );
                
                // Bestätigung an User senden
                await message.author.send('✅ Deine Nachricht wurde an das Support-Team weitergeleitet!');
                return;
              }
            } catch (threadError) {
              console.error('❌ Error accessing thread:', threadError);
            }
          }
        }

        // START NEW TICKET SESSION (nur wenn kein offenes Ticket existiert)
        console.log(`🎫 Starting new ticket session for ${userTag}`);
        
        const welcomeEmbed = new EmbedBuilder()
          .setTitle('🎫 Support Ticket System')
          .setDescription('**Hallo! Möchtest du ein Support-Ticket erstellen?**\n\nUnser Team wird sich dann um dein Anliegen kümmern!')
          .setColor(0x0099FF)
          .addFields(
            { name: '✅ Ja, Ticket erstellen', value: 'Antworte mit: `ja` oder `ticket`' },
            { name: '❌ Nein, abbrechen', value: 'Antworte mit: `nein` oder `abbrechen`' }
          )
          .setFooter({ text: 'Du kannst jederzeit ein Ticket erstellen!' });

        await message.author.send({ embeds: [welcomeEmbed] });
        console.log(`✅ Welcome message sent to ${userTag}`);
        
        // Log ticket session start
        await logAction(
          'Ticket Session Gestartet',
          `${userTag} hat eine Ticket-Session gestartet`,
          0x0099FF,
          message.author
        );
        
        ticketSessions.set(userId, { 
          stage: 'awaiting_decision', 
          userTag: userTag,
          startedAt: Date.now()
        });
        
      } else if (session.stage === 'awaiting_decision') {
        const response = content.toLowerCase();
        console.log(`🤔 User decision: ${response}`);
        
        if (response === 'ja' || response === 'yes' || response === 'j' || response === 'ticket') {
          console.log(`✅ ${userTag} wants to create a ticket`);
          
          const questionEmbed = new EmbedBuilder()
            .setTitle('📝 Problembeschreibung')
            .setDescription('**Bitte beschreibe jetzt dein Problem oder Anliegen:**')
            .setColor(0xFFA500)
            .setFooter({ text: 'Du kannst "abbrechen" schreiben um abzubrechen.' });

          await message.author.send({ embeds: [questionEmbed] });
          ticketSessions.set(userId, { 
            stage: 'awaiting_problem', 
            userTag: userTag,
            startedAt: Date.now()
          });
          
          // Log ticket creation confirmed
          await logAction(
            'Ticket Erstellung Bestätigt',
            `${userTag} möchte ein Ticket erstellen`,
            0xFFA500,
            message.author
          );
        } else if (response === 'nein' || response === 'no' || response === 'n' || response === 'abbrechen') {
          console.log(`❌ ${userTag} cancelled ticket creation`);
          
          const cancelEmbed = new EmbedBuilder()
            .setTitle('❌ Abgebrochen')
            .setDescription('Ticket-Erstellung wurde abgebrochen. Wenn du später Hilfe benötigst, schreibe mir einfach wieder!')
            .setColor(0xFF0000);

          await message.author.send({ embeds: [cancelEmbed] });
          ticketSessions.delete(userId);
          
          // Log ticket creation cancelled
          await logAction(
            'Ticket Erstellung Abgebrochen',
            `${userTag} hat die Ticket-Erstellung abgebrochen`,
            0xFF0000,
            message.author
          );
        } else {
          // Ungültige Antwort
          await message.author.send('❌ Bitte antworte mit **"ja"** um ein Ticket zu erstellen oder **"nein"** um abzubrechen.');
        }
      } else if (session.stage === 'awaiting_problem') {
        if (content.toLowerCase() === 'abbrechen') {
          console.log(`❌ ${userTag} cancelled during problem description`);
          
          const cancelEmbed = new EmbedBuilder()
            .setTitle('❌ Abgebrochen')
            .setDescription('Ticket-Erstellung wurde abgebrochen.')
            .setColor(0xFF0000);

          await message.author.send({ embeds: [cancelEmbed] });
          ticketSessions.delete(userId);
          
          // Log ticket creation cancelled during problem description
          await logAction(
            'Ticket Erstellung Abgebrochen',
            `${userTag} hat die Ticket-Erstellung während der Problembeschreibung abgebrochen`,
            0xFF0000,
            message.author
          );
          return;
        }

        if (content.length < 5) {
          await message.author.send('❌ Bitte gib eine ausführlichere Beschreibung deines Problems ein (mindestens 5 Zeichen).');
          return;
        }

        console.log(`📝 ${userTag} described problem: ${content.substring(0, 100)}...`);

        // Ticket in Datenbank speichern
        const currentDate = new Date().toISOString().split('T')[0];
        const currentTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;

        try {
          const [result] = await pool.query(
            'INSERT INTO tickets (user_id, user_tag, problem, datum, uStunde) VALUES (?, ?, ?, ?, ?)',
            [userId, userTag, content, currentDate, currentTime]
          );

          const ticketId = result.insertId;
          console.log(`✅ Ticket #${ticketId} saved to database for ${userTag}`);

          // Ticket im Ticket-Channel erstellen
          const ticketChannel = client.channels.cache.get(config.ticketChannelId);
          if (ticketChannel) {
            console.log(`📢 Sending ticket to channel: ${ticketChannel.name}`);
            
            const ticketEmbed = new EmbedBuilder()
              .setTitle(`🎫 Ticket #${ticketId}`)
              .setColor(0x00FF00)
              .addFields(
                { name: '👤 User', value: `${userTag} (<@${userId}>)`, inline: true },
                { name: '📅 Datum', value: currentDate, inline: true },
                { name: '⏰ Uhrzeit', value: currentTime, inline: true },
                { name: '📝 Problem', value: content.length > 1024 ? content.substring(0, 1020) + '...' : content }
              )
              .setFooter({ text: `Ticket ID: ${ticketId}` })
              .setTimestamp();

            // NUR NOCH EINEN BUTTON IM TICKET-CHANNEL
            const ticketButtons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`view_ticket_${ticketId}`)
                .setLabel('📋 Zum Ticket-Thread')
                .setStyle(ButtonStyle.Primary)
            );

            const ticketMessage = await ticketChannel.send({
              content: `<@&${config.staffRoleId}> **NEUES TICKET!** <@${userId}> hat ein Support-Ticket erstellt!`,
              embeds: [ticketEmbed],
              components: [ticketButtons]
            });

            console.log(`✅ Ticket message sent with ID: ${ticketMessage.id}`);

            // Thread erstellen
            try {
              const thread = await ticketMessage.startThread({
                name: `ticket-${ticketId}-${userTag.substring(0, 20)}`.replace(/[^a-zA-Z0-9-_]/g, ''),
                autoArchiveDuration: 1440,
                reason: `Support Ticket für ${userTag}`
              });

              console.log(`✅ Thread created: ${thread.name}`);

              // Thread ID in Datenbank speichern
              await pool.query(
                'UPDATE tickets SET thread_id = ? WHERE id = ?',
                [thread.id, ticketId]
              );

              const threadEmbed = new EmbedBuilder()
                .setTitle('🎫 Support Ticket')
                .setDescription(`**User:** ${userTag} (<@${userId}>)\n**Problem:** ${content}`)
                .setColor(0x0099FF)
                .setFooter({ text: `Ticket #${ticketId} - Erstellt am ${currentDate} um ${currentTime}` });

              await thread.send({ embeds: [threadEmbed] });
              
              // BUTTONS NUR IM THREAD FÜR DAS TEAM
              const threadButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`close_ticket_${ticketId}`)
                  .setLabel('🔒 Ticket schließen')
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`claim_ticket_${ticketId}`)
                  .setLabel('🎯 Ticket übernehmen')
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId(`reply_ticket_${ticketId}`)
                  .setLabel('💬 Antworten')
                  .setStyle(ButtonStyle.Primary)
              );

              await thread.send({ 
                content: `**Support-Team:** Bitte kümmert euch um dieses Ticket!`,
                components: [threadButtons]
              });

            } catch (threadError) {
              console.error('❌ Error creating thread:', threadError);
            }

            // Bestätigung an User senden
            const successEmbed = new EmbedBuilder()
              .setTitle('✅ Ticket erfolgreich erstellt!')
              .setDescription(`Dein Ticket wurde erfolgreich erstellt und unser Support-Team wurde benachrichtigt!`)
              .addFields(
                { name: '🎫 Ticket ID', value: `#${ticketId}`, inline: true },
                { name: '📅 Erstellt am', value: currentDate, inline: true },
                { name: '⏰ Uhrzeit', value: currentTime, inline: true },
                { name: '📋 Status', value: '🟢 Offen - Das Team wurde benachrichtigt' },
                { name: '💬 Nächste Schritte', value: 'Unser Support-Team wird sich so schnell wie möglich bei dir melden. Du kannst jederzeit auf diese Nachricht antworten um weitere Informationen zu senden!' }
              )
              .setColor(0x00FF00)
              .setFooter({ text: 'Du wirst Updates in diesem Chat erhalten.' });

            await message.author.send({ embeds: [successEmbed] });
            console.log(`✅ Success message sent to ${userTag}`);
            
            // Log ticket creation
            await logAction(
              'Ticket Erstellt',
              `Neues Ticket #${ticketId} von ${userTag} erstellt`,
              0x00FF00,
              message.author
            );
            
          } else {
            console.error(`❌ Ticket channel ${config.ticketChannelId} not found!`);
            await message.author.send('❌ Fehler: Ticket-Channel nicht gefunden. Bitte kontaktiere einen Administrator.');
          }

          // Session beenden
          ticketSessions.delete(userId);
          console.log(`✅ Ticket session completed for ${userTag}`);

        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          await message.author.send('❌ Ein Datenbank-Fehler ist aufgetreten. Bitte versuche es später erneut.');
          ticketSessions.delete(userId);
        }
      }
    } catch (error) {
      console.error('❌ DM Ticket Error:', error);
      try {
        await message.author.send('❌ Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut oder kontaktiere einen Administrator.');
      } catch (dmError) {
        console.error('❌ Could not send DM error message:', dmError);
      }
      ticketSessions.delete(userId);
    }
  }
});

// 🔹 Session Cleanup (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [userId, session] of ticketSessions.entries()) {
    if (session.startedAt && (now - session.startedAt > 15 * 60 * 1000)) {
      ticketSessions.delete(userId);
      cleanedCount++;
      console.log(`🧹 Cleaned expired session for user ${userId}`);
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned ${cleanedCount} expired ticket sessions`);
  }
}, 15 * 60 * 1000);

// 🔹 Voice Time Tracking für Quests
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const userId = newState.member?.id || oldState.member?.id;
  if (!userId) return;

  // User betritt Voice Channel
  if (!oldState.channelId && newState.channelId) {
    userVoiceSessions.set(userId, {
      startTime: Date.now(),
      channelId: newState.channelId
    });
    
    // Log voice channel join
    await logAction(
      'Voice Channel Betreten',
      `${newState.member.user.tag} hat den Voice Channel ${newState.channel.name} betreten`,
      0x3498DB,
      newState.member.user
    );
  }
  
  // User verlässt Voice Channel
  if (oldState.channelId && !newState.channelId) {
    const session = userVoiceSessions.get(userId);
    if (session) {
      const timeSpent = Math.floor((Date.now() - session.startTime) / 60000); // in Minuten
      userVoiceSessions.delete(userId);
      
      // Voice Time für Quests aktualisieren
      const userData = await getUserQuestData(userId);
      if (userData) {
        userData.voice_time = (userData.voice_time || 0) + timeSpent;
        await updateUserQuestData(userId, userData);
        await checkAndCompleteQuests(userId);
      }
      
      // Log voice channel leave
      await logAction(
        'Voice Channel Verlassen',
        `${oldState.member.user.tag} hat den Voice Channel ${oldState.channel.name} nach ${timeSpent} Minuten verlassen`,
        0xE74C3C,
        oldState.member.user
      );
    }
  }
});

// 🔹 MusicPlayer Klasse
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
    
    // Log music player creation
    logAction(
      'Music Player Erstellt',
      `Music Player in ${voiceChannel.name} gestartet`,
      0x9B59B6
    );
  }

  setupAudioPlayer() {
    this.audioPlayer.on(AudioPlayerStatus.Playing, () => {
      console.log(`🎵 Playing: ${this.currentTrack?.title}`);
      this.isPlaying = true;
      
      // Log music start
      logAction(
        'Musik Gestartet',
        `Spielt: ${this.currentTrack?.title} in ${this.voiceChannel.name}`,
        0x2ECC71
      );
    });

    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.isPlaying = false;
      this.playNext();
    });

    this.audioPlayer.on('error', error => {
      console.error('❌ Audio Player Error:', error);
      this.isPlaying = false;
      
      // Log music error
      logAction(
        'Musik Fehler',
        `Fehler beim Abspielen: ${error.message}`,
        0xE74C3C
      );
      
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

  async play(track) {
    try {
      console.log(`🔊 Playing MP3: ${track.filePath}`);

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

  async searchSongs(query) {
    try {
      const musicDir = './music';
      if (!fs.existsSync(musicDir)) {
        fs.mkdirSync(musicDir);
        console.log('📁 Music folder created');
        return [];
      }

      const musicFiles = fs.readdirSync(musicDir);
      const mp3Files = musicFiles.filter(file => 
        file.toLowerCase().endsWith('.mp3')
      );

      if (mp3Files.length === 0) {
        return [];
      }

      const searchTerm = query.toLowerCase();
      const matchedSongs = mp3Files.filter(file => {
        const fileName = path.parse(file).name.toLowerCase();
        return fileName.includes(searchTerm);
      });

      if (matchedSongs.length === 0) {
        return mp3Files.slice(0, 10);
      }

      return matchedSongs;
    } catch (error) {
      console.error('❌ Search error:', error);
      return [];
    }
  }

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
      .setTitle('🔥 Added to Queue')
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
    
    // Log music skip
    logAction(
      'Musik Übersprungen',
      `Aktueller Song übersprungen in ${this.voiceChannel.name}`,
      0xF39C12
    );
  }

  pause() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
      this.audioPlayer.pause();
      
      // Log music pause
      logAction(
        'Musik Pausiert',
        `Musik pausiert in ${this.voiceChannel.name}`,
        0xF39C12
      );
      
      return true;
    }
    return false;
  }

  resume() {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
      this.audioPlayer.unpause();
      
      // Log music resume
      logAction(
        'Musik Fortgesetzt',
        `Musik fortgesetzt in ${this.voiceChannel.name}`,
        0x2ECC71
      );
      
      return true;
    }
    return false;
  }

  stop() {
    this.audioPlayer.stop();
    this.queue = [];
    this.currentTrack = null;
    this.isPlaying = false;
    
    // Log music stop
    logAction(
      'Musik Gestoppt',
      `Musik gestoppt und Queue geleert in ${this.voiceChannel.name}`,
      0xE74C3C
    );
  }

  getQueue() {
    return this.queue;
  }

  cleanup() {
    if (this.connection) {
      this.connection.destroy();
    }
    this.audioPlayer.stop();
    
    // Log music player cleanup
    logAction(
      'Music Player Bereinigt',
      `Music Player in ${this.voiceChannel.name} bereinigt`,
      0xE74C3C
    );
  }
}

// 🔹 Command Functions
async function playCommand(interaction) {
  const query = interaction.options.getString('song');
  const userVoiceChannel = interaction.member.voice.channel;
  
  if (!userVoiceChannel) {
    return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
  }

  await interaction.deferReply();

  try {
    let musicPlayer = client.musicPlayers.get(interaction.guild.id);
    if (!musicPlayer) {
      musicPlayer = new MusicPlayer(interaction.guild, interaction.channel, userVoiceChannel);
      client.musicPlayers.set(interaction.guild.id, musicPlayer);
    }

    const availableSongs = await musicPlayer.searchSongs(query);
    
    if (availableSongs.length === 0) {
      return interaction.editReply({ 
        content: '❌ No songs found! Use `/listsongs` to see available songs.' 
      });
    }

    const songToPlay = availableSongs[0];
    const trackInfo = await musicPlayer.addToQueue(songToPlay, interaction.user.username);
    
    await interaction.editReply({ 
      content: `🎵 Added **${trackInfo.title}** to the queue!` 
    });
    
    // Log play command
    await logAction(
      'Musik Abgespielt',
      `${interaction.user.tag} hat "${trackInfo.title}" abgespielt`,
      0x2ECC71,
      interaction.user
    );

  } catch (error) {
    console.error('Play command error:', error);
    await interaction.editReply({ 
      content: '❌ Failed to play song! Make sure the music folder exists with MP3 files.' 
    });
  }
}

async function searchCommand(interaction) {
  const query = interaction.options.getString('query') || '';
  const userVoiceChannel = interaction.member.voice.channel;
  
  if (!userVoiceChannel) {
    return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
  }

  await interaction.deferReply();

  try {
    let musicPlayer = client.musicPlayers.get(interaction.guild.id);
    if (!musicPlayer) {
      musicPlayer = new MusicPlayer(interaction.guild, interaction.channel, userVoiceChannel);
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

    const searchEmbed = new EmbedBuilder()
      .setTitle('🔍 Available Songs')
      .setDescription(songList)
      .setColor(0x0099FF)
      .setFooter({ 
        text: `Found ${availableSongs.length} songs • Use /play "song name" to play` 
      });

    await interaction.editReply({ embeds: [searchEmbed] });
    
    // Log search command
    await logAction(
      'Musik Gesucht',
      `${interaction.user.tag} hat nach "${query}" gesucht`,
      0x3498DB,
      interaction.user
    );

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

    const allMusicFiles = fs.readdirSync(musicDir);
    const mp3Files = allMusicFiles.filter(file => 
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

    const listEmbed = new EmbedBuilder()
      .setTitle('📋 All Available Songs')
      .setDescription(songList)
      .setColor(0x00FF00)
      .setFooter({ 
        text: `Total: ${mp3Files.length} songs • Use /play "song name" to play` 
      });

    await interaction.reply({ embeds: [listEmbed] });
    
    // Log list songs command
    await logAction(
      'Songs Aufgelistet',
      `${interaction.user.tag} hat alle verfügbaren Songs aufgelistet`,
      0x3498DB,
      interaction.user
    );

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
  
  // Log skip command
  await logAction(
    'Song Übersprungen',
    `${interaction.user.tag} hat den aktuellen Song übersprungen`,
    0xF39C12,
    interaction.user
  );
}

async function stopCommand(interaction) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  
  if (!musicPlayer) {
    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
  }

  musicPlayer.stop();
  await interaction.reply({ content: '⏹️ Stopped music and cleared queue!' });
  
  // Log stop command
  await logAction(
    'Musik Gestoppt',
    `${interaction.user.tag} hat die Musik gestoppt`,
    0xE74C3C,
    interaction.user
  );
}

async function queueCommand(interaction) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  
  if (!musicPlayer || musicPlayer.getQueue().length === 0) {
    return interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
  }

  const currentQueue = musicPlayer.getQueue();
  const queueList = currentQueue.slice(0, 10).map((track, index) => 
    `**${index + 1}.** ${track.title}`
  ).join('\n');

  const queueEmbed = new EmbedBuilder()
    .setTitle('📋 Music Queue')
    .setDescription(queueList)
    .setColor(0x0099FF)
    .setFooter({ text: `Total: ${currentQueue.length} songs` });

  await interaction.reply({ embeds: [queueEmbed] });
}

async function pauseCommand(interaction) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  
  if (!musicPlayer) {
    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
  }

  const success = musicPlayer.pause();
  if (success) {
    await interaction.reply({ content: '⏸️ Music paused!' });
    
    // Log pause command
    await logAction(
      'Musik Pausiert',
      `${interaction.user.tag} hat die Musik pausiert`,
      0xF39C12,
      interaction.user
    );
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
    
    // Log resume command
    await logAction(
      'Musik Fortgesetzt',
      `${interaction.user.tag} hat die Musik fortgesetzt`,
      0x2ECC71,
      interaction.user
    );
  } else {
    await interaction.reply({ content: '❌ Music is not paused!', ephemeral: true });
  }
}

async function clearCommand(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ 
      content: '❌ You need "Manage Messages" permission to use this command!', 
      ephemeral: true 
    });
  }

  const amount = interaction.options.getInteger('amount');

  try {
    await interaction.deferReply({ ephemeral: true });

    const messagesToDelete = await interaction.channel.messages.fetch({ limit: amount });
    const deletedMessages = await interaction.channel.bulkDelete(messagesToDelete, true);

    await interaction.editReply({ 
      content: `✅ Successfully deleted ${deletedMessages.size} message(s)!` 
    });
    
    // Log clear command
    await logAction(
      'Nachrichten Gelöscht',
      `${interaction.user.tag} hat ${deletedMessages.size} Nachrichten in ${interaction.channel.name} gelöscht`,
      0xE74C3C,
      interaction.user
    );

    setTimeout(async () => {
      try {
        await interaction.deleteReply();
      } catch (error) {
        console.error('Could not delete reply:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('Clear command error:', error);
    await interaction.editReply({ 
      content: '❌ Failed to delete messages! They might be older than 14 days.' 
    });
  }
}

// 🔹 QUESTS COMMANDS
async function questsCommand(interaction) {
  const userData = await getUserQuestData(interaction.user.id);
  
  if (!userData) {
    return interaction.reply({ 
      content: '❌ Fehler beim Laden deiner Quest-Daten!', 
      ephemeral: true 
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('## 🎯 Deine Quests Fortschritt')
    .setDescription('**Hier siehst du deinen aktuellen Fortschritt:**')
    .setColor(0x00AE86);

  for (let i = 0; i < userData.daily_quests.length; i++) {
    const quest = userData.daily_quests[i];
    const isCompleted = userData.completed_quests.includes(quest.id);
    
    let progress = '';
    let progressValue = 0;
    
    switch (quest.type) {
      case 'message_count':
        progressValue = userData.message_count || 0;
        progress = `${progressValue}/${quest.target} Nachrichten`;
        break;
      case 'voice_time':
        progressValue = userData.voice_time || 0;
        progress = `${progressValue}/${quest.target} Minuten`;
        break;
      case 'counting':
        progressValue = userData.counting || 0;
        progress = `${progressValue}/${quest.target} Counts`;
        break;
      case 'reaction':
        progressValue = userData.reaction_count || 0;
        progress = `${progressValue}/${quest.target} Reaktionen`;
        break;
    }
    
    const status = isCompleted ? '✅' : '⏳';
    embed.addFields({
      name: `${status} ${quest.description}`,
      value: `Fortschritt: ${progress}\nBelohnung: **${quest.reward} Coins**`,
      inline: false
    });
  }

  embed.addFields({
    name: '## 💰 Deine Maxxcloud Coins',
    value: `**${userData.total_coins}** Coins`,
    inline: true
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
  
  // Log quests command
  await logAction(
    'Quests Angezeigt',
    `${interaction.user.tag} hat seine Quests angesehen`,
    0x3498DB,
    interaction.user
  );
}

async function questsNewCommand(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ 
      content: '❌ Nur Administratoren können diesen Befehl nutzen!', 
      ephemeral: true 
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const [users] = await pool.query('SELECT user_id FROM user_quests');
  
  for (const user of users) {
    const dailyQuests = generateDailyQuests();
    await pool.query(
      'UPDATE user_quests SET daily_quests = ?, completed_quests = ?, last_reset_date = ?, voice_time = 0, message_count = 0, reaction_count = 0, counting = 0 WHERE user_id = ?',
      [JSON.stringify(dailyQuests), JSON.stringify([]), today, user.user_id]
    );
  }

  // Nachrichten aktualisieren
  await createQuestsMessage();

  await interaction.reply({ 
    content: '✅ Daily Quests wurden für alle User erneuert!', 
    ephemeral: true 
  });
  
  // Log quests reset command
  await logAction(
    'Quests Erneuert',
    `${interaction.user.tag} hat alle Daily Quests erneuert`,
    0xFFA500,
    interaction.user
  );
}

async function shopCommand(interaction) {
  const userData = await getUserQuestData(interaction.user.id);
  
  const embed = new EmbedBuilder()
    .setTitle('## 🛒 Maxxcloud Shop')
    .setDescription('**Kaufe coole Items mit deinen Coins!**')
    .setColor(0x0099ff);

  // Rollen Kategorie
  let rolesText = "";
  for (const role of SHOP_CONFIG.categories.rollen) {
    rolesText += `${role.emoji} **${role.name}** - ${role.price} Coins\n${role.description}\n\n`;
  }

  embed.addFields({
    name: "## 👑 Rollen",
    value: rolesText,
    inline: false
  });

  // Farben Kategorie
  let colorsText = "";
  for (const color of SHOP_CONFIG.categories.farben) {
    colorsText += `${color.emoji} **${color.name}** - ${color.price} Coins\n`;
  }

  embed.addFields({
    name: "## 🎨 Farben",
    value: colorsText,
    inline: false
  });

  // User Coins anzeigen
  embed.setFooter({ text: `Deine Coins: ${userData?.total_coins || 0}` });

  await interaction.reply({ embeds: [embed] });
  
  // Log shop command
  await logAction(
    'Shop Angezeigt',
    `${interaction.user.tag} hat den Shop angesehen`,
    0x9B59B6,
    interaction.user
  );
}

async function buyCommand(interaction) {
  const itemName = interaction.options.getString('item');
  const userData = await getUserQuestData(interaction.user.id);
  
  if (!userData) {
    return interaction.reply({ 
      content: '❌ Fehler beim Laden deiner Daten!', 
      ephemeral: true 
    });
  }

  // Item in Rollen suchen
  for (const role of SHOP_CONFIG.categories.rollen) {
    if (role.name.toLowerCase() === itemName.toLowerCase()) {
      if (userData.total_coins >= role.price) {
        userData.total_coins -= role.price;
        await updateUserQuestData(interaction.user.id, userData);
        
        // Rolle geben
        const roleObj = interaction.guild.roles.cache.get(role.role_id);
        if (roleObj) {
          await interaction.member.roles.add(roleObj);
        }
        
        // Item ins Inventar aufnehmen
        await pool.query(
          'INSERT INTO user_inventory (user_id, item_type, item_name, role_id) VALUES (?, ?, ?, ?)',
          [interaction.user.id, 'rolle', role.name, role.role_id]
        );
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Kauf erfolgreich!')
          .setDescription(`Du hast **${role.name}** für ${role.price} Coins gekauft!`)
          .setColor(0x00FF00);
        
        // Log purchase
        await logAction(
          'Item Gekauft',
          `${interaction.user.tag} hat "${role.name}" für ${role.price} Coins gekauft`,
          0x00FF00,
          interaction.user
        );
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ Nicht genug Maxxcloud Coins')
          .setDescription(`Du benötigst ${role.price} Coins, hast aber nur ${userData.total_coins} Coins.`)
          .setColor(0xFF0000);
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  // Item in Farben suchen
  for (const color of SHOP_CONFIG.categories.farben) {
    if (color.name.toLowerCase() === itemName.toLowerCase()) {
      if (userData.total_coins >= color.price) {
        userData.total_coins -= color.price;
        await updateUserQuestData(interaction.user.id, userData);
        
        // Farbe (Rolle) geben
        const colorRole = interaction.guild.roles.cache.get(color.role_id);
        if (colorRole) {
          await interaction.member.roles.add(colorRole);
        }

        // Item ins Inventar aufnehmen
        await pool.query(
          'INSERT INTO user_inventory (user_id, item_type, item_name, role_id) VALUES (?, ?, ?, ?)',
          [interaction.user.id, 'farbe', color.name, color.role_id]
        );
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Kauf erfolgreich!')
          .setDescription(`Du hast die Farbe **${color.name}** für ${color.price} Coins gekauft!`)
          .setColor(0x00FF00);
        
        // Log purchase
        await logAction(
          'Item Gekauft',
          `${interaction.user.tag} hat Farbe "${color.name}" für ${color.price} Coins gekauft`,
          0x00FF00,
          interaction.user
        );
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ Nicht genug Coins')
          .setDescription(`Du benötigst ${color.price} Coins, hast aber nur ${userData.total_coins} Coins.`)
          .setColor(0xFF0000);
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  // Item in Icons suchen
  for (const icon of SHOP_CONFIG.categories.icons) {
    if (icon.name.toLowerCase() === itemName.toLowerCase()) {
      if (userData.total_coins >= icon.price) {
        userData.total_coins -= icon.price;
        await updateUserQuestData(interaction.user.id, userData);
        
        // Icon (Rolle) geben
        const iconRole = interaction.guild.roles.cache.get(icon.role_id);
        if (iconRole) {
          await interaction.member.roles.add(iconRole);
        }

        // Item ins Inventar aufnehmen
        await pool.query(
          'INSERT INTO user_inventory (user_id, item_type, item_name, role_id) VALUES (?, ?, ?, ?)',
          [interaction.user.id, 'icon', icon.name, icon.role_id]
        );
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Kauf erfolgreich!')
          .setDescription(`Du hast **${icon.name}** für ${icon.price} Coins gekauft!`)
          .setColor(0x00FF00);
        
        // Log purchase
        await logAction(
          'Item Gekauft',
          `${interaction.user.tag} hat Icon "${icon.name}" für ${icon.price} Coins gekauft`,
          0x00FF00,
          interaction.user
        );
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ Nicht genug Coins')
          .setDescription(`Du benötigst ${icon.price} Coins, hast aber nur ${userData.total_coins} Coins.`)
          .setColor(0xFF0000);
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }

  await interaction.reply({ 
    content: '❌ Item nicht gefunden! Nutze `/shop` um verfügbare Items zu sehen.', 
    ephemeral: true 
  });
}

// 🔹 Shop Button Functions
async function checkQuestsCommand(interaction) {
  await questsCommand(interaction);
}

async function shopBuyCommand(interaction) {
  const userData = await getUserQuestData(interaction.user.id);
  
  if (!userData) {
    return interaction.reply({ 
      content: '❌ Fehler beim Laden deiner Daten!', 
      ephemeral: true 
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('## 🛒 Item Kaufen')
    .setDescription('**Wähle eine Kategorie aus:**')
    .setColor(0x9B59B6);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('buy_colors')
      .setLabel('🎨 Farben')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('buy_roles')
      .setLabel('👑 Rollen')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('buy_icons')
      .setLabel('⭐ Icons')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function showInventoryCommand(interaction) {
  try {
    const [inventory] = await pool.query(
      'SELECT * FROM user_inventory WHERE user_id = ? ORDER BY purchased_at DESC',
      [interaction.user.id]
    );

    const userData = await getUserQuestData(interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setTitle('## 💼 Dein Inventar')
      .setColor(0x3498DB);

    if (inventory.length === 0) {
      embed.setDescription('**Du hast noch keine Items gekauft! Besuche den Shop um coole Items zu erwerben.**');
    } else {
      let inventoryText = '';
      
      const colors = inventory.filter(item => item.item_type === 'farbe');
      const roles = inventory.filter(item => item.item_type === 'rolle');
      const icons = inventory.filter(item => item.item_type === 'icon');
      
      if (colors.length > 0) {
        inventoryText += '**🎨 Farben:**\n';
        colors.forEach(color => {
          inventoryText += `• ${color.item_name}\n`;
        });
        inventoryText += '\n';
      }
      
      if (roles.length > 0) {
        inventoryText += '**👑 Rollen:**\n';
        roles.forEach(role => {
          inventoryText += `• ${role.item_name}\n`;
        });
        inventoryText += '\n';
      }
      
      if (icons.length > 0) {
        inventoryText += '**⭐ Icons:**\n';
        icons.forEach(icon => {
          inventoryText += `• ${icon.item_name}\n`;
        });
      }
      
      embed.setDescription(inventoryText);
    }

    embed.addFields({
      name: '## 💰 Aktueller Kontostand',
      value: `**${userData?.total_coins || 0}** Coins`,
      inline: true
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error showing inventory:', error);
    await interaction.reply({ 
      content: '❌ Fehler beim Laden deines Inventars!', 
      ephemeral: true 
    });
  }
}

async function showBalanceCommand(interaction) {
  const userData = await getUserQuestData(interaction.user.id);
  
  const embed = new EmbedBuilder()
    .setTitle('## 💰 Dein Kontostand')
    .setDescription(`**Du hast aktuell ${userData?.total_coins || 0} Coins zur Verfügung!**`)
    .setColor(0xF1C40F)
    .addFields({
      name: '## 💡 Coins verdienen',
      value: '**Erledige tägliche Quests um Coins zu verdienen! Besuche den Quests-Channel um verfügbare Aufgaben zu sehen.**',
      inline: false
    });

  await interaction.reply({ embeds: [embed], ephemeral: true });
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
  },
  {
    data: new SlashCommandBuilder()
      .setName('clear')
      .setDescription('Delete a number of messages')
      .addIntegerOption(option =>
        option.setName('amount')
          .setDescription('Number of messages to delete (1-100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)),
    execute: clearCommand
  },
  // Quests Commands
  {
    data: new SlashCommandBuilder()
      .setName('quests')
      .setDescription('Zeige deine aktuellen Quests an'),
    execute: questsCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('quests_new')
      .setDescription('Erneuere die Daily Quests (Admin only)'),
    execute: questsNewCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('shop')
      .setDescription('Zeige den Shop an'),
    execute: shopCommand
  },
  {
    data: new SlashCommandBuilder()
      .setName('buy')
      .setDescription('Kaufe ein Item aus dem Shop')
      .addStringOption(option =>
        option.setName('item')
          .setDescription('Name des Items das du kaufen möchtest')
          .setRequired(true)),
    execute: buyCommand
  }
];

// 🔹 Commands zur Collection hinzufügen
commands.forEach(command => {
  client.commands.set(command.data.name, command);
});

// 🔹 BUTTON INTERAKTIONEN - ERWEITERT MIT QUESTS UND SHOP
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

  if (interaction.isButton()) {
    // Quests Button
    if (interaction.customId === 'check_quests') {
      await checkQuestsCommand(interaction);
      return;
    }

    // Shop Buttons
    if (interaction.customId === 'shop_buy') {
      await shopBuyCommand(interaction);
      return;
    }

    if (interaction.customId === 'shop_inventory') {
      await showInventoryCommand(interaction);
      return;
    }

    if (interaction.customId === 'shop_balance') {
      await showBalanceCommand(interaction);
      return;
    }

    // "Zum Ticket-Thread" Button (im Ticket-Channel)
    if (interaction.customId.startsWith('view_ticket_')) {
      const ticketId = interaction.customId.replace('view_ticket_', '');
      
      try {
        const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
          return interaction.reply({ 
            content: '❌ Ticket nicht gefunden!', 
            ephemeral: true 
          });
        }

        const ticket = tickets[0];
        
        if (ticket.thread_id) {
          await interaction.reply({ 
            content: `📋 Gehe zum Ticket-Thread: <#${ticket.thread_id}>`, 
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: '❌ Thread nicht gefunden!', 
            ephemeral: true 
          });
        }

      } catch (error) {
        console.error('Error viewing ticket:', error);
        await interaction.reply({ 
          content: '❌ Fehler beim Öffnen des Tickets!', 
          ephemeral: true 
        });
      }
      return;
    }

    // Ticket Button Handling (nur im Thread)
    if (interaction.customId.startsWith('close_ticket_')) {
      const ticketId = interaction.customId.replace('close_ticket_', '');
      
      if (!interaction.member.roles.cache.has(config.staffRoleId)) {
        return interaction.reply({ 
          content: '❌ Nur Support-Mitarbeiter können Tickets schließen!', 
          ephemeral: true 
        });
      }

      try {
        const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
          return interaction.reply({ 
            content: '❌ Ticket nicht gefunden!', 
            ephemeral: true 
          });
        }

        const ticket = tickets[0];

        // Ticket in Datenbank als geschlossen markieren
        await pool.query(
          'UPDATE tickets SET status = ? WHERE id = ?',
          ['geschlossen', ticketId]
        );

        // Buttons entfernen
        await interaction.message.edit({
          components: []
        });

        // Thread sperren und archivieren
        if (interaction.message.hasThread) {
          await interaction.message.thread.setLocked(true);
          await interaction.message.thread.setArchived(true);
        }

        // Benachrichtigung an User senden
        try {
          const user = await client.users.fetch(ticket.user_id);
          const closedEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket geschlossen')
            .setDescription(`Dein Ticket #${ticketId} wurde vom Support-Team geschlossen.`)
            .setColor(0xFF0000)
            .addFields(
              { name: '👤 Geschlossen von', value: `${interaction.user.tag}`, inline: true },
              { name: '📅 Geschlossen am', value: new Date().toLocaleDateString('de-DE'), inline: true },
              { name: '⏰ Uhrzeit', value: new Date().toLocaleTimeString('de-DE'), inline: true }
            )
            .setFooter({ text: 'Wenn du weitere Hilfe benötigst, erstelle bitte ein neues Ticket.' });

          await user.send({ embeds: [closedEmbed] });
          console.log(`✅ Schließungs-Benachrichtigung an ${ticket.user_tag} gesendet`);
        } catch (dmError) {
          console.error('Error sending closure notification:', dmError);
        }

        await interaction.reply({ 
          content: `✅ Ticket #${ticketId} wurde geschlossen! Der User wurde benachrichtigt.`, 
          ephemeral: false 
        });
        
        // Log ticket closure
        await logAction(
          'Ticket Geschlossen',
          `Ticket #${ticketId} von ${ticket.user_tag} wurde von ${interaction.user.tag} geschlossen`,
          0xE74C3C,
          interaction.user
        );

      } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.reply({ 
          content: '❌ Fehler beim Schließen des Tickets!', 
          ephemeral: true 
        });
      }
      return;
    }

    if (interaction.customId.startsWith('claim_ticket_')) {
      const ticketId = interaction.customId.replace('claim_ticket_', '');
      
      if (!interaction.member.roles.cache.has(config.staffRoleId)) {
        return interaction.reply({ 
          content: '❌ Nur Support-Mitarbeiter können Tickets übernehmen!', 
          ephemeral: true 
        });
      }

      try {
        const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
          return interaction.reply({ 
            content: '❌ Ticket nicht gefunden!', 
            ephemeral: true 
          });
        }

        const ticket = tickets[0];
        
        await interaction.reply({ 
          content: `🎯 ${interaction.user} hat das Ticket #${ticketId} von ${ticket.user_tag} übernommen!` 
        });

        if (interaction.message.hasThread) {
          await interaction.message.thread.send({
            content: `🔔 ${interaction.user} kümmert sich nun um dieses Ticket!`
          });
        }
        
        // Log ticket claim
        await logAction(
          'Ticket Übernommen',
          `Ticket #${ticketId} von ${ticket.user_tag} wurde von ${interaction.user.tag} übernommen`,
          0xF39C12,
          interaction.user
        );

      } catch (error) {
        console.error('Error claiming ticket:', error);
        await interaction.reply({ 
          content: '❌ Fehler beim Übernehmen des Tickets!', 
          ephemeral: true 
        });
      }
      return;
    }

    // ANTWORTEN BUTTON
    if (interaction.customId.startsWith('reply_ticket_')) {
      const ticketId = interaction.customId.replace('reply_ticket_', '');
      
      if (!interaction.member.roles.cache.has(config.staffRoleId)) {
        return interaction.reply({ 
          content: '❌ Nur Support-Mitarbeiter können auf Tickets antworten!', 
          ephemeral: true 
        });
      }

      try {
        const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
          return interaction.reply({ 
            content: '❌ Ticket nicht gefunden!', 
            ephemeral: true 
          });
        }

        const ticket = tickets[0];

        // Modal für Antwort erstellen
        const modal = new ModalBuilder()
          .setCustomId(`reply_modal_${ticketId}`)
          .setTitle(`Antwort an ${ticket.user_tag}`);

        const answerInput = new TextInputBuilder()
          .setCustomId('answer_text')
          .setLabel('Deine Antwort an den User:')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Schreibe hier deine Antwort...')
          .setRequired(true)
          .setMaxLength(2000);

        const firstActionRow = new ActionRowBuilder().addComponents(answerInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);

      } catch (error) {
        console.error('Error creating reply modal:', error);
        await interaction.reply({ 
          content: '❌ Fehler beim Erstellen der Antwort!', 
          ephemeral: true 
        });
      }
      return;
    }

    // TempTalk Button Handling
    const [action, channelId] = interaction.customId.split("_");
    const talkData = activeTempTalks.get(channelId);

    if (!talkData) {
      return interaction.reply({ content: "❌ Channel nicht gefunden oder bereits gelöscht.", ephemeral: true });
    }

    if (interaction.user.id !== talkData.ownerId) {
      return interaction.reply({ content: "❌ Nur der Channel-Besitzer darf diese Buttons verwenden!", ephemeral: true });
    }

    const targetChannel = interaction.guild.channels.cache.get(channelId);
    if (!targetChannel)
      return interaction.reply({ content: "❌ Channel existiert nicht mehr.", ephemeral: true });

    switch (action) {
      case "lock":
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
        await interaction.reply({ content: "🔒 Channel gesperrt!", ephemeral: true });
        
        // Log channel lock
        await logAction(
          'TempTalk Gesperrt',
          `${interaction.user.tag} hat TempTalk ${targetChannel.name} gesperrt`,
          0xE74C3C,
          interaction.user
        );
        break;

      case "unlock":
        await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
        await interaction.reply({ content: "🔓 Channel geöffnet!", ephemeral: true });
        
        // Log channel unlock
        await logAction(
          'TempTalk Entsperrt',
          `${interaction.user.tag} hat TempTalk ${targetChannel.name} entsperrt`,
          0x2ECC71,
          interaction.user
        );
        break;

      case "kick":
        if (targetChannel.members.size === 0)
          return interaction.reply({ content: "🚫 Niemand im Channel.", ephemeral: true });

        const kicked = [];
        for (const [id, member] of targetChannel.members) {
          if (member.id !== talkData.ownerId) {
            await member.voice.disconnect().catch(() => {});
            kicked.push(member.user.username);
          }
        }

        await interaction.reply({
          content: kicked.length ? `🚪 Gekickt: ${kicked.join(", ")}` : "🚫 Keine User zum Kicken.",
          ephemeral: true
        });
        
        // Log user kick
        if (kicked.length > 0) {
          await logAction(
            'User Gekickt',
            `${interaction.user.tag} hat ${kicked.length} User aus TempTalk ${targetChannel.name} gekickt: ${kicked.join(', ')}`,
            0xE74C3C,
            interaction.user
          );
        }
        break;

      case "delete":
        await interaction.reply({ content: "🗑️ Channel wird gelöscht...", ephemeral: true });
        await cleanupTempTalk(channelId, talkData);
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
  }

  // MODAL FÜR ANTWORTEN
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('reply_modal_')) {
      const ticketId = interaction.customId.replace('reply_modal_', '');
      const answerText = interaction.fields.getTextInputValue('answer_text');

      try {
        const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
          return interaction.reply({ 
            content: '❌ Ticket nicht gefunden!', 
            ephemeral: true 
          });
        }

        const ticket = tickets[0];

        // Antwort als DM an User senden
        try {
          const user = await client.users.fetch(ticket.user_id);
          const staffEmbed = new EmbedBuilder()
            .setTitle(`💬 Neue Antwort auf dein Ticket #${ticketId}`)
            .setDescription(answerText)
            .setColor(0x0099FF)
            .addFields(
              { name: '👤 Support-Mitarbeiter', value: `${interaction.user.tag}`, inline: true },
              { name: '📅 Datum', value: new Date().toLocaleDateString('de-DE'), inline: true },
              { name: '⏰ Uhrzeit', value: new Date().toLocaleTimeString('de-DE'), inline: true }
            )
            .setFooter({ text: 'Du kannst direkt auf diese Nachricht antworten um zu antworten!' });

          await user.send({ embeds: [staffEmbed] });
          console.log(`✅ Antwort an ${ticket.user_tag} gesendet`);

          // Antwort auch im Thread posten
          if (ticket.thread_id) {
            try {
              const thread = await client.channels.fetch(ticket.thread_id);
              if (thread) {
                const threadEmbed = new EmbedBuilder()
                  .setTitle(`💬 Antwort an User gesendet`)
                  .setDescription(answerText)
                  .setColor(0x00FF00)
                  .setAuthor({ 
                    name: interaction.user.tag, 
                    iconURL: interaction.user.displayAvatarURL() 
                  })
                  .setFooter({ text: `Ticket #${ticketId} • Staff Antwort` })
                  .setTimestamp();

                await thread.send({ embeds: [threadEmbed] });
              }
            } catch (threadError) {
              console.error('Error posting to thread:', threadError);
            }
          }

          await interaction.reply({ 
            content: `✅ Antwort wurde an ${ticket.user_tag} gesendet!`, 
            ephemeral: true 
          });
          
          // Log ticket reply
          await logAction(
            'Ticket Antwort',
            `${interaction.user.tag} hat auf Ticket #${ticketId} von ${ticket.user_tag} geantwortet`,
            0x0099FF,
            interaction.user
          );

        } catch (dmError) {
          console.error('Error sending DM to user:', dmError);
          await interaction.reply({ 
            content: '❌ Konnte Antwort nicht an User senden!', 
            ephemeral: true 
          });
        }

      } catch (error) {
        console.error('Error processing reply:', error);
        await interaction.reply({ 
          content: '❌ Fehler beim Verarbeiten der Antwort!', 
          ephemeral: true 
        });
      }
    }

    // Bestehende Modal-Interaktionen für TempTalk
    const customId = interaction.customId;
    
    if (customId.startsWith("rename_modal_")) {
      const channelId = customId.replace("rename_modal_", "");
      const talkData = activeTempTalks.get(channelId);
      
      if (talkData && interaction.user.id !== talkData.ownerId) {
        return interaction.reply({ 
          content: "❌ Nur der Channel-Besitzer darf das tun!",
          ephemeral: true 
        });
      }
      
      const newName = interaction.fields.getTextInputValue("new_name");
      
      const renameChannel = interaction.guild.channels.cache.get(channelId);
      if (renameChannel) {
        await renameChannel.setName(newName);
        await interaction.reply({ 
          content: `✅ Channel wurde umbenannt zu: **${newName}**`,
          ephemeral: true 
        });
        
        // Log channel rename
        await logAction(
          'TempTalk Umbenannt',
          `${interaction.user.tag} hat TempTalk zu "${newName}" umbenannt`,
          0x3498DB,
          interaction.user
        );
      }
    }
    else if (customId.startsWith("limit_modal_")) {
      const channelId = customId.replace("limit_modal_", "");
      const talkData = activeTempTalks.get(channelId);
      
      if (talkData && interaction.user.id !== talkData.ownerId) {
        return interaction.reply({ 
          content: "❌ Nur der Channel-Besitzer darf das tun!",
          ephemeral: true 
        });
      }
      
      const userLimit = parseInt(interaction.fields.getTextInputValue("user_limit"));
      
      const limitChannel = interaction.guild.channels.cache.get(channelId);
      if (limitChannel) {
        await limitChannel.setUserLimit(userLimit);
        const limitText = userLimit === 0 ? "unbegrenzt" : userLimit;
        await interaction.reply({ 
          content: `✅ User Limit wurde auf **${limitText}** gesetzt`,
          ephemeral: true 
        });
        
        // Log user limit change
        await logAction(
          'TempTalk Limit Geändert',
          `${interaction.user.tag} hat User-Limit auf ${limitText} gesetzt`,
          0x3498DB,
          interaction.user
        );
      }
    }
  }
});

// 🔹 Musik-Steuerung anzeigen
async function showMusicControl(interaction, channelId) {
  const musicPlayer = client.musicPlayers.get(interaction.guild.id);
  const musicEmbed = new EmbedBuilder()
    .setTitle("🎵 Musik Steuerung")
    .setColor(0x00FF00);

  if (musicPlayer && musicPlayer.currentTrack) {
    musicEmbed.setDescription(`**Jetzt spielt:** ${musicPlayer.currentTrack.title}`)
         .addFields(
           { name: "📊 Warteschlange", value: `${musicPlayer.getQueue().length} Songs`, inline: true },
           { name: "📊 Status", value: musicPlayer.isPlaying ? "▶️ Playing" : "⏸️ Paused", inline: true }
         );
  } else {
    musicEmbed.setDescription("Keine Musik wird aktuell abgespielt.\nVerwende `/play` um Musik hinzuzufügen!");
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
    embeds: [musicEmbed], 
    components: [controlRow],
    ephemeral: true 
  });
}

// 🔹 TEMPTALK FUNKTIONEN
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (!oldState.channelId && newState.channelId === config.joinVoiceId) {
    const guild = newState.guild;
    const member = newState.member;
    const category = guild.channels.cache.get(config.categoryId);

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

    await member.voice.setChannel(tempChannel);

    const controlChannel = guild.channels.cache.get(config.controlChannelId);
    if (controlChannel) {
      const controlEmbed = new EmbedBuilder()
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


            const controlMessage = await controlChannel.send({ 
        content: `🎉 Neuer TempTalk erstellt von ${member.user.username}!`,
        embeds: [controlEmbed], 
        components: [row1, row2] 
      });

      try {
        await pool.query(
          'INSERT INTO temptalks (channel_id, owner_id, guild_id, control_message_id) VALUES (?, ?, ?, ?)',
          [tempChannel.id, member.id, guild.id, controlMessage.id]
        );
      } catch (error) {
        console.error('Failed to save TempTalk to DB:', error);  // ← : durch ; ersetzen
      }

      activeTempTalks.set(tempChannel.id, {
        ownerId: member.id,
        channelId: tempChannel.id,
        controlMessage: controlMessage
      });
      
      // Log TempTalk creation
      await logAction(
        'TempTalk Erstellt',
        `Neuer TempTalk von ${member.user.tag} erstellt: ${tempChannel.name}`,
        0x9B59B6,
        member.user
      );
    }  // ← Diese Klammer schließt die if (controlChannel) Bedingung
  }  // ← Diese Klammer schließt den if (!oldState.channelId && newState.channelId === config.joinVoiceId) Block

  if (oldState.channel && activeTempTalks.has(oldState.channel.id)) {
    const emptyChannel = oldState.channel;
    if (emptyChannel.members.size === 0) {
      const talkData = activeTempTalks.get(emptyChannel.id);
      await cleanupTempTalk(emptyChannel.id, talkData);
    }
  }
}); // ← Diese Klammer schließt die gesamte VoiceStateUpdate Event-Funktion

// 🔹 Client Ready Event
client.once(Events.ClientReady, async () => {
  console.log(`🎉 Bot online als ${client.user.tag}`);
  console.log(`🔗 Bot ID: ${client.user.id}`);
  console.log(`👥 Connected to ${client.guilds.cache.size} guilds`);
  console.log(`📊 Users: ${client.users.cache.size}`);
  
  // Erstelle music Ordner falls nicht vorhanden
  if (!fs.existsSync('./music')) {
    fs.mkdirSync('./music');
    console.log('📁 Music folder created');
  }
  
  // 🔹 WICHTIG: Quest und Shop Nachrichten erstellen
  try {
    console.log('🔄 Initializing Quests and Shop messages...');
    
    // Warte kurz damit alle Channels geladen sind
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Prüfe ob die Channel existieren
    const questsChannel = client.channels.cache.get(QUESTS_CONFIG.quests_channel);
    const shopChannel = client.channels.cache.get(QUESTS_CONFIG.shop_channel);
    
    if (!questsChannel) {
      console.error(`❌ Quests Channel ${QUESTS_CONFIG.quests_channel} nicht gefunden!`);
    } else {
      console.log(`✅ Quests Channel gefunden: ${questsChannel.name}`);
      await createQuestsMessage();
    }
    
    if (!shopChannel) {
      console.error(`❌ Shop Channel ${QUESTS_CONFIG.shop_channel} nicht gefunden!`);
    } else {
      console.log(`✅ Shop Channel gefunden: ${shopChannel.name}`);
      await createShopMessage();
    }
    
    console.log('✅ Quests and Shop messages initialized successfully');
    
  } catch (error) {
    console.error('❌ Error initializing Quests/Shop messages:', error);
  }
});// Erstelle music Ordner falls nicht vorhanden
  if (!fs.existsSync('./music')) {
    fs.mkdirSync('./music');
    console.log('📁 Music folder created');
  }
  


// 🔹 Bot Login
client.login(process.env.DISCORD_TOKEN);
