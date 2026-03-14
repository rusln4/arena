<script setup>
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'success' // 'success' | 'error' | 'info'
  },
  duration: {
    type: Number,
    default: 3000
  }
})

const emits = defineEmits(['close'])
const visible = ref(true)

const timer = setTimeout(() => {
  close()
}, props.duration)

function close() {
  visible.value = false
  setTimeout(() => emits('close'), 300) // время для анимации
}

onUnmounted(() => {
  clearTimeout(timer)
})
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" :class="['notification', `notification--${type}`]" @click="close">
      <div class="notification__icon">
        <span v-if="type === 'success'">✅</span>
        <span v-else-if="type === 'error'">❌</span>
        <span v-else>ℹ️</span>
      </div>
      <div class="notification__message">{{ message }}</div>
    </div>
  </Transition>
</template>

<style scoped>
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 300px;
  max-width: 450px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  z-index: 9999;
  color: white;
}

.notification--success {
  background-color: #4caf50;
}

.notification--error {
  background-color: #f44336;
}

.notification--info {
  background-color: #2196f3;
}

.notification__icon {
  font-size: 20px;
}

.notification__message {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

/* Анимация появления */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
