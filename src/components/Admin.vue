<script setup>
import { ref, onMounted, computed } from 'vue'
import placeholderImage from './icons/заглушка.jpg'

const emits = defineEmits(['logout', 'notify'])

const addNotification = (message, type = 'success') => {
  emits('notify', message, type)
}

const products = ref([])
const categories = ref([])
const manufacturers = ref([])
const suppliers = ref([])
const loading = ref(false)
const error = ref('')
const formError = ref('')
const editingId = ref(null)
const originalForm = ref(null)
const brokenImageIds = ref([])
const imageDataUrl = ref('')

const form = ref({
  name: '',
  price: null,
  discount: 0,
  description: '',
  categoryId: null,
  manufacturerId: null,
  supplierId: null,
  stock: null,
})

const resetForm = () => {
  editingId.value = null
  originalForm.value = null
  form.value = {
    name: '',
    price: null,
    discount: 0,
    description: '',
    categoryId: null,
    manufacturerId: null,
    supplierId: null,
    stock: null,
  }
  formError.value = ''
  imageDataUrl.value = ''
  ensureDefaults()
}

const ensureDefaults = () => {
  if (!editingId.value) {
    if (categories.value.length && (form.value.categoryId == null)) {
      form.value.categoryId = categories.value[0].id
    }
    if (manufacturers.value.length && (form.value.manufacturerId == null)) {
      form.value.manufacturerId = manufacturers.value[0].id
    }
    if (suppliers.value.length && (form.value.supplierId == null)) {
      form.value.supplierId = suppliers.value[0].id
    }
  }
}

const hasBrokenImage = (productId) => brokenImageIds.value.includes(productId)
const markImageBroken = (productId) => {
  if (!brokenImageIds.value.includes(productId)) {
    brokenImageIds.value = [...brokenImageIds.value, productId]
  }
}
const getImageSrc = (productId) => {
  if (hasBrokenImage(productId)) return placeholderImage
  const p = products.value.find(prod => prod.id === productId)
  return `/api/product-image/${productId}${p?.imageId ? `?v=${p.imageId}` : ''}`
}

const loadAll = async () => {
  loading.value = true
  error.value = ''
  try {
    const [pc, cc, mc, sc] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/categories'),
      fetch('/api/manufacturers'),
      fetch('/api/suppliers'),
    ])
    const parseSafe = async (res) => {
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (ct.includes('application/json')) return await res.json()
      const txt = await res.text()
      return { message: txt }
    }
    const pj = await parseSafe(pc)
    const cj = await parseSafe(cc)
    const mj = await parseSafe(mc)
    const sj = await parseSafe(sc)
    if (!pc.ok) throw new Error(pj?.message || 'Ошибка загрузки товаров')
    if (!cc.ok) throw new Error(cj?.message || 'Ошибка загрузки категорий')
    if (!mc.ok) throw new Error(mj?.message || 'Ошибка загрузки производителей')
    if (!sc.ok) throw new Error(sj?.message || 'Ошибка загрузки поставщиков')
    products.value = pj.products || []
    categories.value = cj.categories || []
    manufacturers.value = mj.manufacturers || []
    suppliers.value = sj.suppliers || []
    ensureDefaults()
  } catch (e) {
    error.value = e.message || 'Ошибка загрузки данных'
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

const startEdit = (p) => {
  editingId.value = p.id
  form.value = {
    name: p.name,
    price: Number(p.price) || 0,
    discount: Number(p.discount) || 0,
    description: p.description || '',
    categoryId: p.categoryId || null,
    manufacturerId: p.manufacturerId ?? null,
    supplierId: p.supplierId ?? null,
    stock: p.stock != null ? Number(p.stock) : null,
  }
  originalForm.value = JSON.parse(JSON.stringify(form.value))
  formError.value = ''
  imageDataUrl.value = ''
}

const validate = () => {
  if (!String(form.value.name).trim()) return 'Заполните название'
  if (form.value.categoryId == null) return 'Выберите категорию'
  if (form.value.manufacturerId == null) return 'Выберите производителя'
  if (form.value.supplierId == null) return 'Выберите поставщика'
  const price = Number(form.value.price)
  if (!Number.isFinite(price) || price < 0) return 'Цена должна быть неотрицательным числом'
  const disc = Number(form.value.discount || 0)
  if (disc < 0 || disc > 99) return 'Скидка должна быть от 0 до 99'
  if (form.value.stock != null) {
    const s = Number(form.value.stock)
    if (!Number.isFinite(s) || s < 0) return 'Остаток должен быть ≥ 0'
  }
  return ''
}

const save = async () => {
  formError.value = validate()
  if (formError.value) return

  if (editingId.value && originalForm.value) {
    const hasDataChanged = JSON.stringify(form.value) !== JSON.stringify(originalForm.value)
    const hasImageChanged = !!imageDataUrl.value
    if (!hasDataChanged && !hasImageChanged) {
      addNotification('Изменений нет', 'info')
      return
    }
  }

  try {
    const payload = {
      name: form.value.name,
      price: Number(form.value.price),
      discount: Number(form.value.discount || 0),
      description: form.value.description || null,
      categoryId: form.value.categoryId,
      manufacturerId: form.value.manufacturerId,
      supplierId: form.value.supplierId,
      stock: form.value.stock != null ? Number(form.value.stock) : null,
    }
    let res
    if (editingId.value) {
      res = await fetch(`/api/products/${editingId.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const data = ct.includes('application/json') ? await res.json() : { message: await res.text() }
    if (!res.ok) throw new Error(data?.message || 'Ошибка сохранения товара')
    addNotification(editingId.value ? 'Товар обновлен' : 'Товар создан', 'success')
    const productId = editingId.value || data?.product?.id
    if (productId && imageDataUrl.value) {
      const ir = await fetch(`/api/products/${productId}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: imageDataUrl.value }),
      })
      const ict = (ir.headers.get('content-type') || '').toLowerCase()
      const idata = ict.includes('application/json') ? await ir.json() : { message: await ir.text() }
      if (!ir.ok) throw new Error(idata?.message || 'Ошибка загрузки изображения')
      
      // Сбрасываем imageDataUrl после успешной загрузки
      imageDataUrl.value = ''
      
      // Удаляем из списка "битых" картинок, если она там была
      brokenImageIds.value = brokenImageIds.value.filter(id => id !== productId)
    }
    
    await loadAll()
    
    if (!editingId.value) {
      resetForm()
    } else {
      // Если редактировали, находим обновленный товар и синхронизируем форму
      const updatedProduct = products.value.find(p => p.id === productId)
      if (updatedProduct) {
        startEdit(updatedProduct)
      }
    }
  } catch (e) {
    formError.value = e.message || 'Ошибка сохранения'
  }
}

