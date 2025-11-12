# ⚡ QUICK START - Maxx OS Panel v2.0.0

## 🎯 TL;DR

```bash
npm install
npm run setup-panel
npm start
```

Dann öffne: **https://maxx-os.page.gd**

---

## 🆕 WAS IST NEU?

✨ **Single HTML File** - Alles in `public/panel.html`
- Keine `utils.js` mehr
- Kein separater JavaScript Code
- Alles inline - CSS & JavaScript

---

## 📝 WHAT'S INSIDE?

### panel.html (990 Zeilen)

```
✅ Inline CSS (Styling)
✅ Inline JavaScript (Logic)
✅ 3 Dashboards in einem Tab-System
✅ 12 API Endpoints
✅ Responsive Design
✅ Notifications
✅ Modals
```

---

## 🚀 START

```bash
# 1. Dependencies
npm install

# 2. Database
npm run setup-panel

# 3. Bot & Panel
npm start
```

**Port 22020 läuft automatisch!**

---

## 🌐 ACCESS

```
Local:    http://localhost:22020
Remote:   http://node2.novium.world:22020
```

---

## 📊 3 TABS

### 🏠 Dashboard
- Live Stats
- Settings Toggle
- Schnellzugriff

### 👮 Moderator
- User Management
- Warnings
- Logs

### ⚙️ Admin
- Message Templates
- Discord Messages
- Logs

---

## ✨ FEATURES

✅ Real-time Search  
✅ Auto-Refresh (30s)  
✅ Live Notifications  
✅ User Details Modal  
✅ Message Preview  
✅ Button Integration  

---

## 📦 DATEIEN

```
public/
└── panel.html ← ALLES IN EINER DATEI!

panel-server.js ← Express Backend
```

---

## 💡 WICHTIG

✅ Alles funktioniert wie zuvor  
✅ Alle API Endpoints aktiv  
✅ Responsive auf Mobile  
✅ Keine Fehler  
✅ Production Ready  

---

## 🔧 TROUBLESHOOTING

**Panel lädt nicht?**
- Port 22020 blockiert? `netstat -ano | findstr :22020`
- Bot nicht gestartet? Prüf die Console
- MySQL down? Prüf Verbindung

**Buttons funktionieren nicht?**
- Bot Permissions? `Administrator` benötigt
- Guild ID? Prüf in `panel-server.js` Zeile ~17

**Datenbank Fehler?**
- Credentials? Prüf `panel-server.js` Zeile ~20-27
- MySQL läuft? `mysql -h db.novium.world`

---

## 📞 DOCS

- `README.md` - Übersicht
- `FULL_SETUP_GUIDE.md` - Detailliert
- `QUICKSTART.md` - Dieser Guide
- `FINAL_SUMMARY.md` - Was sich geändert hat
- `PANEL_REFACTORING_COMPLETE.md` - Technisches

---

## 🎉 VIEL SPASS!

Dein Panel ist **Production Ready**! 🚀

---

**Version**: 2.0.0  
**Status**: ✅ Ready
