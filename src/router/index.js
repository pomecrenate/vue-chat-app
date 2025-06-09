import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Lobby from '../views/Lobby.vue'
import ChatRoom from '../views/ChatRoom.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Login },
    { path: '/lobby', component: Lobby },
    { path: '/chat/:roomId', component: ChatRoom }
  ]
})
