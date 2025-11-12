import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  {
    name: 'play',
    description: 'Play a song from local MP3 files',
    options: [
      {
        name: 'song',
        description: 'Song name to search for',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'search',
    description: 'Search for available songs',
    options: [
      {
        name: 'query',
        description: 'Search term',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'listsongs',
    description: 'List all available songs'
  },
  {
    name: 'skip',
    description: 'Skip the current song'
  },
  {
    name: 'stop',
    description: 'Stop the music and clear the queue'
  },
  {
    name: 'queue',
    description: 'Show the current music queue'
  },
  {
    name: 'pause',
    description: 'Pause the current song'
  },
  {
    name: 'resume',
    description: 'Resume the paused song'
  },
  {
    name: 'clear',
    description: 'Delete a number of messages',
    options: [
      {
        name: 'amount',
        description: 'Number of messages to delete (1-100)',
        type: 4, // INTEGER
        required: true,
        min_value: 1,
        max_value: 100
      }
    ]
  },

  // 🔹 Quests und Shop Commands
  {
    name: 'quests',
    description: 'Zeige deine aktuellen Quests an'
  },
  {
    name: 'quests_new',
    description: 'Erneuere die Daily Quests (Admin only)'
  },
  {
    name: 'shop',
    description: 'Zeige den Shop an'
  },
  {
    name: 'buy',
    description: 'Kaufe ein Item aus dem Shop',
    options: [
      {
        name: 'item',
        description: 'Name des Items das du kaufen möchtest',
        type: 3, // STRING
        required: true
      }
    ]
  },

  // 🔹 Werbung Command
  {
    name: 'werbung',
    description: 'Steuere das Werbung-Feature (Admin only)',
    options: [
      {
        name: 'action',
        description: 'Aktion ausführen',
        type: 3, // STRING
        required: true,
        choices: [
          {
            name: 'Start',
            value: 'start'
          },
          {
            name: 'Stop',
            value: 'stop'
          },
          {
            name: 'Posten',
            value: 'post'
          }
        ]
      },
      {
        name: 'interval',
        description: 'Intervall in Minuten (nur bei start)',
        type: 4, // INTEGER
        required: false,
        min_value: 1,
        max_value: 1440 // Maximal 24 Stunden
      }
    ]
  },

  // 🔹 Moderation Commands
  {
    name: 'warn',
    description: 'Verwarne einen User',
    options: [
      {
        name: 'user',
        description: 'User der verwarnt werden soll',
        type: 6, // USER
        required: true
      },
      {
        name: 'grund',
        description: 'Grund für die Verwarnung',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'userinfo',
    description: 'Zeige Informationen über einen User an',
    options: [
      {
        name: 'user',
        description: 'User über den Informationen angezeigt werden sollen',
        type: 6, // USER
        required: false
      }
    ]
  },
  {
    name: 'userinfoadd',
    description: 'Füge eine Notiz zu einem User hinzu',
    options: [
      {
        name: 'user',
        description: 'User zu dem eine Notiz hinzugefügt werden soll',
        type: 6, // USER
        required: true
      },
      {
        name: 'notiz',
        description: 'Notiz die hinzugefügt werden soll',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'ban',
    description: 'Banne einen User',
    options: [
      {
        name: 'user',
        description: 'User der gebannt werden soll',
        type: 6, // USER
        required: true
      },
      {
        name: 'grund',
        description: 'Grund für den Ban',
        type: 3, // STRING
        required: false
      },
      {
        name: 'dauer',
        description: 'Dauer des Bans (z.B. 7d, 30d, 1h)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'permanent',
        description: 'Permanenter Ban',
        type: 5, // BOOLEAN
        required: false
      }
    ]
  },
  {
    name: 'clearwarns',
    description: 'Lösche alle Warns eines Users',
    options: [
      {
        name: 'user',
        description: 'User dessen Warns gelöscht werden sollen',
        type: 6, // USER
        required: true
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log('🔄 Started refreshing application (/) commands...');

    if (!process.env.CLIENT_ID) {
      console.error('❌ CLIENT_ID is missing in .env file!');
      console.log('💡 Get your CLIENT_ID from: https://discord.com/developers/applications');
      return;
    }

    // Global registration (für alle Server)
    console.log('🌐 Registering commands globally...');
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ Successfully registered ${data.length} application commands globally!`);
    console.log('📋 Commands:', data.map(cmd => cmd.name).join(', '));
    
    // Optional: Guild-specific registration (schneller für Testing)
    if (process.env.GUILD_ID) {
      console.log('🏠 Registering commands for guild...');
      const guildData = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${guildData.length} guild commands!`);
    } else {
      console.log('💡 Tip: Add GUILD_ID to .env for faster command updates during development');
    }
    
    console.log('🎉 Command deployment completed!');
    console.log('⏰ Note: Global commands may take up to 1 hour to appear on all servers');
    
  } catch (error) {
    console.error('❌ Error registering commands:', error);
    
    if (error.code === 10002) {
      console.log('🔍 Problem: Unknown Application - Check your CLIENT_ID in .env');
    } else if (error.code === 50001) {
      console.log('🔍 Problem: Missing Access - Make sure the bot is added to the server');
    } else if (error.code === 50013) {
      console.log('🔍 Problem: Missing Permissions - Bot needs "applications.commands" scope');
    } else if (error.code === 50035) {
      console.log('🔍 Problem: Invalid Form Body - Check command structure');
      console.log('Error details:', error.rawError);
    }
  }
}

deployCommands();