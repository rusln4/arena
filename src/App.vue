<script setup>
import { ref, onMounted } from 'vue'
import AuthForm from './components/AuthForm.vue'
import Catalog from './components/Catalog.vue'

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
      <Catalog :user="currentUser" @logout="logout" />
    </section>
  </main>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 1.5rem;
}

.layout__center {
  width: 100%;
}

@media (max-width: 480px) {
  .layout {
    padding: 1rem;
  }
}
</style>
