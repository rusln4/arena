<script setup>
import { ref, onMounted } from 'vue'
import AuthForm from './components/AuthForm.vue'

const currentUser = ref(null)

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

const handleLogin = (user) => {
  currentUser.value = user
}

const logout = () => {
  localStorage.removeItem('currentUser')
  currentUser.value = null
}

onMounted(() => {
  loadCurrentUser()
})
</script>

<template>
  <main class="layout">
    <section v-if="!currentUser" class="layout__center">
      <AuthForm @login="handleLogin" />
    </section>

    <section v-else class="layout__center">
      <div class="account">
        <h1 class="account__title">Добро пожаловать, {{ currentUser.name }}!</h1>
        <p class="account__text">
          Вы успешно авторизованы как
          <strong>{{ currentUser.role }}</strong
          >.
        </p>
        <button type="button" class="account__logout" @click="logout">Выйти</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.layout__center {
  width: 100%;
}

.account {
  max-width: 420px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: 12px;
  background-color: var(--color-background-soft);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.account__title {
  margin-bottom: 0.75rem;
}

.account__text {
  margin-bottom: 1.5rem;
}

.account__logout {
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
  font-weight: 500;
}
</style>
