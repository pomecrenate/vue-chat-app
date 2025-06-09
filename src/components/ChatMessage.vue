<template>
  <div 
    :class="['message', isMyMessage ? 'my-message' : 'other-message']"
  >
    <div class="message-meta">
      <span class="message-user">{{ message.user }}</span>
      <span class="message-time">{{ formatTime(message.timestamp) }}</span>
    </div>
    <div class="message-content">{{ message.text }}</div>
  </div>
</template>

<script setup>
/**
 * 개별 채팅 메시지 컴포넌트
 * 메시지 데이터를 받아서 적절한 형식으로 표시
 * 
 * 이 컴포넌트는 ChatRoom.vue에서 v-for로 반복 생성되며,
 * 각 메시지마다 하나의 ChatMessage 컴포넌트 인스턴스가 생성됩니다.
 * 
 * 사용 위치: ChatRoom.vue의
 * <ChatMessage
 *   v-for="(msg, index) in chatStore.messages" 
 *   :key="index"
 *   :message="msg"
 *   :is-my-message="msg.user === userStore.nickname"
 * />
 */

/**
 * Props 정의 - 부모 컴포넌트(ChatRoom.vue)에서 전달받는 데이터
 * 
 * Props 데이터 흐름: ChatRoom.vue → ChatMessage.vue
 * 
 * Props 전달 과정:
 * 1. ChatRoom.vue에서 chatStore.messages 배열을 v-for로 순회
 * 2. 각 메시지(msg)마다 ChatMessage 컴포넌트 생성
 * 3. :message="msg"로 메시지 객체 전달
 * 4. :is-my-message="msg.user === userStore.nickname"로 소유자 여부 전달
 * 5. 이 컴포넌트에서 props로 데이터 수신
 * 6. 템플릿에서 {{ message.user }}, {{ message.text }} 등으로 표시
 */
const props = defineProps({
  /**
   * 메시지 객체
   * @type {Object}
   * 
   * 전달 위치: ChatRoom.vue의 :message="msg"
   * 
   * 메시지 객체 구조:
   * {
   *   id: string,           // 메시지 고유 ID (chatStore에서 자동 생성)
   *   user: string,         // 메시지 작성자 닉네임
   *   text: string,         // 메시지 내용
   *   timestamp: Date,      // 메시지 전송 시간
   *   room: string          // 채팅방 ID (선택적)
   * }
   * 
   * 데이터 소스: Pinia의 chatStore.messages 배열
   */
  message: {
    type: Object,
    required: true
  },
  /**
   * 현재 사용자의 메시지인지 여부
   * @type {Boolean}
   * 
   * 전달 위치: ChatRoom.vue의 :is-my-message="msg.user === userStore.nickname"
   * 
   * 계산 과정:
   * 1. ChatRoom.vue에서 msg.user (메시지 작성자)와 
   *    userStore.nickname (현재 사용자)를 비교
   * 2. 같으면 true, 다르면 false
   * 3. 이 값에 따라 메시지 스타일이 달라짐:
   *    - true: 'my-message' 클래스 (오른쪽 정렬, 초록색 배경)
   *    - false: 'other-message' 클래스 (왼쪽 정렬, 회색 배경)
   */
  isMyMessage: {
    type: Boolean,
    default: false
  }
})

/**
 * 타임스탬프를 보기 좋은 형식으로 포맷팅하는 함수
 * 
 * @param {Date} timestamp - 메시지 전송 시간 (props.message.timestamp에서 전달받음)
 * @returns {string} 포맷팅된 시간 문자열 (HH:MM 형식)
 * 
 * 사용 위치: 템플릿의 {{ formatTime(message.timestamp) }}
 * 
 * 처리 과정:
 * 1. props.message.timestamp (Date 객체)를 받음
 * 2. getHours()와 getMinutes()로 시, 분 추출
 * 3. padStart(2, '0')로 한 자리 숫자는 앞에 0 추가 (예: 9 → 09)
 * 4. "HH:MM" 형식의 문자열 반환 (예: "14:30")
 */
function formatTime(timestamp) {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${hours}:${minutes}`
}
</script>

<style scoped>
.message {
  margin-bottom: 1rem;
  max-width: 70%;
  padding: 0.7rem;
  border-radius: 8px;
}

.my-message {
  margin-left: auto;
  background-color: #d1f0e0;
  border-bottom-right-radius: 0;
}

.other-message {
  margin-right: auto;
  background-color: #e9e9e9;
  border-bottom-left-radius: 0;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.2rem;
  font-size: 0.8rem;
}

.message-user {
  font-weight: bold;
}

.message-time {
  color: #777;
}

.message-content {
  word-break: break-word;
}
</style> 