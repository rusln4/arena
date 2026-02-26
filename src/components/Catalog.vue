<script setup>
import { ref, computed, onMounted } from 'vue'
import placeholderImage from './icons/заглушка.jpg'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  cartCount: {
    type: Number,
    required: false,
    default: 0,
  },
  cartItems: {
    type: Array,
    required: false,
    default: () => [],
  },
  canShop: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const emits = defineEmits([
  'logout',
  'open-profile',
  'open-admin',
  'open-product',
  'open-cart',
  'add-to-cart',
  'update-cart-qty',
  'remove-from-cart',
])

const products = ref([])
const categories = ref([])
const loading = ref(false)
const error = ref('')

const searchQuery = ref('')
const selectedCategoryId = ref(null)
const priceFrom = ref(null)
const priceTo = ref(null)
const sortOption = ref('price_asc')
const brokenImageIds = ref([])

const priceFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const loadCatalog = async () => {
  loading.value = true
  error.value = ''

  try {
    const [categoriesResponse, productsResponse] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/products'),
    ])

    const parseSafe = async (res) => {
      const ct = (res.headers.get('content-type') || res.headers.get('Content-Type') || '').toLowerCase()
      if (ct.includes('application/json')) {
        return await res.json()
      }
      const text = await res.text()
      return { message: text }
    }

    const [categoriesData, productsData] = await Promise.all([
      parseSafe(categoriesResponse),
      parseSafe(productsResponse),
    ])

    if (!categoriesResponse.ok) {
      throw new Error(categoriesData?.message || 'Не удалось получить категории')
    }

    if (!productsResponse.ok) {
      throw new Error(productsData?.message || 'Не удалось получить товары')
    }

    categories.value = categoriesData.categories || []
    products.value = productsData.products || []
  } catch (e) {
    error.value = e.message || 'Ошибка загрузки каталога'
  } finally {
    loading.value = false
  }
}

const getFinalPrice = (product) => {
  const price = Number(product.price) || 0
  const discount = Number(product.discount) || 0
  return Math.round(price * (1 - discount / 100))
}

const minPrice = computed(() => {
  if (!products.value.length) return null
  return Math.min(...products.value.map((p) => getFinalPrice(p)))
})

const maxPrice = computed(() => {
  if (!products.value.length) return null
  return Math.max(...products.value.map((p) => getFinalPrice(p)))
})

const formatPrice = (value) => priceFormatter.format(value || 0)

const hasBrokenImage = (productId) => brokenImageIds.value.includes(productId)

const markImageBroken = (productId) => {
  if (!brokenImageIds.value.includes(productId)) {
    brokenImageIds.value = [...brokenImageIds.value, productId]
  }
}

const getImageSrc = (productId) => {
  if (hasBrokenImage(productId)) {
    return placeholderImage
  }
  return `/api/product-image/${productId}`
}

const clearFilters = () => {
  selectedCategoryId.value = null
  searchQuery.value = ''
  priceFrom.value = null
  priceTo.value = null
}

