<template>
  <div class="chat-header">
    <h3>{{ roomName }}</h3>
    <div class="user-info">
      접속자: <span class="nickname">{{ nickname }}</span>
      <button class="btn-leave" @click="handleLeave">나가기</button>
    </div>
  </div>
</template>

<script setup>
/**
 * 채팅방 헤더 컴포넌트
 * 방 이름, 사용자 정보, 나가기 버튼을 표시
 * 
 * 이 컴포넌트는 ChatRoom.vue에서 사용되며,
 * 나가기 버튼 클릭 시 부모 컴포넌트로 이벤트를 전송합니다.
 */

/**
 * Props 정의 - 부모 컴포넌트에서 전달받는 데이터
 * 
 * Props 데이터 흐름: ChatRoom.vue → ChatHeader.vue
 * 
 * 사용 위치: ChatRoom.vue의 
 * <ChatHeader 
 *   :room-name="'단일 채팅방'"
 *   :nickname="userStore.nickname"
 *   @leave="leaveRoom"
 * />
 * 
 * Props 전달 과정:
 * 1. ChatRoom.vue에서 :room-name="'단일 채팅방'" 설정
 * 2. 이 컴포넌트의 roomName에 '단일 채팅방' 값이 전달됨
 * 3. 템플릿에서 {{ roomName }}으로 표시됨
 */
const props = defineProps({
  /**
   * 채팅방 이름
   * @type {String}
   * 전달 위치: ChatRoom.vue의 :room-name 속성
   */
  roomName: {
    type: String,
    default: '채팅방'
  },
  /**
   * 사용자 닉네임
   * @type {String}
   * 전달 위치: ChatRoom.vue의 :nickname 속성
   * 실제 값: userStore.nickname (Pinia 스토어에서 가져옴)
   */
  nickname: {
    type: String,
    required: true
  }
})

/**
 * 이벤트 정의 - Vue의 emit 시스템
 * 
 * defineEmits는 이 컴포넌트가 부모 컴포넌트로 보낼 수 있는 이벤트를 정의합니다.
 * 'leave' 이벤트는 ChatRoom.vue의 @leave 리스너로 전달됩니다.
 * 
 * 사용 위치: ChatRoom.vue의 <ChatHeader @leave="leaveRoom" />
 * 
 * 이벤트 흐름:
 * 1. 사용자가 "나가기" 버튼 클릭
 * 2. handleLeave() 함수 실행
 * 3. emit('leave') 호출
 * 4. ChatRoom.vue의 leaveRoom() 함수가 실행됨
 */
const emit = defineEmits(['leave'])

/**
 * 나가기 버튼 클릭 처리 함수
 * 
 * 실행 트리거: 나가기 버튼 클릭 (@click="handleLeave")
 * 
 * 처리 과정:
 * 1. 버튼 클릭 이벤트 발생
 * 2. handleLeave() 함수 실행
 * 3. emit('leave') 호출
 * 4. 부모 컴포넌트(ChatRoom.vue)의 leaveRoom 함수 실행
 * 
 * 데이터 흐름: ChatHeader.vue → (emit) → ChatRoom.vue
 * 
 * emit 메커니즘 상세:
 * - 이벤트 이름: 'leave'
 * - 전달할 데이터: 없음 (단순 알림용 이벤트)
 * 
 * 부모에서 받는 방법:
 * <ChatHeader @leave="leaveRoom" />
 * → leaveRoom() 함수가 호출됨
 * 
 * 요청 대상: src/views/ChatRoom.vue의 leaveRoom 함수
 */
function handleLeave() {
  /**
   * 부모 컴포넌트(ChatRoom.vue)로 나가기 이벤트 발생
   * 
   * 이 emit이 실행되면:
   * 1. ChatRoom.vue의 @leave 리스너가 감지
   * 2. ChatRoom.vue의 leaveRoom() 함수 실행
   * 3. 소켓으로 서버에 나가기 메시지 전송
   * 4. 채팅 메시지 초기화
   * 5. 로비 페이지(/lobby)로 라우팅
   */
  emit('leave')
}
</script>

<style scoped>
.chat-header {
  padding: 1rem;
  background-color: #42b983;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nickname {
  font-weight: bold;
}

.btn-leave {
  background-color: rgba(255, 255, 255, 0.3);
  border: none;
  color: white;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}
</style> 