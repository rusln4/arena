<script setup>
import { ref, onMounted, computed } from 'vue'
import placeholderImage from './icons/заглушка.png'

const props = defineProps({
  productId: {
    type: Number,
    required: true,
  },
})

const emits = defineEmits(['back'])

const product = ref(null)
const loading = ref(false)
const error = ref('')
const imageBroken = ref(false)

const priceFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const getFinalPrice = computed(() => {
  if (!product.value) return 0
  const price = Number(product.value.price) || 0
  const discount = Number(product.value.discount) || 0
  return Math.round(price * (1 - discount / 100))
})

const formatPrice = (v) => priceFormatter.format(v || 0)

const imageSrc = computed(() => {
  if (!product.value) return ''
  if (imageBroken.value) return placeholderImage
  return `/api/product-image/${product.value.id}`
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/products/${props.productId}`)
    const isJson =
      (res.headers.get('content-type') || '').includes('application/json') ||
      (res.headers.get('Content-Type') || '').includes('application/json')
    const data = isJson ? await res.json() : { message: await res.text() }
    if (!res.ok) {
      throw new Error(data?.message || 'Ошибка загрузки товара')
    }
    product.value = data.product
  } catch (e) {
    error.value = e.message || 'Ошибка загрузки товара'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="product">
    <button type="button" class="product__back" @click="emits('back')">← Назад к каталогу</button>

    <div v-if="error" class="product__message product__message--error">
      {{ error }}
    </div>
    <div v-else-if="loading" class="product__message">Загрузка...</div>
    <div v-else-if="!product" class="product__message">Товар не найден</div>
    <div v-else class="product__content">
      <div class="product__media">
        <img
          :src="imageSrc"
          :alt="product.name"
          class="product__image"
          @error="imageBroken = true"
        />
      </div>

      <div class="product__info">
        <h1 class="product__title">{{ product.name }}</h1>
        <p class="product__meta">
          <span v-if="product.category">{{ product.category }}</span>
          <span v-if="product.manufacturer"> • {{ product.manufacturer }}</span>
        </p>

        <div class="product__prices">
          <span class="product__price">{{ formatPrice(getFinalPrice) }}</span>
          <span v-if="product.discount" class="product__old-price">{{ formatPrice(product.price) }}</span>
          <span v-if="product.discount" class="product__discount">-{{ product.discount }}%</span>
        </div>

        <p class="product__stock" :class="{ 'product__stock--out': product.stock <= 0 }">
          <span v-if="product.stock > 0">В наличии: {{ product.stock }}</span>
          <span v-else>Нет в наличии</span>
        </p>

        <div v-if="product.description" class="product__desc">
          {{ product.description }}
        </div>

        <button class="product__buy" :disabled="product.stock <= 0">
          Добавить в корзину
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product {
  width: 100%;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.product__back {
  align-self: flex-start;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
}

.product__content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
  background: var(--color-background-soft);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.product__media {
  background: var(--color-background-mute);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}

.product__image {
  width: 100%;
  height: 420px;
  object-fit: contain;
}

.product__info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.product__title {
  font-size: 1.6rem;
}

.product__meta {
  color: var(--vt-c-text-light-2);
}

.product__prices {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.product__price {
  font-size: 1.5rem;
  font-weight: 700;
}

.product__old-price {
  text-decoration: line-through;
  color: var(--vt-c-text-light-2);
}

.product__discount {
  color: hsla(160, 100%, 37%, 1);
  font-weight: 600;
}

.product__stock {
  font-size: 0.95rem;
}

.product__stock--out {
  color: #b00020;
}

.product__desc {
  white-space: pre-wrap;
  line-height: 1.5;
}

.product__buy {
  padding: 0.7rem 1rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background-color: var(--vt-c-indigo);
  color: white;
  font-weight: 600;
}

.product__buy:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (max-width: 900px) {
  .product__content {
    grid-template-columns: 1fr;
  }
  .product__image {
    height: 320px;
  }
}
</style>
