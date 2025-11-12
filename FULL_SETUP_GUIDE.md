# 🚀 Maxx OS - Vollständiges Setup-Guide

## 📦 Was du jetzt hast

### ✨ Discord Bot Features
- 🎙️ Automatische Begrüßungen (Hallo, Hi, Servus, etc.)
- 🎮 Quest System mit täglichen Aufgaben
- 🛍️ Shop mit Rollen und Farben
- 💬 Automatische Werbung
- 🎵 Musik-System
- 📋 Ticket System
- 🗣️ Voice Channel Management (TempTalks)

### 🌐 Web Panel Features
- **Dashboard**: Live Statistiken & Einstellungen
- **Mod Dashboard**: Benutzerverwaltung & Verwarnungssystem
- **Admin Dashboard**: Automatisierte Nachrichten mit Button-Funktionen
- **Single HTML File**: Alles in einer Datei - keine externe JS nötig!
- **Responsive Design**: Mobile, Tablet & Desktop optimiert
- **Live Updates**: Auto-Refresh alle 30 Sekunden
- **Activity Logs**: Alle Aktionen werden protokolliert

## 🛠️ Installation & Setup

### Schritt 1: Dependencies installieren
```bash
npm install
```

### Schritt 2: Datenbank vorbereiten
```bash
npm run setup-panel
```

Dies erstellt automatisch alle notwendigen Tabellen:
- `bot_settings`
- `mod_logs`
- `admin_logs`
- `greeting_responses`

### Schritt 3: Bot starten
```bash
npm start
```

Der Bot startet und der Web Panel läuft auf **Port 22020**.

## 🌐 Zugriff auf das Panel

**Lokal (im gleichen Netzwerk):**
```
http://localhost:22020
```

**Remote (von überall):**
```
https://maxx-os.page.gd
```

## 📱 Web Panel - Bedienung

### 🏠 Hauptdashboard

**Verfügbare Aktionen:**
1. **Begrüßungsfunktion togglen**
   - Auf der Seite den Toggle bei "Einstellungen" umschalten
   - Einstellung wird sofort gespeichert

2. **Statistiken ansehen**
   - Aktive Nutzer
   - Verwarnungen heute
   - Admin-Aktionen
   - Bot Uptime

3. **Zu Dashboards navigieren**
   - Klick auf "Mod Dashboard" Link → Zu Moderator Panel
   - Klick auf "Admin Dashboard" Link → Zu Admin Panel

### 👮 Moderator Dashboard

**Verfügbare Funktionen:**

#### Benutzer suchen
```
1. Suchbar oben verwenden
2. Nach Username oder User-ID suchen
3. Live-Filterung der Ergebnisse
```

#### Benutzer verwalten
```
Für jeden Benutzer:
- [👤 Info] Button → Detaillierte Infos anschauen
- [⚠️ Warnen] Button → Neue Verwarnung hinzufügen
- [🗑️ Löschen] Button → Verwarnung entfernen
```

#### Benutzer Details
```
Zeigt:
- Avatar & Username
- Discord ID
- Joindate
- Aktuelle Rollen
- Verwarnung-Count
- Ban-Grund (falls vorhanden)
```

#### Activity Logs
```
Alle Moderator-Aktionen werden angezeigt:
- Aktion (WARN, WARN_REMOVED)
- Betroffener Benutzer
- Grund (falls vorhanden)
- Zeitstempel
```

### ⚙️ Admin Dashboard

**Verfügbare Funktionen:**

#### 1. Nachrichtenvorlage erstellen
```
1. Zielkanal auswählen
2. Rolle für Button auswählen
3. Button Text eingeben (optional)
4. Nachricht schreiben
5. [📤 Nachricht senden] klicken
```

#### 2. Platzhalter verwenden
```
@deadchat = wird durch die ausgewählte Rolle ersetzt

Beispiel:
Input:  "Guten Morgen @deadchat!"
Output: "Guten Morgen @everyone!" (oder die gewählte Rolle)
```

#### 3. Vorgefertigte Vorlagen
```
Klick auf eine Vorlage, um sie zu laden:
- 🌅 Guten Morgen
- 🌙 Gute Nacht
- 🎉 Event Ankündigung
- 🎁 Giveaway
- 📢 Wichtige Ankündigung
- 👋 Willkommen
```

#### 4. Button-Funktionalität
```
Nach dem Senden wird ein Button hinzugefügt:
[📌 Ping mich auch]

Wenn Benutzer klickt:
→ Benutzer erhält die ausgewählte Rolle automatisch
```

#### 5. Admin Logs
```
Alle gesendeten Nachrichten werden geloggt:
- Aktion
- Kanal
- Nachricht (gekürzt)
- Zeitstempel
```

## 🎮 Bot-Befehle und Features

### Begrüßungen
```
Wenn Benutzer schreibt:
- "Hallo"
- "Hi"
- "Servus"
- "Hey"
- "Heyy"
- etc.

Bot antwortet automatisch mit:
- Zufällige Begrüßung
- Freundlich & Community-bezogen
```

### Weitere Bot-Features
```
Siehe index.js für:
- Quest System
- Shop System
- Ticket System
- Music System
- Voice Management
- Automatic Advertising
```

## 📊 Datenbank-Schema

