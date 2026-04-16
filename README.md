# Jegyzet App Backend

## Telepítés

1. Telepítsd a függőségeket:
```bash
cd backend
npm install
```

2. Állítsd be a MySQL adatbázist:
   - Győződj meg róla, hogy a MySQL szerver fut
   - Szerkeszd a `.env` fájlt az adatbázis beállításokkal:
     - DB_HOST: localhost
     - DB_USER: root (vagy a te felhasználóneved)
     - DB_PASSWORD: (a te jelszavad)
     - DB_NAME: jegyzetapp

3. Indítsd el a szervert:
```bash
npm start
```

A szerver a http://localhost:3000 címen fog futni.

## API Végpontok

### Autentikáció
- POST `/api/register` - Új felhasználó regisztrálása
- POST `/api/login` - Bejelentkezés

### Jegyzetek
- GET `/api/notes/:userId` - Felhasználó jegyzeteinek lekérése
- POST `/api/notes` - Új jegyzet létrehozása
- PUT `/api/notes/:id` - Jegyzet frissítése
- DELETE `/api/notes/:id` - Jegyzet törlése

## Adatbázis Struktúra

### users tábla
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- name (VARCHAR)
- username (VARCHAR, UNIQUE)
- password (VARCHAR, hashed)
- created_at (TIMESTAMP)

### notes tábla
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- user_id (INT, FOREIGN KEY)
- title (VARCHAR)
- content (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
