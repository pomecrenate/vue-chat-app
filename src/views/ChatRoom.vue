<template>
  <div class="chat-container">
    <!-- 채팅방 헤더 -->
    <div class="chat-header">
      <div class="room-info">
        <h2 class="room-name">
          {{ chatStore.currentRoom?.name || '채팅방' }}
          <span v-if="isRoomOwner" class="owner-badge" title="방장">👑</span>
        </h2>
        <div class="room-details">
          <span class="user-count">
            <span class="count-icon">👥</span>
            {{ chatStore.currentRoom?.userCount || 0 }}명
          </span>
          <span v-if="chatStore.currentRoom?.owner" class="room-owner">
            방장: {{ chatStore.currentRoom.owner }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button @click="leaveRoom" class="leave-btn">
          <span class="leave-icon">🚪</span>
          나가기
        </button>
      </div>
    </div>

    <!-- 채팅 메시지 영역 -->
    <div ref="messagesContainer" class="messages-container">
      <div
        v-for="message in chatStore.messages"
        :key="message.id"
        :class="[
          'message',
          message.type === 'system' ? 'system-message' : 'user-message',
          message.user === userStore.nickname ? 'my-message' : 'other-message'
        ]"
      >
        <!-- 시스템 메시지 -->
        <div v-if="message.type === 'system'" class="system-content">
          <span class="system-icon">ℹ️</span>
          <span class="system-text">{{ message.message || message.text }}</span>
          <span class="system-time">{{ formatTime(message.timestamp) }}</span>
        </div>

        <!-- 일반 사용자 메시지 -->
        <div v-else class="message-content">
          <!-- 다른 사용자 메시지 헤더 -->
          <div v-if="message.user !== userStore.nickname" class="message-header">
            <span class="username">
              {{ message.user }}
              <span v-if="message.isOwner" class="owner-crown" title="방장">👑</span>
            </span>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>

          <!-- 메시지 텍스트 -->
          <div class="message-text">
            {{ message.message || message.text }}
          </div>

          <!-- 내 메시지 타임스탬프 -->
          <div v-if="message.user === userStore.nickname" class="my-message-time">
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
      </div>

      <!-- 스크롤 하단 고정 요소 -->
      <div ref="scrollAnchor"></div>
    </div>

    <!-- 메시지 입력 영역 -->
    <div class="input-container">
      <div class="input-wrapper">
        <input
          v-model="messageText"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="메시지를 입력하세요..."
          class="message-input"
          :disabled="!chatStore.currentRoom"
          maxlength="500"
        />
        <button
          @click="sendMessage"
          :disabled="!messageText.trim() || !chatStore.currentRoom"
          class="send-btn"
        >
          <span class="send-icon">📤</span>
          전송
        </button>
      </div>
      <div v-if="messageText.length > 400" class="char-count">
        {{ messageText.length }}/500
      </div>
    </div>

    <!-- 방장 권한 알림 모달 -->
    <div v-if="ownershipModal.show" class="modal-overlay" @click="closeOwnershipModal">
      <div class="modal-content ownership-modal" @click.stop>
        <div class="modal-header">
          <h3>👑 방장 권한 위임</h3>
        </div>
        <div class="modal-body">
          <p>{{ ownershipModal.message }}</p>
          <div class="ownership-info">
            <strong>{{ ownershipModal.roomName }}</strong> 채팅방의 새로운 방장이 되었습니다!
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeOwnershipModal" class="modal-close-btn">
            확인
          </button>
        </div>
      </div>
    </div>

    <!-- 방장 변경 알림 -->
    <div v-if="ownerChangeNotification.show" class="notification owner-change-notification">
      <div class="notification-content">
        <span class="notification-icon">👑</span>
        <span class="notification-text">{{ ownerChangeNotification.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 채팅방 컴포넌트
 * 
 * 기능:
 * 1. 실시간 메시지 송수신
 * 2. 방장 권한 표시 및 관리
 * 3. 시스템 메시지 처리
 * 4. 방장 권한 위임 알림
 * 5. 채팅방 나가기
 * 
 * 방장 시스템:
 * - 방장은 👑 아이콘으로 표시
 * - 방장 권한 위임 시 모달 알림
 * - 방장 변경 시 알림 메시지
 */
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useChatStore } from '../stores/chat'
import socket from '../api/socket'

// 라우터와 스토어 인스턴스
const router = useRouter()
const userStore = useUserStore()
const chatStore = useChatStore()

// 반응형 상태
const messageText = ref('')                          // 입력 중인 메시지
const messagesContainer = ref(null)                  // 메시지 컨테이너 참조
const scrollAnchor = ref(null)                       // 스크롤 앵커 참조

// 방장 권한 알림 모달 상태
const ownershipModal = ref({
  show: false,
  message: '',
  roomName: ''
})

// 방장 변경 알림 상태
const ownerChangeNotification = ref({
  show: false,
  message: ''
})

// 방장 여부 computed 속성 (실시간 반응성 보장)
const isRoomOwner = computed(() => {
  return chatStore.currentRoom?.isOwner || false
})

/**
 * 메시지 전송 함수
 * 
 * 입력된 메시지를 서버로 전송하고 UI를 업데이트합니다.
 */
function sendMessage() {
  // 메시지 내용 검증
  const text = messageText.value.trim()
  if (!text || !chatStore.currentRoom) {
    return
  }

  console.log('메시지 전송:', text)

  // 메시지 객체 생성
  const message = {
    user: userStore.nickname,
    message: text,
    room: chatStore.currentRoom.id,
    timestamp: new Date().toISOString(),
    isOwner: chatStore.currentRoom.isOwner || false
  }

  /**
   * 서버로 메시지 전송
   * 
   * 서버에서 처리:
   * 1. 메시지 검증
   * 2. 방 존재 여부 확인
   * 3. 사용자 권한 확인
   * 4. 타임스탬프 및 ID 추가
   * 5. 방의 모든 사용자에게 브로드캐스트
   */
  socket.emit('chat message', message)

  // 입력 필드 초기화
  messageText.value = ''
}

/**
 * 채팅방 나가기 함수
 * 
 * 현재 채팅방에서 나가고 로비로 이동합니다.
 */
function leaveRoom() {
  if (!chatStore.currentRoom) {
    console.log('현재 채팅방 정보가 없습니다.')
    router.push('/lobby')
    return
  }

  console.log('채팅방 나가기:', chatStore.currentRoom.name)

  // 확인 대화상자
  if (!confirm('채팅방을 나가시겠습니까?')) {
    return
  }

  /**
   * 서버로 채팅방 나가기 요청
   * 
   * 서버에서 처리:
   * 1. 사용자를 방에서 제거
   * 2. Socket.io 룸에서 제거
   * 3. 방장인 경우 권한 위임 또는 방 삭제
   * 4. 다른 사용자들에게 퇴장 알림
   */
  socket.emit('leave', {
    user: userStore.nickname,
    room: chatStore.currentRoom.id
  })
}

/**
 * 시간 포맷팅 함수
 * 
 * @param {string|Date} timestamp - 포맷팅할 시간
 * @returns {string} 포맷팅된 시간 문자열
 */
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMinutes = Math.floor((now - date) / (1000 * 60))

  if (diffMinutes < 1) {
    return '방금 전'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  } else if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } else {
    return date.toLocaleDateString('ko-KR', { 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit'
    })
  }
}