const filteredProducts = computed(() => {
  let items = [...products.value]

  if (selectedCategoryId.value) {
    items = items.filter((p) => p.categoryId === selectedCategoryId.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    items = items.filter(
      (p) =>
        String(p.name).toLowerCase().includes(q) ||
        String(p.manufacturer || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q)
    )
  }

  if (priceFrom.value != null && priceFrom.value !== '') {
    items = items.filter((p) => getFinalPrice(p) >= Number(priceFrom.value))
  }

  if (priceTo.value != null && priceTo.value !== '') {
    items = items.filter((p) => getFinalPrice(p) <= Number(priceTo.value))
  }

  if (sortOption.value === 'price_asc') {
    items.sort((a, b) => getFinalPrice(a) - getFinalPrice(b))
  } else if (sortOption.value === 'price_desc') {
    items.sort((a, b) => getFinalPrice(b) - getFinalPrice(a))
  } else if (sortOption.value === 'name_asc') {
    items.sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }

  return items
})

onMounted(() => {
  loadCatalog()
})

const openProduct = (id) => {
  emits('open-product', id)
}

const addToCart = (product) => {
  emits('add-to-cart', {
    id: product.id,
    name: product.name,
    price: product.price,
    discount: product.discount,
    manufacturer: product.manufacturer,
    stock: product.stock,
  }, 1)
}

const qtyInCart = (id) => {
  const item = props.cartItems.find((i) => i.id === id)
  return item ? Number(item.quantity || 0) : 0
}

const inc = (product) => {
  const current = qtyInCart(product.id)
  const max = Number(product.stock) || Infinity
  const next = Math.min(current + 1, max)
  emits('update-cart-qty', product.id, next)
}

const dec = (product) => {
  const current = qtyInCart(product.id)
  const next = Math.max(0, current - 1)
  if (next === 0) {
    emits('remove-from-cart', product.id)
  } else {
    emits('update-cart-qty', product.id, next)
  }
}
</script>

<template>
  <div class="catalog">
    <header class="catalog__header">
      <div class="catalog__logo">Arena</div>

      <div class="catalog__search">
        <input
          v-model="searchQuery"
          type="search"
          class="catalog__search-input"
          placeholder="Поиск по каталогу товаров"
        />
      </div>

      <div class="catalog__user">
        <button type="button" class="catalog__cart" :disabled="!props.canShop" @click="emits('open-cart')">
          Корзина<span v-if="props.cartCount"> • {{ props.cartCount }}</span>
        </button>
        <button
          v-if="props.user?.role === 'админ' || props.user?.role === 'admin' || props.user?.role === 'администратор'"
          type="button"
          class="catalog__admin"
          @click="emits('open-admin')"
        >
          Админ
        </button>
        <button
          v-if="props.user?.role !== 'guest'"
          type="button"
          class="catalog__user-name"
          @click="emits('open-profile')"
        >
          {{ props.user.name }}
        </button>
        <span v-else class="catalog__user-name catalog__user-name--disabled">
          {{ props.user.name }}
        </span>
        <button type="button" class="catalog__logout" @click="emits('logout')">Выйти</button>
      </div>
    </header>

    <div class="catalog__body">
      <aside class="catalog__sidebar">
        <section class="catalog__block">
          <h2 class="catalog__block-title">Категории</h2>
          <button
            type="button"
            class="catalog__chip"
            :class="{ 'catalog__chip--active': !selectedCategoryId }"
            @click="selectedCategoryId = null"
          >
            Все товары
          </button>
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            class="catalog__chip"
            :class="{ 'catalog__chip--active': selectedCategoryId === category.id }"
            @click="selectedCategoryId = category.id"
          >
            {{ category.name }}
          </button>
        </section>

        <section class="catalog__block">
          <h2 class="catalog__block-title">Фильтр по цене</h2>
          <div class="catalog__price-row">
            <label class="catalog__price-field">
              <span>от</span>
              <input v-model.number="priceFrom" type="number" min="0" />
            </label>
            <label class="catalog__price-field">
              <span>до</span>
              <input v-model.number="priceTo" type="number" min="0" />
            </label>
          </div>
          <p v-if="minPrice !== null && maxPrice !== null" class="catalog__price-hint">
            Диапазон: {{ formatPrice(minPrice) }} – {{ formatPrice(maxPrice) }}
          </p>
        </section>

        <button type="button" class="catalog__reset" @click="clearFilters">Сбросить фильтры</button>
      </aside>

      <section class="catalog__main">
        <div class="catalog__top">
          <div>
            <h1 class="catalog__title">Каталог товаров</h1>
            <p class="catalog__count">{{ filteredProducts.length }} товаров</p>
          </div>

          <div class="catalog__sort">
            <span>Сортировать по</span>
            <select v-model="sortOption" class="catalog__sort-select">
              <option value="price_asc">От дешевых к дорогим</option>
              <option value="price_desc">От дорогих к дешевым</option>
              <option value="name_asc">По названию</option>
            </select>
          </div>
        </div>

        <div v-if="error" class="catalog__message catalog__message--error">
          {{ error }}
        </div>
        <div v-else-if="loading" class="catalog__message">
          Загрузка каталога...
        </div>
        <div v-else-if="!filteredProducts.length" class="catalog__message">
          Товары не найдены
        </div>

        <div v-else class="catalog__grid">
          <article
            v-for="product in filteredProducts"
            :key="product.id"
            class="catalog__card"
            @click="openProduct(product.id)"
          >
            <div class="catalog__image-wrapper">
              <img
                :src="getImageSrc(product.id)"
                :alt="product.name"
                class="catalog__image"
                @error="markImageBroken(product.id)"
              />
              <span v-if="product.stock <= 0" class="catalog__badge">Нет в наличии</span>
            </div>
            <div class="catalog__info">
              <p class="catalog__category">{{ product.category }}</p>
              <h3 class="catalog__name">{{ product.name }}</h3>
              <p v-if="product.manufacturer" class="catalog__manufacturer">
                {{ product.manufacturer }}
              </p>
              <div class="catalog__prices">
                <span class="catalog__price">{{ formatPrice(getFinalPrice(product)) }}</span>
                <span v-if="product.discount" class="catalog__old-price">
                  {{ formatPrice(product.price) }}
                </span>
              </div>
              <div v-if="qtyInCart(product.id) > 0" class="catalog__qty" @click.stop>
                <button type="button" class="catalog__qty-btn" @click="dec(product)">−</button>
                <span class="catalog__qty-value">{{ qtyInCart(product.id) }}</span>
                <button type="button" class="catalog__qty-btn" :disabled="qtyInCart(product.id) >= (Number(product.stock) || 9999)" @click="inc(product)">+</button>
              </div>
              <button
                v-else
                type="button"
                class="catalog__add"
                :disabled="product.stock <= 0 || !props.canShop"
                :title="!props.canShop ? 'Войдите, чтобы добавить в корзину' : ''"
                @click.stop="addToCart(product)"
              >
                В корзину
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.catalog {
  width: 100%;
  min-height: 100vh;
  padding: 1.5rem 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: linear-gradient(180deg, #f7f9ff 0%, #ffffff 40%);
}

.catalog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.catalog__logo {
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: 0.03em;
  color: var(--vt-c-indigo);
}

.catalog__search {
  flex: 1;
}

.catalog__search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  outline: none;
  background-color: var(--color-background-soft);
}

.catalog__search-input:focus {
  border-color: var(--vt-c-indigo);
}

.catalog__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.catalog__admin {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
}

.catalog__cart {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
}
.catalog__cart:disabled {
  opacity: 0.6;
  cursor: default;
}

.catalog__user-name {
  font-size: 0.9rem;
}
.catalog__user-name--disabled {
  opacity: 0.7;
  cursor: default;
}

.catalog__logout {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
  font-size: 0.85rem;
}

.catalog__body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1.5rem;
  align-items: flex-start;
}

