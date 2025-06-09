<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <h2>채팅 로비</h2>
      <div class="user-info">
        <span class="welcome-text">환영합니다, <strong>{{ userStore.nickname }}</strong>님!</span>
        <button class="btn-logout" @click="logout">로그아웃</button>
      </div>
    </div>

    <div class="rooms-container">
      <h3>채팅방 목록</h3>
      
      <!-- 채팅방이 없을 경우 -->
      <div v-if="rooms.length === 0" class="empty-rooms">
        현재 활성화된 채팅방이 없습니다.
      </div>
      
      <!-- 채팅방 목록 -->
      <div v-else class="room-list">
        <div 
          v-for="room in rooms" 
          :key="room.id" 
          class="room-item"
          @click="enterRoom(room.id)"
        >
          <div class="room-name">{{ room.name }}</div>
          <div class="room-info">
            <span class="room-users">{{ room.users }}명 접속 중</span>
            <button class="btn-enter">입장</button>
          </div>
        </div>
      </div>
      
      <!-- 채팅방 생성 버튼 -->
      <div class="create-room">
        <button class="btn-create" @click="enterSingleRoom">기본 채팅방 입장</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import socket from '../api/socket'

// 라우터와 사용자 스토어
const router = useRouter()
const userStore = useUserStore()

// 채팅방 목록 (서버에서 가져옴)
const rooms = ref([])

/**
 * 컴포넌트 마운트 시 실행되는 로직
 * 1. 로그인 상태 확인
 * 2. 채팅방 목록 요청
 */
onMounted(() => {
  // 로그인 상태가 아니면 로그인 페이지로 리디렉션
  if (!userStore.isLogin) {
    router.push('/')
    return
  }
  
  // 채팅방 목록 요청 이벤트를 서버로 전송
  socket.emit('get rooms')
  
  // 채팅방 목록 수신 이벤트 리스너
  socket.on('rooms list', (roomsList) => {
    rooms.value = roomsList
  })
})

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  socket.off('rooms list')
})

/**
 * 특정 채팅방 입장 함수
 * @param {string} roomId - 입장할 채팅방 ID
 */
function enterRoom(roomId) {
  router.push(`/chat/${roomId}`)
}

/**
 * 기본 단일 채팅방 입장 함수
 */
function enterSingleRoom() {
  router.push('/chat/single')
}

/**
 * 로그아웃 함수
 * 사용자 상태를 초기화하고 로그인 페이지로 리디렉션
 */
function logout() {
  userStore.logout()
  router.push('/')
}
</script>

<style scoped>
.lobby-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eaeaea;
}

.lobby-header h2 {
  color: #42b983;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.welcome-text {
  color: #555;
}

.btn-logout {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-logout:hover {
  background-color: #d32f2f;
}

.rooms-container {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.rooms-container h3 {
  margin-top: 0;
  margin-bottom: 1.2rem;
  color: #333;
  font-size: 1.2rem;
}

.empty-rooms {
  text-align: center;
  color: #888;
  padding: 2rem 0;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.room-item {
  background-color: white;
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.room-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.room-name {
  font-weight: bold;
  color: #333;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.room-users {
  color: #777;
  font-size: 0.9rem;
}

.btn-enter {
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.create-room {
  text-align: center;
  margin-top: 1rem;
}

.btn-create {
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-create:hover {
  background-color: #3aa876;
}
</style>