/**
 * 메시지 영역 스크롤 하단 고정 함수
 */
function scrollToBottom() {
  nextTick(() => {
    if (scrollAnchor.value) {
      scrollAnchor.value.scrollIntoView({ behavior: 'smooth' })
    }
  })
}

/**
 * 방장 권한 알림 모달 닫기
 */
function closeOwnershipModal() {
  ownershipModal.value.show = false
}

/**
 * 방장 변경 알림 자동 숨김
 */
function hideOwnerChangeNotification() {
  setTimeout(() => {
    ownerChangeNotification.value.show = false
  }, 5000) // 5초 후 자동 숨김
}

/**
 * Socket.io 이벤트 리스너 등록
 */

// 채팅 메시지 수신 이벤트
socket.on('chat message', (message) => {
  console.log('메시지 수신:', message)
  
  // 메시지를 채팅 스토어에 추가
  chatStore.addMessage({
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user: message.user,
    message: message.message || message.text,
    timestamp: message.timestamp || message.serverTimestamp || new Date(),
    type: message.type || 'user',
    isOwner: message.isOwner || false
  })

  // 스크롤을 하단으로 이동
  scrollToBottom()
})

// 사용자 입장 알림 이벤트
socket.on('user joined', (data) => {
  console.log('사용자 입장 알림:', data)
  
  // 시스템 메시지로 추가
  chatStore.addMessage({
    id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'system',
    message: data.message,
    timestamp: data.timestamp || new Date()
  })

  // 방 사용자 수 업데이트 (대략적)
  if (chatStore.currentRoom) {
    chatStore.currentRoom.userCount += 1
  }

  scrollToBottom()
})

