import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const app = express()
const port = process.env.PORT || 3000

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'swimshop_db',
  waitForConnections: true,
  connectionLimit: 10,
}

console.log('DB config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
})

const pool = mysql.createPool(dbConfig)

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

app.get('/api/categories', async (_req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name FROM categories ORDER BY name')
    return res.json({ categories: rows })
  } catch (error) {
    console.error('Categories error', error)
    return res.status(500).json({ message: 'Ошибка получения категорий товаров' })
  }
})

app.get('/api/products', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        p.id,
        p.name,
        p.price,
        p.discount,
        p.description,
        p.category_id AS categoryId,
        c.name AS category,
        m.name AS manufacturer,
        COALESCE(SUM(s.quantity), 0) AS stock,
        MIN(i.image) AS image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      LEFT JOIN storages s ON s.product_id = p.id
      LEFT JOIN images i ON i.product_id = p.id
      GROUP BY
        p.id,
        p.name,
        p.price,
        p.discount,
        p.description,
        p.category_id,
        c.name,
        m.name
      ORDER BY p.name`
    )

    return res.json({ products: rows })
  } catch (error) {
    console.error('Products error', error)
    return res.status(500).json({ message: 'Ошибка получения каталога товаров' })
  }
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
