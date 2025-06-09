<template>
  <div class="chat-container">
    <!-- 
      채팅방 헤더 컴포넌트 
      
      Props 전달:
      - :room-name: 채팅방 이름을 전달
      - :nickname: 현재 사용자의 닉네임을 전달 (Pinia 스토어에서 가져옴)
      
      Event 수신:
      - @leave: ChatHeader.vue에서 발생한 'leave' 이벤트를 받아서 leaveRoom 함수 실행
    -->
    <ChatHeader 
      :room-name="'단일 채팅방'"
      :nickname="userStore.nickname"
      @leave="leaveRoom"
    />

    <!-- 메시지 표시 영역 -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="chatStore.messages.length === 0" class="empty-state">
        채팅을 시작해보세요!
      </div>
      <!-- 
        채팅 메시지 컴포넌트
        
        Props 전달:
        - :message: 각 메시지 객체를 전달
        - :is-my-message: 현재 사용자의 메시지인지 여부를 전달 (스타일링에 사용)
        
        v-for를 사용하여 chatStore.messages 배열의 각 메시지마다 ChatMessage 컴포넌트 생성
      -->
      <ChatMessage
        v-for="(msg, index) in chatStore.messages" 
        :key="index"
        :message="msg"
        :is-my-message="msg.user === userStore.nickname"
      />
    </div>

    <!-- 
      메시지 입력 컴포넌트 
      
      Event 수신:
      - @send-message: ChatInput.vue에서 발생한 'send-message' 이벤트를 받아서 sendMessage 함수 실행
      
      Ref 설정:
      - ref="chatInput": 컴포넌트 참조를 위한 ref 설정 (포커스 제어 등에 사용)
    -->
    <ChatInput 
      @send-message="sendMessage"
      ref="chatInput"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import socket from '../api/socket'
import { useUserStore } from '../stores/user'
import { useChatStore } from '../stores/chat'
import ChatHeader from '../components/ChatHeader.vue'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'

/**
 * 채팅방 메인 컴포넌트
 * 
 * 이 컴포넌트는 여러 자식 컴포넌트들을 조합하여 완전한 채팅방 기능을 제공합니다.
 * 
 * 컴포넌트 구조:
 * ChatRoom.vue (부모)
 * ├── ChatHeader.vue (자식) - 헤더 표시, 나가기 기능
 * ├── ChatMessage.vue (자식, 여러 개) - 개별 메시지 표시
 * └── ChatInput.vue (자식) - 메시지 입력 기능
 * 
 * 데이터 흐름:
 * 1. Props: 부모 → 자식 (데이터 전달)
 * 2. Events: 자식 → 부모 (emit을 통한 이벤트 전달)
 * 3. Socket.io: 서버와 실시간 통신
 */

// 필요한 스토어와 라우터 초기화
const router = useRouter()
const userStore = useUserStore() // 사용자 정보 관리 (닉네임, 로그인 상태 등)
const chatStore = useChatStore() // 채팅 메시지 관리

// 로컬 상태 관리
const messagesContainer = ref(null) // 메시지 컨테이너 DOM 요소 참조 (스크롤 제어용)
const chatInput = ref(null) // ChatInput 컴포넌트 참조 (메서드 호출용)

/**
 * 컴포넌트 마운트 시 실행되는 로직
 * Vue 라이프사이클: created → mounted → updated → unmounted
 */
onMounted(() => {
  // 로그인 상태가 아니면 로그인 페이지로 리디렉션
  if (!userStore.isLogin) {
    router.push('/')
    return
  }

  // 채팅방 입장 메시지 전송 (Socket.io 서버로)
  socket.emit('join', { user: userStore.nickname, room: 'single' })

  /**
   * 채팅 메시지 수신 이벤트 리스너
   * 
   * Socket.io 이벤트 흐름:
   * 1. 다른 사용자가 메시지 전송
   * 2. 서버에서 모든 클라이언트에게 'chat message' 이벤트 브로드캐스트
   * 3. 이 리스너가 메시지를 받아서 처리
   * 4. chatStore에 메시지 추가
   * 5. 화면에 새 메시지 표시 및 스크롤 이동
   */
  socket.on('chat message', (msg) => {
    // 받은 메시지를 Pinia 스토어에 추가
    chatStore.addMessage({
      ...msg,
      timestamp: new Date()
    })
    // 메시지가 추가된 후 스크롤을 최하단으로 이동
    scrollToBottom()
  })

  // ChatInput 컴포넌트의 입력 필드에 포커스
  if (chatInput.value) {
    chatInput.value.focus()
  }
})

