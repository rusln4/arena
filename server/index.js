import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const app = express()
const port = process.env.PORT || 3000

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'shop_db',
  waitForConnections: true,
  connectionLimit: 10,
})

app.use(cors())
app.use(express.json())

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ message: 'Заполните email и пароль' })
    }

    const [rows] = await pool.execute(
      'SELECT id, lastname, name, midname, email, role FROM users WHERE email = ? AND password = ? LIMIT 1',
      [email, password]
    )

    if (!rows.length) {
      return res.status(401).json({ message: 'Неверный email или пароль' })
    }

    const user = rows[0]
    return res.json({ user })
  } catch (error) {
    console.error('Login error', error)
    return res.status(500).json({ message: 'Ошибка соединения с БД при авторизации' })
  }
})

app.post('/api/register', async (req, res) => {
  try {
    const { lastname, name, midname, email, password } = req.body || {}

    if (!lastname || !name || !email || !password) {
      return res.status(400).json({ message: 'Заполните все обязательные поля' })
    }

    const [exists] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email])

    if (exists.length) {
      return res.status(409).json({ message: 'Пользователь с таким email уже существует' })
    }

    const [result] = await pool.execute(
      'INSERT INTO users (lastname, name, midname, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [lastname, name, midname || null, email, password, 'клиент']
    )

    const insertedId = result.insertId

    const [rows] = await pool.execute(
      'SELECT id, lastname, name, midname, email, role FROM users WHERE id = ? LIMIT 1',
      [insertedId]
    )

    const user = rows[0]

    return res.status(201).json({ user })
  } catch (error) {
    console.error('Register error', error)
    return res.status(500).json({ message: 'Ошибка соединения с БД при регистрации' })
  }
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
