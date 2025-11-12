# ⚙️ PANEL KONFIGURATION

## 🚀 WIE DAS PANEL FUNKTIONIERT

### Architektur:
```
maxx-os.page.gd (Frontend - HTML/CSS/JS)
        ↓ (API Requests mit CORS)
localhost:22020 (Backend - Express API)
        ↓ (MySQL Queries)
db.novium.world (Datenbank - MySQL)
```

---

## 🔧 SETUP

### 1. Bot & Panel Server lokal starten
```bash
npm start
```

**Output:**
```
🚀 Bot lädt...
🌐 Web Panel läuft auf Port 22020
📍 Erreichbar unter: http://localhost:22020
📍 Remote erreichbar unter: https://maxx-os.page.gd
```

### 2. Browser öffnen
```
https://maxx-os.page.gd
```

**Was passiert:**
1. Browser lädt HTML von `maxx-os.page.gd`
2. JavaScript sendet API-Requests zu `http://localhost:22020/api/...`
3. Browser erlaubt cross-origin requests (CORS ist aktiviert)
4. Panel-Server antwortet mit Daten
5. Dashboard wird aktualisiert

---

## 📡 API URLS

### Lokal (für Testing)
```
http://localhost:22020/api/admin/statistics
http://localhost:22020/api/greeting-status
http://localhost:22020/api/mod/users
```

### Remote (von maxx-os.page.gd)
```
Origin: https://maxx-os.page.gd
Requests zu: http://localhost:22020/api/...
(Das funktioniert nur wenn der Bot lokal läuft!)
```

---

## 🔐 CORS KONFIGURATION

Der Panel-Server hat folgende CORS-Header:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Das erlaubt Requests von überall (einschließlich maxx-os.page.gd).

---

## ⚡ WICHTIG

Der Panel-Server **muss lokal auf Port 22020 laufen**, damit das Panel von `maxx-os.page.gd` auf die APIs zugreifen kann!

### Benutzerfluss:
```
1. npm start                           (Bot & Panel Server starten)
   ↓
2. Öffne https://maxx-os.page.gd      (Im Browser)
   ↓
3. JavaScript sendet API-Request       (CORS erlaubt es)
   ↓
4. localhost:22020 antwortet           (Mit Daten)
   ↓
5. Dashboard aktualisiert sich         (Mit den Daten)
```

---

## 🧪 TESTEN

### Test in Browser Console:
```javascript
// Test ob API erreichbar ist
fetch('http://localhost:22020/api/greeting-status')
  .then(r => r.json())
  .then(d => console.log('✅ API funktioniert:', d))
  .catch(e => console.error('❌ Fehler:', e))
```

### Erwartete Ausgabe:
```
✅ API funktioniert: {success: true, data: {enabled: 1}}
```

---

## 📊 PROBLEM LÖSUNG

### Problem: "CORS Error" im Browser
**Lösung:** 
- Prüfe ob `npm start` läuft
- Prüfe ob Port 22020 nicht blockiert ist
- Prüfe CORS Header in panel-server.js

### Problem: "404 Error"
**Lösung:**
- Panel-Server muss laufen (`npm start`)
- Port 22020 muss erreichbar sein
- API Endpoints müssen in panel-server.js definiert sein

### Problem: "API antwortet nicht"
**Lösung:**
- Prüfe MySQL Verbindung
- Prüfe Datenbank-Credentials
- Prüfe Bot ist gestartet (für setBot() Funktion)

---

## 🔑 KONFIGURATION

### In `panel-server.js`:

**Port:**
```javascript
const PORT = 22020; // Kann geändert werden
```

**CORS Origins (aktuell: alle):**
```javascript
origin: '*' // Ändere auf bestimmte Domain wenn nötig
```

**Guild ID:**
```javascript
let guildId = '1432030848686153748'; // Deine Guild ID
```

**MySQL:**
```javascript
host: 'db.novium.world'
user: 'u113_HmasG0S0s7'
password: '!oNCB8S72Z+.euzVQgp+88cJ'
database: 's113_Maxx-OS-Main'
```

---

## 📱 PANEL IN panel.html

Die `API_BASE_URL` wird automatisch konfiguriert:
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:22020'
    : 'http://localhost:22020'; // Immer zu lokal
```

Das bedeutet: Egal von wo aus du aufrufst, es verbindet sich zu `localhost:22020`.

---

## ✅ CHECKLISTE

Bevor du startest:
- [ ] `npm install` durchgeführt
- [ ] `npm run setup-panel` durchgeführt
- [ ] Discord Token in `.env` ist gesetzt
- [ ] MySQL Credentials stimmen
- [ ] Port 22020 ist nicht blockiert
- [ ] `npm start` funktioniert ohne Fehler

Dann:
- [ ] Öffne https://maxx-os.page.gd
- [ ] Überprüfe Browser Console auf Fehler
- [ ] Teste die Dashboards
- [ ] Teste die API Requests

---

**Status**: ✅ Alles funktioniert!
