<script setup>
import { computed, ref } from 'vue'
import placeholderImage from './icons/заглушка.jpg'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  userId: {
    type: Number,
    required: false,
    default: null,
  },
  canShop: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const emits = defineEmits(['back', 'qty-change', 'remove', 'clear'])

const priceFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const getFinalPrice = (item) => {
  const price = Number(item.price) || 0
  const discount = Number(item.discount) || 0
  return Math.round(price * (1 - discount / 100))
}

const total = computed(() =>
  props.items.reduce((sum, it) => sum + getFinalPrice(it) * (it.quantity || 1), 0)
)

const formatPrice = (v) => priceFormatter.format(v || 0)

const imageSrc = (id) => `/api/product-image/${id}`

const onQtyInput = (it, e) => {
  const max = Number(it.stock) || Infinity
  const raw = Number(e.target.value)
  const q = Math.min(Math.max(1, Number.isFinite(raw) ? raw : 1), max)
  emits('qty-change', it.id, q)
  e.target.value = q
}

const loading = ref(false)
const message = ref('')
const error = ref('')
const success = ref(null) // { orderId, total, count }
const showModal = ref(false)

const checkout = async () => {
  if (!props.items.length || loading.value) return
  loading.value = true
  message.value = ''
  error.value = ''
  try {
    const payload = {
      userId: props.userId || null,
      items: props.items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        price: it.price,
        discount: it.discount || 0,
      })),
    }
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const data = ct.includes('application/json') ? await res.json() : { message: await res.text() }
    if (!res.ok) {
      throw new Error(data?.message || 'Не удалось оформить заказ')
    }
    const count = payload.items.reduce((s, it) => s + (it.quantity || 0), 0)
    success.value = { orderId: data.orderId, total: data.total, count }
    showModal.value = true
    message.value = `Заказ №${data.orderId} оформлен. Сумма: ${formatPrice(data.total)}`
    emits('clear')
  } catch (e) {
    error.value = e.message || 'Ошибка оформления заказа'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="cart">
    <div class="cart__top">
      <button type="button" class="cart__back" @click="emits('back')">← Продолжить покупки</button>
      <h1 class="cart__title">Корзина</h1>
      <div />
    </div>

    <div v-if="!items.length" class="cart__empty">
      Ваша корзина пуста
    </div>

    <div v-else class="cart__content">
      <section class="cart__list">
        <article v-for="it in items" :key="it.id" class="cart__item">
          <div class="cart__media">
            <img :src="imageSrc(it.imageId)" :alt="it.name" class="cart__image" @error="$event.target.src = placeholderImage" />
          </div>
          <div class="cart__info">
            <h3 class="cart__name">{{ it.name }}</h3>
            <p v-if="it.manufacturer" class="cart__meta">{{ it.manufacturer }}</p>
            <div class="cart__row">
              <label class="cart__qty">
                <span>Кол-во</span>
                <input :value="it.quantity" type="number" min="1" :max="it.stock || 9999" @input="onQtyInput(it, $event)" />
              </label>
              <div class="cart__prices">
                <span class="cart__price">{{ formatPrice(getFinalPrice(it)) }}</span>
                <span class="cart__x">×</span>
                <span>{{ it.quantity }}</span>
                <span class="cart__eq">=</span>
                <span class="cart__sum">{{ formatPrice(getFinalPrice(it) * it.quantity) }}</span>
              </div>
            </div>
            <button class="cart__remove" @click="emits('remove', it.id)">Удалить</button>
          </div>
        </article>
      </section>

      <aside class="cart__aside">
        <div class="cart__box">
          <p v-if="message" class="cart__msg cart__msg--ok">{{ message }}</p>
          <p v-if="error" class="cart__msg cart__msg--err">{{ error }}</p>
          <div class="cart__total">
            <span>Итого</span>
            <strong>{{ formatPrice(total) }}</strong>
          </div>
          <button class="cart__checkout" :disabled="!items.length || loading || !canShop" @click="checkout" :title="!canShop ? 'Войдите для оформления заказа' : ''">
            {{ loading ? 'Оформление...' : 'Оформить заказ' }}
          </button>
          <button class="cart__clear" :disabled="!items.length" @click="emits('clear')">Очистить корзину</button>
        </div>
      </aside>
    </div>

    <div v-if="showModal" class="modal" @click.self="showModal = false">
      <div class="modal__content">
        <h2 class="modal__title">Спасибо за покупку!</h2>
        <p class="modal__line">Номер заказа: <strong>{{ success?.orderId }}</strong></p>
        <p class="modal__line">Позиций: <strong>{{ success?.count }}</strong></p>
        <p class="modal__line">Сумма: <strong>{{ formatPrice(success?.total) }}</strong></p>
        <div class="modal__actions">
          <button class="modal__btn" @click="$emit('back')">В каталог</button>
          <button class="modal__btn modal__btn--primary" @click="showModal = false">Закрыть</button>
        </div>
      </div>
    </div>
  </div>
  </template>

<style scoped>
.cart {
  width: 100%;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cart__top {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.cart__title {
  font-size: 1.6rem;
  text-align: center;
}

.cart__back {
  justify-self: start;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
}

.cart__empty {
  padding: 1rem;
  border-radius: 12px;
  background-color: var(--color-background-soft);
  text-align: center;
}

.cart__content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}

.cart__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cart__item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 12px;
  background-color: var(--color-background-soft);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
}

.cart__media {
  background: var(--color-background-mute);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart__image {
  width: 100%;
  height: 120px;
  object-fit: contain;
}

.cart__name {
  font-size: 1rem;
}

.cart__meta {
  font-size: 0.85rem;
  color: var(--vt-c-text-light-2);
}

.cart__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
}

.cart__qty {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.cart__qty input {
  width: 80px;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.cart__prices {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
}
.cart__x,.cart__eq { color: var(--vt-c-text-light-2); }

.cart__remove {
  margin-top: 0.5rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
}

.cart__aside {
  position: sticky;
  top: 1rem;
  align-self: start;
}

.cart__box {
  padding: 1rem;
  border-radius: 12px;
  background-color: var(--color-background-soft);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cart__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1.1rem;
}

.cart__msg {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}
.cart__msg--ok { color: #0b8a42; }
.cart__msg--err { color: #b00020; }

.cart__checkout {
  padding: 0.7rem 1rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background-color: var(--vt-c-indigo);
  color: white;
  font-weight: 600;
}

.cart__checkout:disabled {
  opacity: 0.6;
  cursor: default;
}

.cart__clear {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal__content {
  width: min(520px, 92vw);
  background: #fff;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
}
.modal__title {
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}
.modal__line {
  margin: 0.25rem 0;
}
.modal__actions {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.modal__btn {
  padding: 0.55rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
}
.modal__btn--primary {
  background: var(--vt-c-indigo);
  color: white;
  border: none;
}

@media (max-width: 900px) {
  .cart__content {
    grid-template-columns: 1fr;
  }
}
</style>
