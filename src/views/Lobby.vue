<template>
  <div class="lobby-container">
    <!-- 상단 헤더 -->
    <div class="lobby-header">
      <h1 class="lobby-title">💬 채팅 로비</h1>
      <div class="user-info">
        <span class="username">{{ userStore.nickname }}님 환영합니다!</span>
        <button @click="logout" class="logout-btn">로그아웃</button>
      </div>
    </div>

    <!-- 채팅방 생성 섹션 -->
    <div class="create-room-section">
      <h2>🏠 새 채팅방 만들기</h2>
      <div class="create-room-form">
        <input
          v-model="newRoomName"
          @keyup.enter="createRoom"
          type="text"
          placeholder="채팅방 이름을 입력하세요"
          class="room-name-input"
          maxlength="30"
        />
        <button @click="createRoom" :disabled="!newRoomName.trim()" class="create-room-btn">
          <span class="btn-icon">➕</span>
          채팅방 생성
        </button>
      </div>
      <p class="create-room-hint">💡 채팅방을 만들면 당신이 방장이 됩니다!</p>
    </div>

    <!-- 채팅방 목록 섹션 -->
    <div class="rooms-section">
      <div class="section-header">
        <h2>🏠 활성 채팅방 목록</h2>
        <button @click="refreshRooms" class="refresh-btn">
          <span class="refresh-icon">🔄</span>
          새로고침
        </button>
      </div>

      <!-- 로딩 상태 -->
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>채팅방 목록을 불러오는 중...</p>
      </div>

      <!-- 채팅방이 없는 경우 -->
      <div v-else-if="rooms.length === 0" class="empty-rooms">
        <div class="empty-icon">🏗️</div>
        <h3>아직 생성된 채팅방이 없습니다</h3>
        <p>첫 번째 채팅방을 만들어보세요!</p>
      </div>

      <!-- 채팅방 목록 -->
      <div v-else class="rooms-grid">
        <div
          v-for="room in rooms"
          :key="room.id"
          class="room-card"
          @click="joinRoom(room.id)"
        >
          <!-- 방 헤더 -->
          <div class="room-header">
            <h3 class="room-name">{{ room.name }}</h3>
            <div class="room-status">
              <span class="user-count">
                <span class="count-icon">👥</span>
                {{ room.userCount }}명
              </span>
            </div>
          </div>

          <!-- 방장 정보 -->
          <div class="room-owner">
            <span class="owner-badge">👑</span>
            <span class="owner-name">{{ room.owner }}</span>
          </div>

          <!-- 참여자 목록 (최대 3명까지 표시) -->
          <div class="room-users">
            <div class="users-list">
              <span
                v-for="(user, index) in room.users.slice(0, 3)"
                :key="index"
                class="user-tag"
              >
                {{ user }}
              </span>
              <span v-if="room.users.length > 3" class="more-users">
                +{{ room.users.length - 3 }}명
              </span>
            </div>
          </div>

          <!-- 방 정보 -->
          <div class="room-info">
            <span class="created-time">
              📅 {{ formatDate(room.createdAt) }}
            </span>
          </div>

          <!-- 입장 버튼 -->
          <div class="room-actions">
            <button class="join-btn">
              <span class="join-icon">🚪</span>
              입장하기
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 채팅방 생성 중 로딩 모달 -->
    <div v-if="creatingRoom" class="modal-overlay">
      <div class="modal-content">
        <div class="loading-spinner"></div>
        <p>채팅방을 생성하는 중...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 채팅 로비 컴포넌트
 * 
 * 기능:
 * 1. 새 채팅방 생성
 * 2. 활성 채팅방 목록 조회
 * 3. 채팅방 입장
 * 4. 방장 정보 표시
 * 5. 실시간 목록 업데이트
 * 
 * 방장 시스템:
 * - 채팅방 생성자가 방장이 됨
 * - 방장은 👑 아이콘으로 표시
 * - 방장 나가면 다음 사용자가 방장 승계
 * - 빈 방은 자동 삭제
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useChatStore } from '../stores/chat'
import socket from '../api/socket'

// 라우터와 스토어 인스턴스
const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

// 반응형 상태
const rooms = ref([])              // 채팅방 목록
const loading = ref(true)          // 로딩 상태
const newRoomName = ref('')        // 새 채팅방 이름
const creatingRoom = ref(false)    // 채팅방 생성 중 상태

/**
 * 새 채팅방 생성 함수
 * 
 * 서버로 'create room' 이벤트를 전송하여 새 채팅방을 생성합니다.
 * 생성자는 자동으로 방장이 되며, 생성 후 해당 방으로 이동합니다.
 */
