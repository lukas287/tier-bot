const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'tiers.db');
const ADMIN_EMAIL = 'creepertiers@gmail.com';
const ADMIN_PASSWORD = 'acyyyy_goat';
const AUTH_TOKEN = 'creepertiers-admin-token';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function initDatabase() {
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      region TEXT NOT NULL,
      gamemode TEXT NOT NULL,
      tier TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(username, region, gamemode)
    )`);
  });
  return db;
}

function tierValue(tier) {
  if (!tier) return 0;
  const match = tier.match(/^(HT|LT)([1-5])$/);
  if (!match) return 0;
  const prefix = match[1];
  const number = Number(match[2]);
  if (prefix === 'HT') return 100 - number;
  return 10 - number;
}

const db = initDatabase();

app.get('/api/entries', (req, res) => {
  const gamemode = req.query.gamemode;
  let query = 'SELECT * FROM entries';
  const params = [];
  if (gamemode && gamemode !== 'Overall') {
    query += ' WHERE gamemode = ?';
    params.push(gamemode);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to load entries.' });
    rows.sort((a, b) => {
      const scoreA = tierValue(a.tier);
      const scoreB = tierValue(b.tier);
      if (scoreA !== scoreB) return scoreB - scoreA;
      if (a.username.toLowerCase() < b.username.toLowerCase()) return -1;
      if (a.username.toLowerCase() > b.username.toLowerCase()) return 1;
      return 0;
    });
    res.json(rows);
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: AUTH_TOKEN });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials.' });
});

app.post('/api/entry', (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { username, region, gamemode, tier } = req.body;
  if (!username || !region || !gamemode || !tier) {
    return res.status(400).json({ success: false, message: 'Missing fields.' });
  }

  db.run(
    `INSERT INTO entries (username, region, gamemode, tier)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(username, region, gamemode)
     DO UPDATE SET tier = excluded.tier, updated_at = CURRENT_TIMESTAMP`,
    [username, region, gamemode, tier],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to save entry.' });
      }
      res.json({ success: true, entryId: this.lastID });
    }
  );
});

app.delete('/api/entry', (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { username, region, gamemode } = req.query;
  if (!username || !region || !gamemode) {
    return res.status(400).json({ success: false, message: 'Missing fields.' });
  }

  db.run(
    `DELETE FROM entries WHERE username = ? AND region = ? AND gamemode = ?`,
    [username, region, gamemode],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete entry.' });
      }
      res.json({ success: true, deleted: this.changes });
    }
  );
});

app.delete('/api/member', (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Missing username.' });
  }

  db.run(
    `DELETE FROM entries WHERE username = ?`,
    [username],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete member.' });
      }
      res.json({ success: true, deleted: this.changes });
    }
  );
});

app.get('/api/members', (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  db.all(
    `SELECT DISTINCT username FROM entries ORDER BY username`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch members.' });
      }
      res.json(rows.map(row => row.username));
    }
  );
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CreeperTiers app running on http://localhost:${PORT}`);
});
