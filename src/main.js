import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'

const app = createApp(App)

// Pinia 스토어 설정
app.use(createPinia())
// 라우터 설정
app.use(router)

app.mount('#app')
