<script setup>
import { ref, computed } from 'vue'

const mode = ref('login')

const loginEmail = ref('')
const loginPassword = ref('')

const regLastname = ref('')
const regName = ref('')
const regMidname = ref('')
const regEmail = ref('')
const regPassword = ref('')

const error = ref('')
const success = ref('')

const emits = defineEmits(['login'])

const isLoginValid = computed(() => loginEmail.value.trim() !== '' && loginPassword.value.trim() !== '')

const isRegisterValid = computed(
  () =>
    regLastname.value.trim() !== '' &&
    regName.value.trim() !== '' &&
    regEmail.value.trim() !== '' &&
    regPassword.value.trim() !== ''
)

const setCurrentUser = (user) => {
  localStorage.setItem('currentUser', JSON.stringify(user))
}

const clearMessages = () => {
  error.value = ''
  success.value = ''
}

const switchMode = (nextMode) => {
  if (mode.value === nextMode) return
  mode.value = nextMode
  clearMessages()
}

const onLogin = async () => {
  clearMessages()
  if (!isLoginValid.value) {
    error.value = 'Заполните email и пароль'
    return
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: loginEmail.value.trim(),
        password: loginPassword.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data?.message || 'Ошибка авторизации'
      return
    }

    const user = data.user
    if (!user) {
      error.value = 'Не удалось получить данные пользователя'
      return
    }

    setCurrentUser(user)
    emits('login', user)
  } catch {
    error.value = 'Ошибка соединения с сервером'
  }
}

const onRegister = async () => {
  clearMessages()
  if (!isRegisterValid.value) {
    error.value = 'Заполните все обязательные поля'
    return
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lastname: regLastname.value.trim(),
        name: regName.value.trim(),
        midname: regMidname.value.trim() || null,
        email: regEmail.value.trim(),
        password: regPassword.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data?.message || 'Ошибка регистрации'
      return
    }

    const user = data.user
    if (!user) {
      error.value = 'Не удалось получить данные пользователя'
      return
    }

    setCurrentUser(user)
    success.value = 'Регистрация прошла успешно. Вы авторизованы.'
    emits('login', user)
  } catch {
    error.value = 'Ошибка соединения с сервером'
  }
}
</script>

<template>
  <div class="auth">
    <h1 class="auth__title">Магазин плавательных товаров</h1>

    <div class="auth__tabs">
      <button
        type="button"
        class="auth__tab"
        :class="{ 'auth__tab--active': mode === 'login' }"
        @click="switchMode('login')"
      >
        Авторизация
      </button>
      <button
        type="button"
        class="auth__tab"
        :class="{ 'auth__tab--active': mode === 'register' }"
        @click="switchMode('register')"
      >
        Регистрация
      </button>
    </div>

    <form v-if="mode === 'login'" class="auth__form" @submit.prevent="onLogin">
      <label class="auth__field">
        <span>Email</span>
        <input v-model="loginEmail" type="email" placeholder="example@mail.com" />
      </label>

      <label class="auth__field">
        <span>Пароль</span>
        <input v-model="loginPassword" type="password" placeholder="Введите пароль" />
      </label>

      <button class="auth__submit" type="submit" :disabled="!isLoginValid">Войти</button>
    </form>

    <form v-else class="auth__form" @submit.prevent="onRegister">
      <label class="auth__field">
        <span>Фамилия</span>
        <input v-model="regLastname" type="text" placeholder="Иванов" />
      </label>

      <label class="auth__field">
        <span>Имя</span>
        <input v-model="regName" type="text" placeholder="Иван" />
      </label>

      <label class="auth__field">
        <span>Отчество</span>
        <input v-model="regMidname" type="text" placeholder="Иванович" />
      </label>

      <label class="auth__field">
        <span>Email</span>
        <input v-model="regEmail" type="email" placeholder="example@mail.com" />
      </label>

      <label class="auth__field">
        <span>Пароль</span>
        <input v-model="regPassword" type="password" placeholder="Минимум 6 символов" />
      </label>

      <button class="auth__submit" type="submit" :disabled="!isRegisterValid">Зарегистрироваться</button>
    </form>

    <p v-if="error" class="auth__message auth__message--error">
      {{ error }}
    </p>
    <p v-if="success" class="auth__message auth__message--success">
      {{ success }}
    </p>
  </div>
</template>

<style scoped>
.auth {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 1.5rem;
  border-radius: 12px;
  background-color: var(--color-background-soft);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.auth__title {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth__tabs {
  display: flex;
  margin-bottom: 1.5rem;
  border-radius: 999px;
  background-color: var(--color-background-mute);
  padding: 4px;
}

.auth__tab {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
}

.auth__tab--active {
  background-color: hsla(160, 100%, 37%, 0.12);
  color: hsla(160, 100%, 37%, 1);
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.auth__field input {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  outline: none;
}

.auth__field input:focus {
  border-color: hsla(160, 100%, 37%, 1);
}

.auth__submit {
  margin-top: 0.75rem;
  padding: 0.7rem 0.75rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
  font-weight: 500;
}

.auth__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.auth__message {
  margin-top: 1rem;
  font-size: 0.9rem;
  text-align: center;
}

.auth__message--error {
  color: #b00020;
}

.auth__message--success {
  color: #0b8a42;
}

@media (min-width: 768px) {
  .auth {
    padding: 2rem 2.25rem 2rem;
  }
}
</style>