/**
 * 컴포넌트 언마운트 시 실행되는 로직
 * 메모리 누수 방지를 위한 정리 작업
 */
onUnmounted(() => {
  // 채팅방 나가기 메시지 전송
  socket.emit('leave', { user: userStore.nickname, room: 'single' })
  
  // 소켓 이벤트 리스너 제거 (메모리 누수 방지)
  socket.off('chat message')
})

/**
 * 새 메시지가 추가될 때마다 스크롤을 최하단으로 이동
 * Vue의 watch를 사용하여 메시지 수의 변화를 감지
 */
watch(() => chatStore.messages.length, () => {
  scrollToBottom()
})

/**
 * 메시지 전송 함수
 * 
 * 이 함수는 ChatInput.vue 컴포넌트에서 emit된 'send-message' 이벤트를 받아서 실행됩니다.
 * 
 * 이벤트 수신 과정:
 * 1. ChatInput.vue에서 사용자가 메시지 입력 후 엔터 또는 전송 버튼 클릭
 * 2. ChatInput.vue의 handleSend() 함수에서 emit('send-message', messageText) 실행
 * 3. 이 컴포넌트의 <ChatInput @send-message="sendMessage" />에서 이벤트 감지
 * 4. 이 sendMessage 함수가 messageText 매개변수와 함께 실행됨
 * 
 * @param {string} messageText - ChatInput.vue에서 전달받은 메시지 텍스트
 */
function sendMessage(messageText) {
  // 메시지 객체 생성
  const messageObj = {
    user: userStore.nickname, // 현재 사용자 닉네임
    text: messageText, // ChatInput.vue에서 전달받은 메시지 내용
    room: 'single', // 채팅방 ID
    timestamp: new Date() // 전송 시간
  }
  
  /**
   * 서버로 메시지 전송 (Socket.io)
   * 
   * Socket.io 메시지 흐름:
   * 1. 여기서 socket.emit('chat message', messageObj) 실행
   * 2. 서버(server/index.js)에서 'chat message' 이벤트 수신
   * 3. 서버가 같은 채팅방의 모든 클라이언트에게 메시지 브로드캐스트
   * 4. 모든 클라이언트(본인 포함)의 'chat message' 리스너가 실행됨
   * 5. 화면에 메시지 표시
   */
  socket.emit('chat message', messageObj)
}

/**
 * 채팅방 나가기 함수
 * 
 * 이 함수는 ChatHeader.vue 컴포넌트에서 emit된 'leave' 이벤트를 받아서 실행됩니다.
 * 
 * 이벤트 수신 과정:
 * 1. ChatHeader.vue에서 사용자가 "나가기" 버튼 클릭
 * 2. ChatHeader.vue의 handleLeave() 함수에서 emit('leave') 실행
 * 3. 이 컴포넌트의 <ChatHeader @leave="leaveRoom" />에서 이벤트 감지
 * 4. 이 leaveRoom 함수가 실행됨
 */
function leaveRoom() {
  // 서버에 채팅방 나가기 메시지 전송
  socket.emit('leave', { user: userStore.nickname, room: 'single' })
  
  // Pinia 스토어의 채팅 메시지 초기화
  chatStore.clear()
  
  // Vue Router를 사용하여 로비 페이지로 이동
  router.push('/lobby')
}

/**
 * 메시지 컨테이너를 최하단으로 스크롤하는 함수
 * 새 메시지가 추가될 때마다 자동으로 스크롤이 내려가도록 함
 */
function scrollToBottom() {
  /**
   * nextTick 사용 이유:
   * Vue는 DOM 업데이트를 비동기적으로 처리합니다.
   * 메시지가 추가된 직후에 스크롤을 시도하면 아직 DOM이 업데이트되지 않아서
   * 정확한 scrollHeight를 얻을 수 없습니다.
   * nextTick을 사용하면 DOM 업데이트가 완료된 후에 스크롤 함수가 실행됩니다.
   */
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 70vh;
  border-radius: 8px;
  background-color: #fff;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background-color: #f8f8f8;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 2rem;
}
</style>
  