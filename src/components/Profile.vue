<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
})

const emits = defineEmits(['back', 'logout', 'user-updated'])

const form = ref({
  lastname: '',
  name: '',
  midname: '',
  email: '',
  role: '',
})

const loading = ref(false)
const error = ref('')
const success = ref('')

const syncFromProps = () => {
  form.value = {
    lastname: props.user.lastname || '',
    name: props.user.name || '',
    midname: props.user.midname || '',
    email: props.user.email || '',
    role: props.user.role || '',
  }
}

watch(
  () => props.user,
  () => {
    syncFromProps()
  },
  { immediate: true, deep: true }
)

const saveProfile = async () => {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const response = await fetch(`/api/users/${props.user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lastname: form.value.lastname.trim(),
        name: form.value.name.trim(),
        midname: form.value.midname.trim() || null,
        email: form.value.email.trim(),
      }),
    })

    const ct = (response.headers.get('content-type') || '').toLowerCase()
    const data = ct.includes('application/json') ? await response.json() : { message: await response.text() }

    if (!response.ok) {
      error.value = data?.message || 'Не удалось сохранить профиль'
      return
    }

    if (data.user) {
      success.value = 'Профиль успешно обновлён'
      emits('user-updated', data.user)
    }
    
  } catch {
    error.value = 'Ошибка соединения с сервером'
  } finally {
    loading.value = false
  }
}

const cancelChanges = () => {
  error.value = ''
  success.value = ''
  syncFromProps()
}
</script>

<template>
  <div class="profile">
    <header class="profile__header">
      <div class="profile__logo">Arena Shop</div>

      <h1 class="profile__title">Профиль клиента</h1>

      <div class="profile__actions">
        <button type="button" class="profile__btn profile__btn--ghost" @click="emits('back')">
          К каталогу
        </button>
        <button type="button" class="profile__btn profile__btn--primary" @click="emits('logout')">
          Выйти
        </button>
      </div>
    </header>

    <main class="profile__body">
      <section class="profile__card">
        <h2 class="profile__section-title">Личные данные</h2>

        <form class="profile__form" @submit.prevent="saveProfile">
          <div class="profile__grid">
            <label class="profile__field">
              <span>Фамилия</span>
              <input v-model="form.lastname" type="text" />
            </label>

            <label class="profile__field">
              <span>Имя</span>
              <input v-model="form.name" type="text" />
            </label>

            <label class="profile__field">
              <span>Отчество</span>
              <input v-model="form.midname" type="text" />
            </label>

            <label class="profile__field">
              <span>Email</span>
              <input v-model="form.email" type="email" />
            </label>

            <label class="profile__field profile__field--readonly">
              <span>Роль</span>
              <input :value="form.role" type="text" readonly />
            </label>
          </div>

          <div class="profile__footer">
            <div class="profile__messages">
              <p v-if="error" class="profile__message profile__message--error">
                {{ error }}
              </p>
              <p v-if="success" class="profile__message profile__message--success">
                {{ success }}
              </p>
            </div>

            <div class="profile__buttons">
              <button type="button" class="profile__btn profile__btn--ghost" @click="cancelChanges">
                Отмена
              </button>
              <button type="submit" class="profile__btn profile__btn--primary" :disabled="loading">
                {{ loading ? 'Сохранение...' : 'Сохранить' }}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
.profile {
  width: 100%;
  min-height: 100vh;
  padding: 1.5rem 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: linear-gradient(180deg, #f7f9ff 0%, #ffffff 40%);
}

.profile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.profile__logo {
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: 0.03em;
  color: var(--vt-c-indigo);
}

.profile__title {
  font-size: 1.3rem;
}

.profile__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.profile__body {
  display: flex;
  flex: 1;
}

.profile__card {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem;
  border-radius: 16px;
  background-color: var(--color-background-soft);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.profile__section-title {
  font-size: 1.1rem;
}

.profile__form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.profile__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1rem;
}

.profile__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.profile__field span {
  color: var(--vt-c-text-light-2);
}

.profile__field input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
}

.profile__field--readonly input {
  background-color: var(--color-background-soft);
}

.profile__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.profile__messages {
  min-height: 1.2rem;
}

.profile__message {
  font-size: 0.85rem;
}

.profile__message--error {
  color: #b00020;
}

.profile__message--success {
  color: #1a7f37;
}

.profile__buttons {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.profile__btn {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
}

.profile__btn--primary {
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
}

.profile__btn--ghost {
  border-color: var(--color-border);
  background-color: transparent;
}

@media (max-width: 900px) {
  .profile {
    padding: 1rem;
  }

  .profile__grid {
    grid-template-columns: 1fr;
  }

  .profile__header {
    flex-direction: column;
    align-items: stretch;
  }

  .profile__actions {
    justify-content: space-between;
  }

  .profile__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .profile__buttons {
    justify-content: flex-end;
  }
}
</style>