const onFileChange = (e) => {
  const file = e.target.files && e.target.files[0]
  if (!file) {
    imageDataUrl.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    imageDataUrl.value = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}
const remove = async (id) => {
  if (!confirm('Удалить товар?')) return
  try {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const data = ct.includes('application/json') ? await res.json() : { message: await res.text() }
    if (!res.ok) {
      throw new Error(data?.details || data?.message || 'Ошибка удаления')
    }
    addNotification('Товар успешно удален', 'info')
    await loadAll()
    if (editingId.value === id) resetForm()
  } catch (e) {
    error.value = e.message || 'Ошибка удаления'
  }
}
</script>

<template>
  <div class="admin">
    <header class="admin__header">
      <h1 class="admin__title">Управление товарами</h1>
      <button class="admin__logout" @click="emits('logout')">Выйти</button>
    </header>

    <div v-if="error" class="admin__msg admin__msg--err">{{ error }}</div>
    <div v-else-if="loading" class="admin__msg">Загрузка...</div>

    <section class="admin__grid" v-else>
      <aside class="admin__aside">
        <h2 class="admin__subtitle">{{ editingId ? 'Редактирование' : 'Добавление' }}</h2>
        <div class="admin__form">
          <label>
            <span>Название</span>
            <input v-model.trim="form.name" type="text" />
          </label>
          <label>
            <span>Категория</span>
            <select v-model.number="form.categoryId" required>
              <option :value="null" disabled>Выберите</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </label>
          <label>
            <span>Производитель</span>
            <select v-model.number="form.manufacturerId" required>
              <option :value="null" disabled>Выберите</option>
              <option v-for="m in manufacturers" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
          <label>
            <span>Поставщик</span>
            <select v-model.number="form.supplierId" required>
              <option :value="null" disabled>Выберите</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>
          <label>
            <span>Цена</span>
            <input v-model.number="form.price" type="number" min="0" />
          </label>
          <label>
            <span>Скидка, %</span>
            <input v-model.number="form.discount" type="number" min="0" max="99" />
          </label>
          <label>
            <span>Остаток</span>
            <input v-model.number="form.stock" type="number" min="0" />
          </label>
          <label>
            <span>Описание</span>
            <textarea v-model="form.description" rows="4" />
          </label>
          <label>
            <span>Изображение</span>
            <input type="file" accept="image/*" @change="onFileChange" />
            <img v-if="imageDataUrl" :src="imageDataUrl" alt="Предпросмотр" class="admin__preview" />
          </label>
          <p v-if="formError" class="admin__msg admin__msg--err">{{ formError }}</p>
          <div class="admin__actions">
            <button class="admin__btn admin__btn--primary" @click="save">{{ editingId ? 'Сохранить' : 'Добавить' }}</button>
            <button class="admin__btn" @click="resetForm">Сброс</button>
          </div>
        </div>
      </aside>

      <section class="admin__grid-cards">
        <article
          v-for="p in products"
          :key="p.id"
          class="admin__card"
          @click="startEdit(p)"
        >
          <div class="admin__image-wrap">
            <img
              :src="getImageSrc(p.id)"
              :alt="p.name"
              class="admin__image"
              @error="markImageBroken(p.id)"
            />
            <span v-if="p.stock <= 0" class="admin__badge">Нет в наличии</span>
          </div>
          <div class="admin__info">
            <p class="admin__category">{{ p.category }}</p>
            <h3 class="admin__name">{{ p.name }}</h3>
            <p v-if="p.manufacturer" class="admin__manufacturer">{{ p.manufacturer }}</p>
            <div class="admin__prices">
              <span class="admin__price">{{ p.price }}</span>
              <span v-if="p.discount" class="admin__old-price">{{ p.discount }}%</span>
            </div>
            <div class="admin__actions-row" @click.stop>
              <button class="admin__btn admin__btn--primary" @click="startEdit(p)">Редактировать</button>
              <button class="admin__btn admin__btn--danger" @click="remove(p.id)">Удалить</button>
            </div>
          </div>
        </article>
      </section>
    </section>
  </div>
</template>

<style scoped>
.admin { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
.admin__header { display: flex; align-items: center; justify-content: space-between; }
.admin__title { font-size: 1.4rem; }
.admin__logout { padding: 0.45rem 0.9rem; border-radius: 999px; border: 1px solid var(--color-border); background: transparent; cursor: pointer; }
.admin__msg { padding: 0.75rem; border-radius: 8px; background: var(--color-background-soft); }
.admin__msg--err { color: #b00020; }
.admin__grid { display: grid; grid-template-columns: 360px 1fr; gap: 1rem; align-items: start; }
.admin__aside { background: var(--color-background-soft); border-radius: 12px; box-shadow: 0 12px 30px rgba(15,23,42,.06); padding: 1rem; }
.admin__subtitle { margin-bottom: 0.5rem; font-size: 1.05rem; }
.admin__form { display: flex; flex-direction: column; gap: 0.6rem; }
.admin__form label { display: flex; flex-direction: column; gap: 0.25rem; font-size: .9rem; }
.admin__form input, .admin__form select, .admin__form textarea { padding: .45rem .6rem; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-background); }
.admin__actions { display: flex; gap: .5rem; margin-top: .25rem; }
.admin__btn { padding: .5rem .9rem; border-radius: 999px; border: 1px solid var(--color-border); background: transparent; cursor: pointer; }
.admin__btn--primary { background: var(--vt-c-indigo); color: #fff; border: none; }
.admin__preview { display: block; margin-top: .5rem; max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--color-border); }
.admin__grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.admin__card { border-radius: 12px; background-color: var(--color-background-soft); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06); cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
.admin__card:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); }
.admin__image-wrap { position: relative; border-radius: 10px; overflow: hidden; background-color: var(--color-background-mute); min-height: 160px; display: flex; align-items: center; justify-content: center; }
.admin__image { width: 100%; height: 180px; object-fit: cover; }
.admin__badge { position: absolute; left: 0.75rem; top: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 999px; background-color: rgba(0, 0, 0, 0.6); color: white; font-size: 0.7rem; }
.admin__info { display: flex; flex-direction: column; gap: 0.25rem; }
.admin__category { font-size: 0.8rem; color: var(--vt-c-text-light-2); }
.admin__name { font-size: 0.95rem; }
.admin__manufacturer { font-size: 0.8rem; color: var(--vt-c-text-light-2); }
.admin__prices { margin-top: 0.25rem; display: flex; align-items: baseline; gap: 0.5rem; }
.admin__price { font-weight: 600; }
.admin__old-price { font-size: 0.8rem; color: var(--vt-c-text-light-2); }
.admin__actions-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
.admin__btn--danger { color: #b00020; border-color: #b00020; }
@media (max-width: 900px) { .admin__grid { grid-template-columns: 1fr; } }
</style>