.catalog__sidebar {
  padding: 1rem;
  border-radius: 12px;
  background-color: var(--color-background-soft);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.catalog__block + .catalog__block {
  margin-top: 1.25rem;
}

.catalog__block-title {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.catalog__chip {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.6rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: transparent;
  font-size: 0.9rem;
}

.catalog__chip--active {
  background-color: hsla(160, 100%, 37%, 0.1);
  color: hsla(160, 100%, 37%, 1);
}

.catalog__price-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.catalog__price-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.catalog__price-field input {
  width: 100%;
  padding: 0.3rem 0.4rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background-soft);
}

.catalog__price-hint {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: var(--vt-c-text-light-2);
}

.catalog__reset {
  margin-top: 1.25rem;
  width: 100%;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
}

.catalog__main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.catalog__top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.catalog__title {
  font-size: 1.5rem;
  color: var(--color-heading);
}

.catalog__count {
  font-size: 0.9rem;
}

.catalog__sort {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.catalog__sort-select {
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
   background-color: var(--color-background-soft);
}

.catalog__message {
  padding: 1rem;
  border-radius: 8px;
  background-color: var(--color-background-soft);
}

.catalog__message--error {
  color: #b00020;
}

.catalog__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.catalog__card {
  border-radius: 12px;
  background-color: var(--color-background-soft);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
  cursor: pointer;
}

.catalog__add {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background-color: var(--vt-c-indigo);
  color: white;
  font-size: 0.85rem;
}

.catalog__add:disabled {
  opacity: 0.6;
  cursor: default;
}

.catalog__qty {
  margin-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-background-mute);
  padding: 0.35rem 0.5rem;
  border-radius: 999px;
}

.catalog__qty-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: #fff;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}

.catalog__qty-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.catalog__qty-value {
  min-width: 28px;
  text-align: center;
  font-weight: 600;
}

.catalog__card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.catalog__image-wrapper {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background-color: var(--color-background-mute);
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.catalog__image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.catalog__badge {
  position: absolute;
  left: 0.75rem;
  top: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 0.7rem;
}

.catalog__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.catalog__category {
  font-size: 0.8rem;
  color: var(--vt-c-text-light-2);
}

.catalog__name {
  font-size: 0.95rem;
}

.catalog__manufacturer {
  font-size: 0.8rem;
  color: var(--vt-c-text-light-2);
}

.catalog__prices {
  margin-top: 0.25rem;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.catalog__price {
  font-weight: 600;
}

.catalog__old-price {
  font-size: 0.8rem;
  text-decoration: line-through;
  color: var(--vt-c-text-light-2);
}

@media (max-width: 900px) {
  .catalog__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .catalog {
    padding: 1rem 0;
  }

  .catalog__header {
    flex-direction: column;
    align-items: stretch;
  }

  .catalog__user {
    justify-content: space-between;
  }
}
</style>
