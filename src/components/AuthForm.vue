<script setup>
import { ref, computed } from 'vue'
import logoUrl from '@/components/icons/281_arena.jpg'

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

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const regPasswordRules = (val) => {
  const v = String(val || '')
  const len = v.length
  return { valid: len >= 6 && len <= 64 }
}
const isLoginValid = computed(
  () => emailRe.test(loginEmail.value.trim()) && regPasswordRules(loginPassword.value).valid
)

const isRegisterValid = computed(() => {
  const ln = regLastname.value.trim()
  const nm = regName.value.trim()
  const em = regEmail.value.trim()
  const pw = regPassword.value
  return (
    ln.length >= 1 &&
    ln.length <= 100 &&
    nm.length >= 1 &&
    nm.length <= 100 &&
    emailRe.test(em) &&
    regPasswordRules(pw).valid &&
    (!regMidname.value || String(regMidname.value).length <= 100)
  )
})

const setCurrentUser = (user) => {
  localStorage.setItem('currentUser', JSON.stringify(user))
}

const onGuest = () => {
  clearMessages()
  const user = { id: null, name: 'Гость', role: 'guest' }
  setCurrentUser(user)
  emits('login', user)
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
  if (!emailRe.test(loginEmail.value.trim())) {
    error.value = 'Введите корректный email'
    return
  }
  if (!regPasswordRules(loginPassword.value).valid) {
    error.value = 'Пароль должен быть от 6 до 64 символов'
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

    const ct = (response.headers.get('content-type') || '').toLowerCase()
    const data = ct.includes('application/json') ? await response.json() : { message: await response.text() }

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
  const ln = regLastname.value.trim()
  const nm = regName.value.trim()
  const em = regEmail.value.trim()
  const pw = regPassword.value
  if (!ln || !nm || !em || !pw) {
    error.value = 'Заполните все обязательные поля'
    return
  }
  if (ln.length < 1 || ln.length > 100) {
    error.value = 'Фамилия должна быть от 1 до 100 символов'
    return
  }
  if (nm.length < 1 || nm.length > 100) {
    error.value = 'Имя должно быть от 1 до 100 символов'
    return
  }
  if (!emailRe.test(em)) {
    error.value = 'Введите корректный email'
    return
  }
  if (!regPasswordRules(pw).valid) {
    error.value = 'Пароль должен быть от 6 до 64 символов'
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

    const ct = (response.headers.get('content-type') || '').toLowerCase()
    const data = ct.includes('application/json') ? await response.json() : { message: await response.text() }

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
    <img class="auth__logo" :src="logoUrl" alt="Логотип" />

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

    <form v-if="mode === 'login'" class="auth__form" @submit.prevent="onLogin" novalidate>
      <label class="auth__field">
        <span>Email</span>
        <input v-model.trim="loginEmail" type="email" placeholder="example@mail.com" required :pattern="emailRe.source" maxlength="254" />
      </label>

      <label class="auth__field">
        <span>Пароль</span>
        <input v-model="loginPassword" type="password" placeholder="Минимум 6 символов" minlength="6" maxlength="64" required />
      </label>

      <button class="auth__submit" type="submit" :disabled="!isLoginValid">Войти</button>
      <button class="auth__submit auth__submit--ghost" type="button" @click="onGuest">Войти как гость</button>
    </form>

    <form v-else class="auth__form" @submit.prevent="onRegister" novalidate>
      <label class="auth__field">
        <span>Фамилия</span>
        <input v-model.trim="regLastname" type="text" placeholder="Иванов" required maxlength="100" />
      </label>

      <label class="auth__field">
        <span>Имя</span>
        <input v-model.trim="regName" type="text" placeholder="Иван" required maxlength="100" />
      </label>

      <label class="auth__field">
        <span>Отчество</span>
        <input v-model.trim="regMidname" type="text" placeholder="Иванович" maxlength="100" />
      </label>

      <label class="auth__field">
        <span>Email</span>
        <input v-model.trim="regEmail" type="email" placeholder="example@mail.com" required :pattern="emailRe.source" maxlength="254" />
      </label>

      <label class="auth__field">
        <span>Пароль</span>
        <input v-model="regPassword" type="password" placeholder="Минимум 6 символов" minlength="6" maxlength="64" required />
      </label>

      <button class="auth__submit" type="submit" :disabled="!isRegisterValid">Зарегистрироваться</button>
      <button class="auth__submit auth__submit--ghost" type="button" @click="onGuest">Войти как гость</button>
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
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.auth__title {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth__logo {
  display: block;
  margin: 0 auto 1.25rem;
  max-width: 70%;
  width: 220px;
  height: auto;
  border-radius: 8px;
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
  border-color: var(--vt-c-indigo);
}

.auth__submit {
  margin-top: 0.75rem;
  padding: 0.7rem 0.75rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background-color: var(--vt-c-indigo);
  color: white;
  font-weight: 500;
}

.auth__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.auth__submit--ghost {
  margin-top: 0.5rem;
  background: transparent;
  color: var(--vt-c-indigo);
  border: 1px solid var(--color-border);
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
