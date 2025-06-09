<template>
  <div class="message-input">
    <input 
      v-model="messageText" 
      @keyup.enter="handleSend" 
      placeholder="메시지를 입력하세요" 
      ref="messageInput"
    />
    <button 
      class="btn-send" 
      @click="handleSend" 
      :disabled="!messageText.trim()"
    >
      전송
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

/**
 * 채팅 메시지 입력 컴포넌트
 * 사용자로부터 메시지를 입력받고 전송 이벤트를 발생시킴
 * 
 * 이 컴포넌트는 ChatRoom.vue에서 사용되며,
 * 메시지가 입력되면 부모 컴포넌트(ChatRoom.vue)로 이벤트를 전송합니다.
 */

/**
 * 이벤트 정의 - Vue의 emit 시스템
 * 
 * defineEmits는 이 컴포넌트가 부모 컴포넌트로 보낼 수 있는 이벤트를 정의합니다.
 * 'send-message' 이벤트는 ChatRoom.vue의 @send-message 리스너로 전달됩니다.
 * 
 * 사용 위치: ChatRoom.vue의 <ChatInput @send-message="sendMessage" />
 * 
 * 이벤트 흐름:
 * 1. 사용자가 메시지 입력 후 엔터 또는 전송 버튼 클릭
 * 2. handleSend() 함수 실행
 * 3. emit('send-message', messageText.value) 호출
 * 4. ChatRoom.vue의 sendMessage(messageText) 함수가 실행됨
 */
const emit = defineEmits(['send-message'])

// 로컬 상태 - 이 컴포넌트에서만 관리되는 데이터
const messageText = ref('') // 입력창의 현재 텍스트
const messageInput = ref(null) // DOM 요소 참조 (포커스 제어용)

/**
 * 컴포넌트 마운트 시 입력 필드에 포커스
 * 
 * Vue 라이프사이클:
 * 1. ChatRoom.vue에서 <ChatInput /> 컴포넌트 생성
 * 2. 이 컴포넌트가 DOM에 마운트됨
 * 3. onMounted 콜백 실행 → 입력 필드에 자동 포커스
 */
onMounted(() => {
  if (messageInput.value) {
    messageInput.value.focus()
  }
})

/**
 * 메시지 전송 처리 함수
 * 
 * 실행 트리거:
 * - 입력창에서 엔터키 누를 때 (@keyup.enter="handleSend")
 * - 전송 버튼 클릭할 때 (@click="handleSend")
 * 
 * 처리 과정:
 * 1. 입력된 텍스트가 공백이 아닌지 확인
 * 2. emit('send-message', messageText.value) 실행
 *    → 이 순간 ChatRoom.vue의 sendMessage 함수가 호출됨
 * 3. 입력창 초기화 및 포커스 복원
 * 
 * 데이터 흐름: ChatInput.vue → (emit) → ChatRoom.vue
 */
function handleSend() {
  if (messageText.value.trim()) {
    /**
     * 부모 컴포넌트(ChatRoom.vue)로 메시지 전송 이벤트 발생
     * 
     * emit 메커니즘 상세:
     * - 첫 번째 매개변수: 이벤트 이름 ('send-message')
     * - 두 번째 매개변수: 전달할 데이터 (messageText.value)
     * 
     * 부모에서 받는 방법:
     * <ChatInput @send-message="sendMessage" />
     * → sendMessage(messageText) 함수가 호출됨
     * 
     * 요청 대상: src/views/ChatRoom.vue의 sendMessage 함수
     */
    emit('send-message', messageText.value)
    
    // 입력창 초기화 및 포커스 - 사용자 경험 개선
    messageText.value = ''
    if (messageInput.value) {
      messageInput.value.focus()
    }
  }
}

/**
 * 외부에서 이 컴포넌트의 메서드에 접근할 수 있도록 노출
 * 
 * defineExpose 사용법:
 * 1. ChatRoom.vue에서 ref로 이 컴포넌트 참조
 *    <ChatInput ref="chatInput" />
 * 2. ChatRoom.vue에서 chatInput.value.focus() 호출 가능
 * 
 * 호출 위치: ChatRoom.vue의 onMounted에서 chatInput.value.focus()
 */
defineExpose({
  focus: () => {
    if (messageInput.value) {
      messageInput.value.focus()
    }
  }
})
</script>

<style scoped>
.message-input {
  display: flex;
  padding: 1rem;
  background-color: #fff;
  border-top: 1px solid #eee;
}

.message-input input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 0.5rem;
  font-size: 0.9rem;
}

.btn-send {
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 1rem;
  cursor: pointer;
}

.btn-send:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style> 