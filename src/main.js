import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import arenaIcon from './components/icons/281_arena.jpg'

const app = createApp(App)

const favicon = document.querySelector("link[rel='icon']")
if (favicon) {
  favicon.setAttribute('href', arenaIcon)
}

app.mount('#app')