### bot_settings
```sql
setting_key: VARCHAR (unique)
setting_value: LONGTEXT
updated_at: TIMESTAMP
```

### mod_logs
```sql
user_id: VARCHAR (wer wurde verwarnt)
action: VARCHAR (WARN, WARN_REMOVED)
reason: VARCHAR (Grund)
timestamp: TIMESTAMP
```

### admin_logs
```sql
action: VARCHAR (SEND_MESSAGE)
channel_id: VARCHAR (wo gesendet)
message: LONGTEXT (Inhalt)
role_id: VARCHAR (welche Rolle)
timestamp: TIMESTAMP
```

### greeting_responses
```sql
user_id: VARCHAR (wer wurde begrüßt)
greeted_at: TIMESTAMP
```

## 🔄 Auto-Funktionen

### Auto-Refresh (30 Sekunden)
```
Folgende Daten werden automatisch aktualisiert:
- Statistiken auf dem Dashboard
- Benutzerliste im Mod Panel
- Aktivitäts-Logs überall
- Admin Logs
```

### Auto-Speicherung
```
Folgende Einstellungen werden automatisch gespeichert:
- Begrüßungsfunktion An/Aus
- Verwarnungen
- Nachrichten
```

## ⚙️ Konfiguration

### Guild ID ändern (falls notwendig)
**Datei:** `panel-server.js` (Zeile ~17)
```javascript
let guildId = '1432030848686153748'; // Deine Guild ID hier
```

### MySQL Credentials
**Datei:** `panel-server.js` (Zeile ~20-27)
```javascript
const pool = mysql.createPool({
  host: 'db.novium.world',
  port: 3306,
  user: 'u113_HmasG0S0s7',
  password: '!oNCB8S72Z+.euzVQgp+88cJ',
  database: 's113_Maxx-OS-Main'
});
```

### Port ändern
**Datei:** `panel-server.js` (Zeile ~14)
```javascript
const PORT = 22020; // Anderen Port hier setzen
```

## 🛡️ Sicherheit

### Best Practices
```
✅ Verwende starke Passwörter für Admin
✅ Überprüfe Bot-Permissions regelmäßig
✅ Backup Datenbank regelmäßig
✅ Logs regelmäßig überprüfen
```

### Berechtigungen für Bot
```
Erforderlich:
- Nachrichten senden
- Rollen verwalten
- Kanäle lesen
- Nachrichten lesen
- Benutzer verwalten
```

## 📋 Logs und Debugging

### Logs anschauen
```bash
# Bot Logs in der Konsole sehen
npm start
```

### Debug-Informationen
```javascript
// In panel-server.js findest du:
console.log('🌐 Web Panel läuft...');
```

### Fehler beheben

**Panel lädt nicht:**
- Port 22020 ist blockiert?
- Bot ist nicht gestartet?
- Firewall-Einstellung?

**Buttons funktionieren nicht:**
- Bot hat keine Permissions?
- Guild ID korrekt?
- Rolle existiert?

**Datenbank-Fehler:**
- MySQL läuft?
- Verbindung OK?
- Credentials korrekt?

## 📞 Hilfreiche Commands

```bash
# Alle Dependencies installieren
npm install

# Setup durchführen
npm run setup-panel

# Bot starten (normal)
npm start

# Bot starten (mit Datei-Überwachung für Entwicklung)
npm run dev

# Discord Slash Commands deployen
npm run deploy
```

## 📱 Responsive Design

Das Panel funktioniert auf:
- 📱 **Smartphones** (320px+)
- 📱 **Tablets** (768px+)
- 💻 **Desktops** (1024px+)
- 🖥️ **Ultra-Wide** (1920px+)

## 🎨 Design Features

- Modern Tabler Framework
- Inline CSS & JavaScript (Single File)
- Gradient Backgrounds
- Sanfte Animationen
- Icons
- Light/Dark Mode Ready
- Responsive Grid Layout

## 🚀 Performance

- Sehr schnelle Ladezeiten (<1s)
- Optimierte Datenbank-Queries
- Effiziente API Calls
- Minimal JavaScript (alles inline)
- Keine externen Dependencies für Frontend

## 📚 Weitere Dokumentation

Siehe auch:
- `README.md` - Übersicht
- `QUICKSTART.md` - Schnellstart Guide

## 🎓 Learning Resources

```
Technologien:
- Discord.js (Bot Development)
- Express.js (Web Framework)
- MySQL (Datenbank)
- Tabler (UI Framework)
- HTML/CSS/JavaScript (Single File)
```

## 🤝 Support

Bei Fragen:
1. Überprüfe die Logs
2. Lese die Dokumentation
3. Kontaktiere den Admin

## 🎉 Viel Spaß!

Dein Web Panel ist jetzt vollständig eingerichtet und einsatzbereit!

**Alle Features zusammengefasst:**
- ✅ Automatische Begrüßungen
- ✅ Moderator Dashboard
- ✅ Admin Dashboard
- ✅ Live Statistiken
- ✅ Aktivitäts-Logs
- ✅ Nachrichtenvorlagen
- ✅ Button-Funktionen
- ✅ Responsive Design
- ✅ Single HTML File (Keine externe JS!)

---

**Made with ❤️ für deine Discord Community**

Versionsverlauf:
- v2.0.0 - Single HTML File Version (Aktuelle)
- v1.0.0 - Multi-File Version