// 사용자 퇴장 알림 이벤트
socket.on('user left', (data) => {
  console.log('사용자 퇴장 알림:', data)
  
  // 시스템 메시지로 추가
  chatStore.addMessage({
    id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'system',
    message: data.message,
    timestamp: data.timestamp || new Date()
  })

  // 방 사용자 수 업데이트 (대략적)
  if (chatStore.currentRoom && chatStore.currentRoom.userCount > 0) {
    chatStore.currentRoom.userCount -= 1
  }

  scrollToBottom()
})

// 채팅방 나가기 확인 이벤트
socket.on('leave confirmed', (data) => {
  console.log('채팅방 나가기 확인:', data)
  
  // 채팅 스토어 정리
  chatStore.clearChat()
  
  // 성공 메시지 표시
  if (data.roomDeleted) {
    alert(`채팅방이 삭제되었습니다.\n${data.message}`)
  } else if (data.newOwner) {
    alert(`채팅방을 나갔습니다.\n새로운 방장: ${data.newOwner}`)
  } else {
    alert(data.message)
  }
  
  // 로비로 이동
  router.push('/lobby')
})

// 방장 권한 위임 이벤트 (나에게 권한이 위임됨)
socket.on('ownership transferred', (data) => {
  console.log('방장 권한 위임됨:', data)
  
  // 현재 방 정보 업데이트 (방장 뱃지가 즉시 나타나도록)
  if (chatStore.currentRoom) {
    // 방장 권한 업데이트
    chatStore.updateRoomOwner(userStore.nickname, true)
  }
  
  // 방장 권한 알림 모달 표시
  ownershipModal.value = {
    show: true,
    message: data.message,
    roomName: data.room.name
  }
  
  // 시스템 메시지 추가
  chatStore.addMessage({
    id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'system',
    message: '👑 당신이 새로운 방장이 되었습니다!',
    timestamp: new Date()
  })

  scrollToBottom()
  
  console.log('방장 뱃지 표시 상태:', chatStore.currentRoom.isOwner)
})

// 방장 변경 알림 이벤트 (다른 사용자가 방장이 됨)
socket.on('owner changed', (data) => {
  console.log('방장 변경 알림:', data)
  
  // 현재 방 정보 업데이트 (방장 뱃지가 즉시 사라지도록)
  if (chatStore.currentRoom) {
    // 방장 권한 업데이트 (내가 방장이 아니므로 false)
    chatStore.updateRoomOwner(data.newOwner, false)
  }
  
  // 방장 변경 알림 표시
  ownerChangeNotification.value = {
    show: true,
    message: data.message
  }
  
  // 시스템 메시지 추가
  chatStore.addMessage({
    id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'system',
    message: data.message,
    timestamp: data.timestamp || new Date()
  })

  // 자동 숨김 타이머 시작
  hideOwnerChangeNotification()
  scrollToBottom()
  
  console.log('방장 뱃지 숨김 상태:', chatStore.currentRoom.isOwner)
})

/**
 * 컴포넌트 생명주기
 */

// 메시지 변경 감지하여 스크롤 이동
watch(() => chatStore.messages.length, () => {
  scrollToBottom()
})

// 컴포넌트 마운트 시 초기화
onMounted(() => {
  console.log('채팅방 컴포넌트 마운트됨')
  
  // 사용자 인증 확인
  if (!userStore.nickname) {
    console.log('인증되지 않은 사용자 - 로그인 페이지로 이동')
    router.push('/login')
    return
  }
  
  // 현재 방 정보 확인
  if (!chatStore.currentRoom) {
    console.log('채팅방 정보가 없습니다 - 로비로 이동')
    router.push('/lobby')
    return
  }
  
  console.log(`${userStore.nickname}님이 ${chatStore.currentRoom.name} 채팅방에 입장`)
  console.log('방장 여부:', chatStore.currentRoom.isOwner ? '예' : '아니오')
  
  // 초기 스크롤을 하단으로 이동
  scrollToBottom()
})

// 컴포넌트 언마운트 시 이벤트 리스너 제거
onUnmounted(() => {
  console.log('채팅방 컴포넌트 언마운트됨')
  
  // Socket.io 이벤트 리스너 제거
  socket.off('chat message')
  socket.off('user joined')
  socket.off('user left')
  socket.off('leave confirmed')
  socket.off('ownership transferred')
  socket.off('owner changed')
})
</script>

