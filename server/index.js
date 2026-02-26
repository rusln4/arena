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

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (String(email).length > 254 || !emailRe.test(String(email))) {
      return res.status(400).json({ message: 'Некорректный формат email' })
    }
    if (String(password).length < 6 || String(password).length > 64) {
      return res.status(400).json({ message: 'Пароль должен быть от 6 до 64 символов' })
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

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (String(email).length > 254 || !emailRe.test(String(email))) {
      return res.status(400).json({ message: 'Некорректный формат email' })
    }
    if (String(password).length < 6 || String(password).length > 64) {
      return res.status(400).json({ message: 'Пароль должен быть от 6 до 64 символов' })
    }
    if (String(lastname).trim().length < 1 || String(lastname).length > 100) {
      return res.status(400).json({ message: 'Фамилия должна быть от 1 до 100 символов' })
    }
    if (String(name).trim().length < 1 || String(name).length > 100) {
      return res.status(400).json({ message: 'Имя должно быть от 1 до 100 символов' })
    }
    if (midname != null && String(midname).length > 100) {
      return res.status(400).json({ message: 'Отчество не должно превышать 100 символов' })
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

app.get('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный идентификатор пользователя' })
    }

    const [rows] = await pool.execute(
      'SELECT id, lastname, name, midname, email, role FROM users WHERE id = ? LIMIT 1',
      [id]
    )

    if (!rows.length) {
      return res.status(404).json({ message: 'Пользователь не найден' })
    }

    const user = rows[0]
    return res.json({ user })
  } catch (error) {
    console.error('Get user error', error)
    return res.status(500).json({ message: 'Ошибка получения данных пользователя' })
  }
})

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { lastname, name, midname, email } = req.body || {}

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный идентификатор пользователя' })
    }

    if (!lastname || !name || !email) {
      return res.status(400).json({ message: 'Заполните фамилию, имя и email' })
    }

    const [exists] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [id])

    if (!exists.length) {
      return res.status(404).json({ message: 'Пользователь не найден' })
    }

    await pool.execute(
      'UPDATE users SET lastname = ?, name = ?, midname = ?, email = ? WHERE id = ?',
      [lastname, name, midname || null, email, id]
    )

    const [rows] = await pool.execute(
      'SELECT id, lastname, name, midname, email, role FROM users WHERE id = ? LIMIT 1',
      [id]
    )

    const user = rows[0]
    return res.json({ user })
  } catch (error) {
    console.error('Update user error', error)
    return res.status(500).json({ message: 'Ошибка обновления профиля пользователя' })
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
        MIN(i.image) AS imagePath
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

app.get('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный идентификатор товара' })
    }

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
        MIN(i.image) AS imagePath
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      LEFT JOIN storages s ON s.product_id = p.id
      LEFT JOIN images i ON i.product_id = p.id
      WHERE p.id = ?
      GROUP BY
        p.id,
        p.name,
        p.price,
        p.discount,
        p.description,
        p.category_id,
        c.name,
        m.name
      LIMIT 1`,
      [id]
    )

    if (!rows.length) {
      return res.status(404).json({ message: 'Товар не найден' })
    }

    return res.json({ product: rows[0] })
  } catch (error) {
    console.error('Product by id error', error)
    return res.status(500).json({ message: 'Ошибка получения данных товара' })
  }
})

app.get('/api/manufacturers', async (_req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name FROM manufacturers ORDER BY name')
    return res.json({ manufacturers: rows })
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка получения производителей' })
  }
})

app.get('/api/product-image/:productId', async (req, res) => {
  try {
    const productId = Number(req.params.productId)
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Некорректный идентификатор товара' })
    }

    const [rows] = await pool.execute(
      'SELECT image FROM images WHERE product_id = ? ORDER BY id LIMIT 1',
      [productId]
    )

    if (!rows.length || !rows[0].image) {
      return res.status(404).end()
    }

    const filePath = rows[0].image
    return res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Image send error', err)
        if (!res.headersSent) {
          res.status(404).end()
        }
      }
    })
  } catch (error) {
    console.error('Product image error', error)
    return res.status(500).json({ message: 'Ошибка загрузки изображения товара' })
  }
})

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, discount = 0, description = null, categoryId, manufacturerId = null, stock = null } = req.body || {}
    if (!name || categoryId == null || price == null) {
      return res.status(400).json({ message: 'Заполните название, категорию и цену' })
    }
    const [ins] = await pool.execute(
      'INSERT INTO products (name, price, discount, description, category_id, manufacturer_id) VALUES (?, ?, ?, ?, ?, ?)',
      [String(name), Number(price), Number(discount) || 0, description, Number(categoryId), manufacturerId != null ? Number(manufacturerId) : null]
    )
    const productId = ins.insertId
    if (stock != null) {
      const qty = Math.max(0, Number(stock) || 0)
      if (qty > 0) {
        await pool.execute('INSERT INTO storages (product_id, quantity) VALUES (?, ?)', [productId, qty])
      }
    }
    const [rows] = await pool.execute(
      `SELECT p.id, p.name, p.price, p.discount, p.description, p.category_id AS categoryId
       FROM products p WHERE p.id = ? LIMIT 1`,
      [productId]
    )
    return res.status(201).json({ product: rows[0] })
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка создания товара' })
  }
})

app.put('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный идентификатор товара' })
    }
    const { name, price, discount, description, categoryId, manufacturerId, stock } = req.body || {}
    if (name != null && String(name).trim() === '') {
      return res.status(400).json({ message: 'Название не может быть пустым' })
    }
    if (price != null && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ message: 'Цена должна быть неотрицательным числом' })
    }
    if (discount != null) {
      const d = Number(discount) || 0
      if (d < 0 || d > 99) return res.status(400).json({ message: 'Скидка должна быть от 0 до 99' })
    }
    if (categoryId != null) {
      const [ce] = await pool.execute('SELECT id FROM categories WHERE id = ? LIMIT 1', [Number(categoryId)])
      if (!ce.length) return res.status(400).json({ message: 'Категория не найдена' })
    }
    if (manufacturerId != null) {
      if (manufacturerId === '' || manufacturerId === false) {
        // no-op
      } else {
        const [me] = await pool.execute('SELECT id FROM manufacturers WHERE id = ? LIMIT 1', [Number(manufacturerId)])
        if (!me.length) return res.status(400).json({ message: 'Производитель не найден' })
      }
    }
    const fields = []
    const values = []
    if (name != null) { fields.push('name = ?'); values.push(String(name)) }
    if (price != null) { fields.push('price = ?'); values.push(Number(price)) }
    if (discount != null) { fields.push('discount = ?'); values.push(Number(discount) || 0) }
    if (description !== undefined) { fields.push('description = ?'); values.push(description) }
    if (categoryId != null) { fields.push('category_id = ?'); values.push(Number(categoryId)) }
    if (manufacturerId !== undefined) { fields.push('manufacturer_id = ?'); values.push(manufacturerId != null ? Number(manufacturerId) : null) }
    if (fields.length) {
      await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
    }
    if (stock != null) {
      const qty = Math.max(0, Number(stock) || 0)
      await pool.execute('DELETE FROM storages WHERE product_id = ?', [id])
      if (qty > 0) {
        await pool.execute('INSERT INTO storages (product_id, quantity) VALUES (?, ?)', [id, qty])
      }
    }
    const [rows] = await pool.execute('SELECT id FROM products WHERE id = ? LIMIT 1', [id])
    if (!rows.length) {
      return res.status(404).json({ message: 'Товар не найден' })
    }
    return res.json({ ok: true })
  } catch (error) {
    console.error('Update product error', error)
    return res.status(500).json({ message: `Ошибка обновления товара` })
  }
})

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный идентификатор товара' })
    }
    await pool.execute('DELETE FROM images WHERE product_id = ?', [id])
    await pool.execute('DELETE FROM storages WHERE product_id = ?', [id])
    const [resDel] = await pool.execute('DELETE FROM products WHERE id = ?', [id])
    if (resDel.affectedRows === 0) {
      return res.status(404).json({ message: 'Товар не найден' })
    }
    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка удаления товара' })
  }
})

app.post('/api/checkout', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { userId, items } = req.body || {}
    if (!Array.isArray(items) || items.length === 0) {
      conn.release()
      return res.status(400).json({ message: 'Корзина пуста' })
    }

    await conn.beginTransaction()

    const ensureTablesSql = [
      `CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price INT NOT NULL,
        discount INT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )`,
    ]
    for (const sql of ensureTablesSql) {
      await conn.execute(sql)
    }
    const [totalCol] = await conn.execute(`SHOW COLUMNS FROM orders LIKE 'total'`)
    if (!Array.isArray(totalCol) || totalCol.length === 0) {
      await conn.execute('ALTER TABLE orders ADD COLUMN total INT NOT NULL DEFAULT 0')
    }

    const insufficient = []
    for (const it of items) {
      const pid = Number(it.id)
      const qty = Math.max(1, Number(it.quantity || 0))
      const [rows] = await conn.execute(
        'SELECT COALESCE(SUM(quantity), 0) AS stock FROM storages WHERE product_id = ?',
        [pid]
      )
      const stock = Number(rows[0].stock || 0)
      if (stock < qty) {
        insufficient.push({ productId: pid, requested: qty, stock })
      }
    }
    if (insufficient.length) {
      await conn.rollback()
      conn.release()
      return res.status(409).json({ message: 'Недостаточно товара на складе', insufficient })
    }

    for (const it of items) {
      const pid = Number(it.id)
      let remain = Math.max(1, Number(it.quantity || 0))
      const [rows] = await conn.execute(
        'SELECT id, quantity FROM storages WHERE product_id = ? ORDER BY quantity DESC, id ASC',
        [pid]
      )
      for (const r of rows) {
        if (remain <= 0) break
        const take = Math.min(remain, Number(r.quantity))
        const newQty = Number(r.quantity) - take
        await conn.execute('UPDATE storages SET quantity = ? WHERE id = ?', [newQty, r.id])
        remain -= take
      }
      if (remain > 0) {
        await conn.rollback()
        conn.release()
        return res.status(409).json({ message: 'Недостаточно товара на складе', insufficient: [{ productId: pid }] })
      }
    }

    const total = items.reduce((sum, it) => {
      const price = Number(it.price) || 0
      const discount = Number(it.discount) || 0
      const final = Math.round(price * (1 - discount / 100))
      return sum + final * Math.max(1, Number(it.quantity || 0))
    }, 0)

    const [orderCols] = await conn.execute(`SHOW COLUMNS FROM orders`)
    const hasOrderDate = Array.isArray(orderCols) && orderCols.some((c) => c.Field === 'order_date')
    let orderRes
    if (hasOrderDate) {
      ;[orderRes] = await conn.execute(
        'INSERT INTO orders (user_id, total, order_date) VALUES (?, ?, NOW())',
        [userId || null, total]
      )
    } else {
      ;[orderRes] = await conn.execute(
        'INSERT INTO orders (user_id, total) VALUES (?, ?)',
        [userId || null, total]
      )
    }
    const orderId = orderRes.insertId

    const [itemCols] = await conn.execute(`SHOW COLUMNS FROM order_items`)
    const hasDiscountCol = Array.isArray(itemCols) && itemCols.some((c) => c.Field === 'discount')
    for (const it of items) {
      const q = Math.max(1, Number(it.quantity || 0))
      const price = Number(it.price) || 0
      if (hasDiscountCol) {
        await conn.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, price, discount) VALUES (?, ?, ?, ?, ?)',
          [orderId, Number(it.id), q, price, Number(it.discount) || 0]
        )
      } else {
        await conn.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, Number(it.id), q, price]
        )
      }
    }

    await conn.commit()
    conn.release()
    return res.status(201).json({ orderId, total })
  } catch (error) {
    try {
      await conn.rollback()
    } catch {}
    conn.release()
    console.error('Checkout error', error)
    return res.status(500).json({ message: 'Ошибка оформления заказа' })
  }
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
