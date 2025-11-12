import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 22020;

// ==================== CONFIG ====================
let guildId = '1432030848686153748';
let botClient = null;

// MySQL Connection Pool
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

// ==================== MIDDLEWARE ====================
// CORS Konfiguration - Akzeptiere Requests von überall
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Explizite CORS Header
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  // OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== LOGGING ====================
function logRequest(method, url, message) {
  const timestamp = new Date().toLocaleTimeString('de-DE');
  console.log(`[${timestamp}] [${method}] ${url} - ${message}`);
}

// ==================== EXPORT FOR BOT ====================
export function setBot(client) {
  botClient = client;
}

export default app;

// ==================== MAIN ROUTE ====================
app.get('/', (req, res) => {
  logRequest('GET', '/', 'Serving panel.html');
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// ==================== GREETING ENDPOINTS ====================
app.post('/api/greeting-toggle', async (req, res) => {
  logRequest('POST', '/api/greeting-toggle', 'Request received');
  try {
    const connection = await pool.getConnection();
    logRequest('POST', '/api/greeting-toggle', 'Database connection acquired');
    await connection.query(
      'INSERT INTO bot_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()',
      ['greeting_enabled', '1', '1']
    );
    logRequest('POST', '/api/greeting-toggle', 'Query executed successfully');
    connection.release();
    res.json({ success: true, data: { message: 'Greeting toggled' } });
  } catch (error) {
    logRequest('POST', '/api/greeting-toggle', 'ERROR: ' + error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/greeting-status', async (req, res) => {
  logRequest('GET', '/api/greeting-status', 'Request received');
  try {
    const connection = await pool.getConnection();
    logRequest('GET', '/api/greeting-status', 'Database connection acquired');
    const [rows] = await connection.query(
      'SELECT setting_value FROM bot_settings WHERE setting_key = ?',
      ['greeting_enabled']
    );
    logRequest('GET', '/api/greeting-status', 'Query returned ' + rows.length + ' rows');
    connection.release();
    
    const enabled = rows.length > 0 ? parseInt(rows[0].setting_value) : 0;
    res.json({ success: true, data: { enabled } });
  } catch (error) {
    logRequest('GET', '/api/greeting-status', 'ERROR: ' + error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== MOD ENDPOINTS ====================
app.get('/api/mod/users', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT user_id, username, avatar, warns FROM user_data LIMIT 50'
    );
    connection.release();
    
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/mod/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await pool.getConnection();
    
    const [rows] = await connection.query(
      'SELECT * FROM user_data WHERE user_id = ?',
      [userId]
    );
    
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    let user = rows[0];
    
    // Try to fetch member info from Discord
    if (botClient) {
      try {
        const guild = await botClient.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        user.roles = member.roles.cache.map(r => r.name);
        user.join_date = member.joinedAt;
      } catch (e) {
        user.roles = [];
      }
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/mod/warn', async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    const connection = await pool.getConnection();
    
    // Update warn count
    await connection.query(
      'UPDATE user_data SET warns = warns + 1 WHERE user_id = ?',
      [user_id]
    );
    
    // Log action
    await connection.query(
      'INSERT INTO mod_logs (user_id, action, reason) VALUES (?, ?, ?)',
      [user_id, 'WARN', reason || 'Keine Angabe']
    );
    
    connection.release();
    res.json({ success: true, data: { message: 'Warning added' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/mod/remove-warn', async (req, res) => {
  try {
    const { user_id } = req.body;
    const connection = await pool.getConnection();
    
    // Update warn count
    await connection.query(
      'UPDATE user_data SET warns = GREATEST(warns - 1, 0) WHERE user_id = ?',
      [user_id]
    );
    
    // Log action
    await connection.query(
      'INSERT INTO mod_logs (user_id, action, reason) VALUES (?, ?, ?)',
      [user_id, 'WARN_REMOVED', 'Verwarnung entfernt']
    );
    
    connection.release();
    res.json({ success: true, data: { message: 'Warning removed' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/mod/logs', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM mod_logs ORDER BY timestamp DESC LIMIT 50'
    );
    connection.release();
    
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ADMIN ENDPOINTS ====================
app.get('/api/admin/statistics', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Read latest stats from bot_stats table (updated every 5 seconds by the bot)
    const [stats] = await connection.query(
      'SELECT totalUsers, totalWarnings, uptime, botStatus, timestamp FROM bot_stats ORDER BY id DESC LIMIT 1'
    );
    
    connection.release();
    
    if (stats.length === 0) {
      logRequest('GET', '/api/admin/statistics', 'No bot stats available yet');
      return res.json({ success: true, data: {
        totalUsers: 0,
        warnsToday: 0,
        totalMessages: 0,
        uptime: 0,
        guildAvailable: false
      }});
    }

    logRequest('GET', '/api/admin/statistics', `users=${stats[0].totalUsers} warnings=${stats[0].totalWarnings} uptime=${stats[0].uptime}s`);

    res.json({ success: true, data: {
      totalUsers: stats[0].totalUsers,
      warnsToday: stats[0].totalWarnings,
      totalMessages: 0,
      uptime: stats[0].uptime,
      guildAvailable: true
    }});
  } catch (error) {
    logRequest('GET', '/api/admin/statistics', 'ERROR: ' + error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/channels', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [channels] = await connection.query(
      'SELECT channel_id as id, channel_name as name FROM bot_channels ORDER BY channel_name'
    );
    connection.release();
    
    logRequest('GET', '/api/admin/channels', 'Loaded ' + channels.length + ' channels from DB');
    res.json({ success: true, data: channels });
  } catch (error) {
    logRequest('GET', '/api/admin/channels', 'ERROR: ' + error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/roles', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [roles] = await connection.query(
      'SELECT role_id as id, role_name as name FROM bot_roles ORDER BY role_name'
    );
    connection.release();
    
    logRequest('GET', '/api/admin/roles', 'Loaded ' + roles.length + ' roles from DB');
    res.json({ success: true, data: roles });
  } catch (error) {
    logRequest('GET', '/api/admin/roles', 'ERROR: ' + error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/send-message', async (req, res) => {
  try {
    const { channel_id, role_id, message, button_text } = req.body;
    
    if (!botClient) {
      return res.status(400).json({ success: false, error: 'Bot not connected' });
    }
    
    const guild = await botClient.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channel_id);
    const role = await guild.roles.fetch(role_id);
    
    // Replace placeholder
    let finalMessage = message.replace(/@deadchat/g, `<@&${role_id}>`);
    
    // Create button
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`get_role_${role_id}`)
          .setLabel(button_text || 'Ping mich auch')
          .setStyle(ButtonStyle.Primary)
      );
    
    await channel.send({
      content: finalMessage,
      components: [row]
    });
    
    // Log action
    const connection = await pool.getConnection();
    await connection.query(
      'INSERT INTO admin_logs (action, channel_id, message, role_id) VALUES (?, ?, ?, ?)',
      ['SEND_MESSAGE', channel_id, message, role_id]
    );
    connection.release();
    
    res.json({ success: true, data: { message: 'Message sent' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/logs', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT al.*, gc.name as channel_name FROM admin_logs al LEFT JOIN guild_channels gc ON al.channel_id = gc.channel_id ORDER BY al.timestamp DESC LIMIT 50'
    );
    connection.release();
    
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🌐 Web Panel läuft auf Port ${PORT}`);
  console.log(`📍 Erreichbar unter: http://localhost:${PORT}`);
  console.log(`📍 Remote erreichbar unter: https://maxx-os.page.gd`);
});
