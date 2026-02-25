<script setup>
import { ref, onMounted } from 'vue'
import AuthForm from './components/AuthForm.vue'
import Catalog from './components/Catalog.vue'
import Profile from './components/Profile.vue'

const currentUser = ref(null)
const currentView = ref('catalog')

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
  currentView.value = 'catalog'
}

const logout = () => {
  localStorage.removeItem('currentUser')
  currentUser.value = null
  currentView.value = 'catalog'
}

const openProfile = () => {
  currentView.value = 'profile'
}

const openCatalog = () => {
  currentView.value = 'catalog'
}

const handleUserUpdated = (user) => {
  currentUser.value = user
  localStorage.setItem('currentUser', JSON.stringify(user))
}

onMounted(() => {
  loadCurrentUser()
})
</script>

<template>
  <main class="layout">
    <section v-if="!currentUser" class="layout__center layout__center--auth">
      <AuthForm @login="handleLogin" />
    </section>

    <section v-else class="layout__center layout__center--catalog">
      <Catalog
        v-if="currentView === 'catalog'"
        :user="currentUser"
        @logout="logout"
        @open-profile="openProfile"
      />
      <Profile
        v-else-if="currentView === 'profile'"
        :user="currentUser"
        @back="openCatalog"
        @logout="logout"
        @user-updated="handleUserUpdated"
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