<style scoped>
/* 채팅방 컨테이너 */
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 채팅방 헤더 */
.chat-header {
  background: rgba(255, 255, 255, 0.95);
  padding: 15px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.room-info {
  flex: 1;
}

.room-name {
  margin: 0 0 8px 0;
  font-size: 1.4rem;
  font-weight: bold;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.owner-badge {
  font-size: 1.2rem;
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { text-shadow: 0 0 5px #ffd700; }
  to { text-shadow: 0 0 10px #ffd700, 0 0 15px #ffd700; }
}

.room-details {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #666;
  font-size: 0.9rem;
}

.user-count {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.count-icon {
  font-size: 1rem;
}

.room-owner {
  font-weight: 500;
  color: #e65100;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.leave-btn {
  padding: 8px 16px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.leave-btn:hover {
  background: #ff5252;
  transform: translateY(-1px);
}

.leave-icon {
  font-size: 1rem;
}

/* 메시지 컨테이너 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 메시지 기본 스타일 */
.message {
  max-width: 70%;
  word-wrap: break-word;
}

/* 시스템 메시지 */
.system-message {
  align-self: center;
  max-width: 80%;
}

.system-content {
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 15px;
  border-radius: 20px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.system-icon {
  font-size: 1rem;
}

.system-text {
  font-weight: 500;
}

.system-time {
  font-size: 0.8rem;
  color: #999;
  margin-left: 8px;
}

/* 사용자 메시지 */
.user-message {
  margin-bottom: 8px;
}

/* 내 메시지 */
.my-message {
  align-self: flex-end;
}

.my-message .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 18px 18px 6px 18px;
  padding: 12px 16px;
  box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3);
}

.my-message-time {
  text-align: right;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

/* 다른 사용자 메시지 */
.other-message {
  align-self: flex-start;
}

.other-message .message-content {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-radius: 18px 18px 18px 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding: 8px 16px 0 16px;
}

.username {
  font-weight: 600;
  color: #555;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.owner-crown {
  font-size: 0.9rem;
  animation: glow 2s ease-in-out infinite alternate;
}

.timestamp {
  font-size: 0.75rem;
  color: #999;
}

.message-text {
  padding: 0 16px 12px 16px;
  line-height: 1.4;
  font-size: 0.95rem;
}

/* 입력 영역 */
.input-container {
  background: rgba(255, 255, 255, 0.95);
  padding: 15px 25px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.message-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 25px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
}

.message-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.message-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.send-btn {
  padding: 12px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.send-btn:hover:not(:disabled) {
  background: #5a6fd8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.send-icon {
  font-size: 1rem;
}

.char-count {
  text-align: right;
  font-size: 0.8rem;
  color: #999;
  margin-top: 8px;
}

/* 방장 권한 알림 모달 */
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
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
}

.ownership-modal .modal-header {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: white;
  padding: 20px;
  text-align: center;
}

.ownership-modal .modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: bold;
}

.ownership-modal .modal-body {
  padding: 25px;
  text-align: center;
}

.ownership-modal .modal-body p {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 1rem;
}

.ownership-info {
  background: #fff3e0;
  padding: 15px;
  border-radius: 10px;
  border-left: 4px solid #ff9800;
  color: #e65100;
  font-size: 0.95rem;
}

.ownership-modal .modal-footer {
  padding: 20px;
  text-align: center;
  border-top: 1px solid #eee;
}

.modal-close-btn {
  padding: 10px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.modal-close-btn:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

/* 방장 변경 알림 */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 999;
  animation: slideInRight 0.3s ease-out;
}

.owner-change-notification {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: white;
  padding: 15px 20px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
  max-width: 300px;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notification-icon {
  font-size: 1.2rem;
}

.notification-text {
  font-size: 0.9rem;
  font-weight: 500;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 스크롤바 스타일 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .chat-header {
    padding: 12px 15px;
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  
  .room-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .messages-container {
    padding: 15px;
  }
  
  .message {
    max-width: 85%;
  }
  
  .input-container {
    padding: 12px 15px;
  }
  
  .input-wrapper {
    flex-direction: column;
    align-items: stretch;
  }
  
  .send-btn {
    align-self: flex-end;
    width: auto;
  }
  
  .notification {
    right: 15px;
    left: 15px;
    max-width: none;
  }
}
</style>
  