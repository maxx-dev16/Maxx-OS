import mysql from 'mysql2/promise';

console.log('🗄️ Starte Datenbank-Setup...');

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

async function setupDatabase() {
  try {
    const connection = await pool.getConnection();
    
    console.log('📝 Erstelle Tabellen...');

    // bot_settings Tabelle
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ bot_settings Tabelle erstellt');

    // mod_logs Tabelle
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mod_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(50),
        reason TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        INDEX(timestamp)
      )
    `);
    console.log('✅ mod_logs Tabelle erstellt');

    // admin_logs Tabelle
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(50),
        channel_id VARCHAR(255),
        message LONGTEXT,
        role_id VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(timestamp)
      )
    `);
    console.log('✅ admin_logs Tabelle erstellt');

    // greeting_responses Tabelle
    await connection.query(`
      CREATE TABLE IF NOT EXISTS greeting_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        greeted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        INDEX(greeted_at)
      )
    `);
    console.log('✅ greeting_responses Tabelle erstellt');

    // user_data Tabelle (falls nicht vorhanden)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_data (
        user_id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255),
        avatar VARCHAR(255),
        warns INT DEFAULT 0,
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ user_data Tabelle erstellt');

    // Initial Einstellungen
    await connection.query(
      'INSERT INTO bot_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      ['greeting_enabled', '1', '1']
    );
    console.log('✅ Initiale Einstellungen gespeichert');

    connection.release();
    console.log('\n✅ Datenbank-Setup erfolgreich abgeschlossen!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler beim Setup:', error.message);
    process.exit(1);
  }
}

setupDatabase();
