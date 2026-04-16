const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// --- config ---
const PORT = 22015
const HOST = 'nodejs2.dszcbaross.edu.hu'
const JWT_SECRET = 'jegyzet_titkos_kulcs'
const JWT_EXPIRES_IN = '7d'
const COOKIE_NAME = 'auth_token'

// --- cookie beállítás ---
const COOKIE_OPTS = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
}

// --- adatbázis beállítás ---
const db = mysql.createPool({
    host: 'localhost',
    port: '3306',
    user: 'container',
    password: 'container',
    database: 'jegyzetapp'
})

// --- APP ---
const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: ['http://nodejs2.dszcbaross.edu.hu:22015', 'https://nodejs215.dszcbaross.edu.hu'],
    credentials: true
}))

// --- Middleware ---
function auth(req, res, next) {
    const token = req.cookies[COOKIE_NAME]
    if (!token) {
        return res.status(409).json({ message: "Nincs bejelentkezés" })
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET)
        next()
    } catch (error) {
        return res.status(410).json({ message: "Nem érvényes token" })
    }
}

// --- végpontok ---
app.post('/api/register', async (req, res) => {
    const { name, username, password } = req.body
    if (!name || !username || !password) {
        return res.status(400).json({ message: "Minden mezőt ki kell tölteni!" })
    }
    try {
        const [exists] = await db.query('SELECT id FROM users WHERE username = ?', [username])
        if (exists.length) {
            return res.status(402).json({ message: "Ez a felhasználónév már foglalt!" })
        }
        const hash = await bcrypt.hash(password, 10)
        const [result] = await db.query(
            'INSERT INTO users (name, username, password) VALUES (?, ?, ?)',
            [name, username, hash]
        )
        return res.status(200).json({ message: "Sikeres regisztráció!", id: result.insertId })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        return res.status(400).json({ message: "Minden mezőt ki kell tölteni!" })
    }
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username])
        if (!rows.length) {
            return res.status(401).json({ message: "Hibás felhasználónév vagy jelszó!" })
        }
        const user = rows[0]
        const ok = await bcrypt.compare(password, user.password)
        if (!ok) {
            return res.status(401).json({ message: "Hibás felhasználónév vagy jelszó!" })
        }
        const token = jwt.sign(
            { id: user.id, name: user.name, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        )
        res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
        return res.status(200).json({ message: "Sikeres belépés" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

app.post('/api/logout', auth, (req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/' })
    return res.status(200).json({ message: "Sikeres kijelentkezés" })
})

app.get('/api/me', auth, (req, res) => {
    return res.status(200).json(req.user)
})

app.get('/api/notes', auth, async (req, res) => {
    try {
        const [notes] = await db.query(
            'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        )
        return res.status(200).json(notes)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

app.post('/api/notes', auth, async (req, res) => {
    const { title, content } = req.body
    if (!title || !content) {
        return res.status(400).json({ message: "Minden mezőt ki kell tölteni!" })
    }
    try {
        await db.query(
            'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
            [req.user.id, title, content]
        )
        return res.status(200).json({ message: "Jegyzet létrehozva!" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

app.put('/api/notes/:id', auth, async (req, res) => {
    const { id } = req.params
    const { title, content } = req.body
    if (!title || !content) {
        return res.status(400).json({ message: "Minden mezőt ki kell tölteni!" })
    }
    try {
        const [result] = await db.query(
            'UPDATE notes SET title = ?, content = ? WHERE id = ? AND user_id = ?',
            [title, content, id, req.user.id]
        )
        if (!result.affectedRows) {
            return res.status(404).json({ message: "Jegyzet nem található!" })
        }
        return res.status(200).json({ message: "Jegyzet frissítve!" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

app.delete('/api/notes/:id', auth, async (req, res) => {
    const { id } = req.params
    try {
        const [result] = await db.query(
            'DELETE FROM notes WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        )
        if (!result.affectedRows) {
            return res.status(404).json({ message: "Jegyzet nem található!" })
        }
        return res.status(200).json({ message: "Jegyzet törölve!" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

app.put('/api/username', auth, async (req, res) => {
    const { ujUsername } = req.body
    if (!ujUsername) {
        return res.status(400).json({ message: "Az új felhasználónév megadása kötelező" })
    }
    try {
        const [exists] = await db.query('SELECT id FROM users WHERE username = ?', [ujUsername])
        if (exists.length) {
            return res.status(402).json({ message: "Ez a felhasználónév már foglalt!" })
        }
        await db.query('UPDATE users SET username = ? WHERE id = ?', [ujUsername, req.user.id])
        return res.status(200).json({ message: "Sikeresen módosult a felhasználónév" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

app.put('/api/jelszo', auth, async (req, res) => {
    const { jelenlegiJelszo, ujJelszo } = req.body
    if (!jelenlegiJelszo || !ujJelszo) {
        return res.status(400).json({ message: "Hiányzó bemeneti adatok" })
    }
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id])
        const ok = await bcrypt.compare(jelenlegiJelszo, rows[0].password)
        if (!ok) {
            return res.status(401).json({ message: "A régi jelszó nem helyes" })
        }
        const hash = await bcrypt.hash(ujJelszo, 10)
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id])
        return res.status(200).json({ message: "Sikeresen módosult a jelszavad" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

app.delete('/api/fiokom', auth, async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.user.id])
        res.clearCookie(COOKIE_NAME, { path: '/' })
        return res.status(200).json({ message: "Sikeres fióktörlés" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Szerverhiba" })
    }
})

// --- szerver elindítása ---
app.listen(PORT, () => {
    console.log(`API fut: http://${HOST}:${PORT}/`)
})