function createRoom() {
  // 입력값 검증
  const roomName = newRoomName.value.trim()
  if (!roomName) {
    alert('채팅방 이름을 입력해주세요.')
    return
  }

  if (roomName.length > 30) {
    alert('채팅방 이름은 30자 이하로 입력해주세요.')
    return
  }

  console.log('채팅방 생성 시도:', roomName)
  creatingRoom.value = true

  /**
   * 서버로 채팅방 생성 요청
   * 
   * 전송 데이터:
   * - user: 생성자 닉네임
   * - roomName: 새 채팅방 이름
   * 
   * 서버에서 처리:
   * 1. 방 이름 중복 검사
   * 2. 고유 방 ID 생성
   * 3. 생성자를 방장으로 설정
   * 4. 방 데이터 저장
   * 5. 생성자를 방에 입장시킴
   * 6. 모든 클라이언트에게 목록 업데이트
   */
  socket.emit('create room', {
    user: userStore.nickname,
    roomName: roomName
  })

  // 입력 필드 초기화
  newRoomName.value = ''
}

/**
 * 채팅방 입장 함수
 * 
 * @param {string} roomId - 입장할 채팅방 ID
 */
function joinRoom(roomId) {
  console.log('채팅방 입장 시도:', roomId)
  
  // 채팅 스토어에 현재 방 정보 저장
  const room = rooms.value.find(r => r.id === roomId)
  if (room) {
    chatStore.setCurrentRoom({
      id: room.id,
      name: room.name,
      owner: room.owner,
      userCount: room.userCount
    })
  }

  /**
   * 서버로 채팅방 입장 요청
   * 
   * 전송 데이터:
   * - user: 사용자 닉네임
   * - room: 채팅방 ID
   * 
   * 서버에서 처리:
   * 1. 방 존재 여부 확인
   * 2. 사용자를 방에 추가
   * 3. Socket.io 룸에 입장
   * 4. 다른 사용자들에게 입장 알림
   * 5. 입장 확인 응답
   */
  socket.emit('join', {
    user: userStore.nickname,
    room: roomId
  })
}

/**
 * 채팅방 목록 새로고침 함수
 */
function refreshRooms() {
  console.log('채팅방 목록 새로고침 요청')
  loading.value = true
  
  /**
   * 서버로 채팅방 목록 요청
   * 
   * 서버에서 응답:
   * - rooms: 활성 채팅방 배열
   * - totalRooms: 총 채팅방 수
   * - timestamp: 응답 시간
   */
  socket.emit('get rooms')
}

/**
 * 로그아웃 함수
 */
function logout() {
  console.log('로그아웃 요청')
  
  // 현재 방에서 나가기 (있다면)
  if (chatStore.currentRoom) {
    socket.emit('leave', {
      user: userStore.nickname,
      room: chatStore.currentRoom.id
    })
  }

  // 스토어 정리
  userStore.clearUser()
  chatStore.clearChat()
  
  // 로그인 페이지로 이동
  router.push('/login')
}

/**
 * 날짜 포맷팅 함수
 * 
 * @param {string|Date} dateString - 포맷팅할 날짜
 * @returns {string} 포맷팅된 날짜 문자열
 */
function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now - date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } else if (diffDays === 1) {
    return '어제'
  } else if (diffDays < 7) {
    return `${diffDays}일 전`
  } else {
    return date.toLocaleDateString('ko-KR', { 
      month: '2-digit', 
      day: '2-digit' 
    })
  }
}

/**
 * Socket.io 이벤트 리스너 등록
 */

// 채팅방 생성 성공 이벤트
socket.on('room created', (data) => {
  console.log('채팅방 생성 성공:', data)
  creatingRoom.value = false
  
  // 성공 메시지 표시
  alert(`'${data.room.name}' 채팅방이 생성되었습니다! 🎉\n당신이 방장입니다. 👑`)
  
  // 생성된 방으로 자동 이동
  // 이미 서버에서 방에 입장시켰으므로 채팅방 페이지로 이동
  chatStore.setCurrentRoom({
    id: data.room.id,
    name: data.room.name,
    owner: data.room.owner,
    isOwner: data.room.isOwner,
    userCount: data.room.userCount
  })
  
  router.push('/chat')
})

// 채팅방 생성 실패 이벤트
socket.on('room creation failed', (error) => {
  console.error('채팅방 생성 실패:', error)
  creatingRoom.value = false
  
  // 에러 메시지 표시
  alert(`채팅방 생성에 실패했습니다.\n${error.error}`)
})

