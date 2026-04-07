# CreeperTiers

A Minecraft PvP tier rankings website with an admin panel and SQLite database.

## Features
- Public rankings page with gamemode filters
- HT1..HT5 and LT1..LT5 tier support
- Admin panel login using email and password
- Add or update player entries with username, region, gamemode, and tier
- Minecraft player head avatar shown for entries
- SQLite database persistence

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000`

## Notes
- The data is stored in `tiers.db`.
- Login is protected with a static token for the admin panel.
