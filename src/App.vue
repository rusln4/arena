<script setup>
import { ref, onMounted, computed } from 'vue'
import AuthForm from './components/AuthForm.vue'
import Catalog from './components/Catalog.vue'
import Profile from './components/Profile.vue'
import ProductDetails from './components/ProductDetails.vue'
import Cart from './components/Cart.vue'
import Admin from './components/Admin.vue'

const currentUser = ref(null)
const currentView = ref('catalog')
const selectedProductId = ref(null)
const cart = ref([])

const loadCurrentUser = () => {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) {
      currentUser.value = null
      return
    }
    currentUser.value = JSON.parse(raw)
  } catch {
    currentUser.value = null
  }
}

const loadCart = () => {
  try {
    const raw = localStorage.getItem('cart')
    cart.value = raw ? JSON.parse(raw) : []
  } catch {
    cart.value = []
  }
}

const saveCart = () => {
  localStorage.setItem('cart', JSON.stringify(cart.value))
}

const cartCount = computed(() => cart.value.reduce((sum, it) => sum + (it.quantity || 0), 0))
const canShop = computed(() => {
  if (!currentUser.value) return false
  const role = String(currentUser.value.role || '').toLowerCase()
  // Покупки доступны только не-гостям и не-админам
  return role !== 'guest' && role !== 'админ' && role !== 'admin' && role !== 'администратор'
})

const handleLogin = (user) => {
  currentUser.value = user
  currentView.value =
    user?.role === 'админ' ||
    user?.role === 'admin' ||
    user?.role === 'администратор'
      ? 'admin'
      : 'catalog'
  if (user?.role === 'guest') {
    cart.value = []
    saveCart()
  }
}

const logout = () => {
  localStorage.removeItem('currentUser')
  currentUser.value = null
  currentView.value = 'catalog'
}

const openProfile = () => {
  if (currentUser.value?.role === 'guest') return
  currentView.value = 'profile'
}

const openCatalog = () => {
  currentView.value = 'catalog'
}

const openProduct = (id) => {
  selectedProductId.value = id
  currentView.value = 'product'
}

const openCart = () => {
  if (!canShop.value) {
    currentView.value = 'auth'
    return
  }
  currentView.value = 'cart'
}

const openAdmin = () => {
  if (
    currentUser.value?.role === 'админ' ||
    currentUser.value?.role === 'admin' ||
    currentUser.value?.role === 'администратор'
  ) {
    currentView.value = 'admin'
  }
}

const addToCart = (product, quantity) => {
  if (!canShop.value) {
    currentView.value = 'auth'
    return
  }
  const stock = Number(product?.stock) || Infinity
  const q = Math.min(Math.max(1, Number(quantity || 1)), stock)
  const idx = cart.value.findIndex((it) => it.id === product.id)
  if (idx >= 0) {
    const nextQty = Math.min((cart.value[idx].quantity || 0) + q, stock)
    const next = { ...cart.value[idx], quantity: nextQty }
    cart.value.splice(idx, 1, next)
  } else {
    cart.value.push({
      id: product.id,
      name: product.name,
      price: product.price,
      discount: product.discount,
      imageId: product.id,
      quantity: q,
      stock: product.stock,
      manufacturer: product.manufacturer || null,
    })
  }
  saveCart()
}

const updateCartQty = (id, qty) => {
  if (!canShop.value) {
    currentView.value = 'auth'
    return
  }
  const idx = cart.value.findIndex((it) => it.id === id)
  if (idx >= 0) {
    const max = Number(cart.value[idx].stock) || Infinity
    const qSan = Math.min(Math.max(1, Number(qty || 1)), max)
    cart.value.splice(idx, 1, { ...cart.value[idx], quantity: qSan })
    saveCart()
  }
}

const removeFromCart = (id) => {
  if (!canShop.value) {
    currentView.value = 'auth'
    return
  }
  cart.value = cart.value.filter((it) => it.id !== id)
  saveCart()
}

const clearCart = () => {
  if (!canShop.value) {
    currentView.value = 'auth'
    return
  }
  cart.value = []
  saveCart()
}

const handleUserUpdated = (user) => {
  currentUser.value = user
  localStorage.setItem('currentUser', JSON.stringify(user))
}

onMounted(() => {
  loadCurrentUser()
  loadCart()
  if (currentUser.value?.role === 'guest' && cart.value.length) {
    cart.value = []
    saveCart()
  }
  if (
    currentUser.value?.role === 'админ' ||
    currentUser.value?.role === 'admin' ||
    currentUser.value?.role === 'администратор'
  ) {
    currentView.value = 'admin'
  }
})
</script>

<template>
  <main class="layout">
    <section v-if="!currentUser" class="layout__center layout__center--auth">
      <AuthForm @login="handleLogin" />
    </section>

    <section v-else class="layout__center layout__center--catalog">
      <Admin
        v-if="['админ','admin','администратор'].includes(String(currentUser.role).toLowerCase())"
        @logout="logout"
      />
      <Catalog
        v-else-if="currentView === 'catalog'"
        :user="currentUser"
        :cart-count="cartCount"
        :can-shop="canShop"
        :cart-items="cart"
        @logout="logout"
        @open-profile="openProfile"
        @open-admin="openAdmin"
        @open-product="openProduct"
        @add-to-cart="addToCart"
        @update-cart-qty="updateCartQty"
        @remove-from-cart="removeFromCart"
        @open-cart="openCart"
      />
      <Profile
        v-else-if="currentView === 'profile'"
        :user="currentUser"
        @back="openCatalog"
        @logout="logout"
        @user-updated="handleUserUpdated"
      />
      <ProductDetails
        v-else-if="currentView === 'product'"
        :product-id="selectedProductId"
        :can-shop="canShop"
        @add-to-cart="addToCart"
        @open-cart="openCart"
        @back="openCatalog"
      />
      <Cart
        v-else-if="currentView === 'cart'"
        :items="cart"
        :user-id="currentUser?.id || null"
        :can-shop="canShop"
        @back="openCatalog"
        @qty-change="updateCartQty"
        @remove="removeFromCart"
        @clear="clearCart"
      />
    </section>
  </main>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.layout__center {
  width: 100%;
}

.layout__center--auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background-color: #f5f7fa;
}

.layout__center--catalog {
  min-height: 100vh;
}

@media (max-width: 480px) {
  .layout__center--auth {
    padding: 1rem;
  }
}
</style>