// 채팅방 입장 확인 이벤트
socket.on('join confirmed', (data) => {
  console.log('채팅방 입장 확인:', data)
  
  // 채팅 스토어에 방 정보 저장
  chatStore.setCurrentRoom({
    id: data.room.id,
    name: data.room.name,
    owner: data.room.owner,
    isOwner: data.room.isOwner,
    userCount: data.room.userCount,
    users: data.room.users
  })
  
  // 채팅방 페이지로 이동
  router.push('/chat')
})

// 채팅방 입장 실패 이벤트
socket.on('join failed', (error) => {
  console.error('채팅방 입장 실패:', error)
  alert(`채팅방 입장에 실패했습니다.\n${error.error}`)
})

// 채팅방 목록 수신 이벤트
socket.on('rooms list', (data) => {
  console.log('채팅방 목록 수신:', data)
  
  // 받은 목록으로 업데이트
  rooms.value = data.rooms || []
  loading.value = false
  
  console.log(`총 ${data.totalRooms}개의 채팅방이 있습니다.`)
})

/**
 * 컴포넌트 생명주기
 */

// 컴포넌트 마운트 시 초기화
onMounted(() => {
  console.log('로비 컴포넌트 마운트됨')
  
  // 사용자 인증 확인
  if (!userStore.nickname) {
    console.log('인증되지 않은 사용자 - 로그인 페이지로 이동')
    router.push('/login')
    return
  }
  
  console.log(`${userStore.nickname}님 로비 입장`)
  
  // 초기 채팅방 목록 요청
  refreshRooms()
})

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  console.log('로비 컴포넌트 언마운트됨')
  
  // Socket.io 이벤트 리스너 제거
  socket.off('room created')
  socket.off('room creation failed')
  socket.off('join confirmed')
  socket.off('join failed')
  socket.off('rooms list')
})
</script>

<style scoped>
/* 로비 컨테이너 스타일 */
.lobby-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

/* 상단 헤더 */
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 30px;
  border-radius: 15px;
  margin-bottom: 30px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(8px);
}

.lobby-title {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.username {
  font-size: 1.1rem;
  color: #555;
  font-weight: 500;
}

.logout-btn {
  padding: 8px 16px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: #ff5252;
  transform: translateY(-1px);
}

/* 채팅방 생성 섹션 */
.create-room-section {
  background: rgba(255, 255, 255, 0.95);
  padding: 25px;
  border-radius: 15px;
  margin-bottom: 30px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(8px);
}

.create-room-section h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.4rem;
}

.create-room-form {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.room-name-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.room-name-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.create-room-btn {
  padding: 12px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.create-room-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.create-room-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 1.2rem;
}

.create-room-hint {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  font-style: italic;
}

/* 채팅방 목록 섹션 */
.rooms-section {
  background: rgba(255, 255, 255, 0.95);
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(8px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.section-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.4rem;
}

.refresh-btn {
  padding: 8px 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: #1976D2;
  transform: translateY(-1px);
}

.refresh-icon {
  animation: none;
  transition: transform 0.3s ease;
}

.refresh-btn:hover .refresh-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 로딩 상태 */
.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

/* 빈 상태 */
.empty-rooms {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-rooms h3 {
  margin: 0 0 10px 0;
  color: #555;
}

.empty-rooms p {
  margin: 0;
  color: #777;
}

/* 채팅방 카드 그리드 */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

/* 채팅방 카드 */
.room-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
}

.room-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.room-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
  flex: 1;
  margin-right: 10px;
}

.room-status {
  display: flex;
  align-items: center;
}

.user-count {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.count-icon {
  font-size: 0.9rem;
}

/* 방장 정보 */
.room-owner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  padding: 8px 12px;
  background: #fff3e0;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.owner-badge {
  font-size: 1.1rem;
}

.owner-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e65100;
}

/* 참여자 목록 */
.room-users {
  margin-bottom: 15px;
}

.users-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.user-tag {
  background: #f5f5f5;
  color: #666;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.more-users {
  background: #e0e0e0;
  color: #555;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* 방 정보 */
.room-info {
  margin-bottom: 15px;
  color: #777;
  font-size: 0.85rem;
}

/* 액션 버튼 */
.room-actions {
  text-align: center;
}

.join-btn {
  width: 100%;
  padding: 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.join-btn:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.join-icon {
  font-size: 1.1rem;
}

/* 모달 오버레이 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-content p {
  margin: 15px 0 0 0;
  color: #666;
  font-size: 1.1rem;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .lobby-container {
    padding: 15px;
  }
  
  .lobby-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .lobby-title {
    font-size: 1.5rem;
  }
  
  .create-room-form {
    flex-direction: column;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
}
</style>
