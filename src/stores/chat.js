/**
 * 채팅 관련 상태 관리 스토어
 * 채팅 메시지와 관련된 상태 및 액션을 관리합니다.
 */
import { defineStore } from 'pinia'

export const useChatStore = defineStore('chat', {
  /**
   * 상태 정의
   * @returns {Object} 초기 상태 객체
   */
  state: () => ({
    messages: [], // 채팅 메시지 배열
    isLoading: false, // 메시지 로딩 상태
    error: null, // 에러 상태
    currentRoom: null
  }),

  /**
   * 게터 정의
   * 상태에서 파생된 계산된 값들
   */
  getters: {
    /**
     * 총 메시지 수 반환
     * @returns {number} 총 메시지 개수
     */
    messageCount: (state) => state.messages.length,

    /**
     * 최근 메시지 반환 (최대 10개)
     * @returns {Array} 최근 10개 메시지
     */
    recentMessages: (state) => state.messages.slice(-10),

    latestMessage: (state) => {
      return state.messages.length > 0 
        ? state.messages[state.messages.length - 1] 
        : null
    },

    systemMessages: (state) => {
      return state.messages.filter(msg => msg.type === 'system')
    },

    userMessages: (state) => {
      return state.messages.filter(msg => msg.type !== 'system')
    },

    isRoomOwner: (state) => {
      return state.currentRoom?.isOwner || false
    },

    hasCurrentRoom: (state) => {
      return state.currentRoom !== null
    },

    currentRoomSummary: (state) => {
      if (!state.currentRoom) return null
      
      return {
        name: state.currentRoom.name,
        userCount: state.currentRoom.userCount || 0,
        owner: state.currentRoom.owner,
        isOwner: state.currentRoom.isOwner || false
      }
    }
  },

  /**
   * 액션 정의
   * 상태를 변경하는 메서드들
   */
  actions: {
    /**
     * 새로운 메시지 추가
     * @param {Object} message - 추가할 메시지 객체
     */
    addMessage(message) {
      // 메시지 ID 생성 (타임스탬프 기반)
      const id = Date.now().toString()
      
      // 메시지에 ID 추가하여 저장
      this.messages.push({
        id,
        ...message,
        // 타임스탬프가 없는 경우 현재 시간 추가
        timestamp: message.timestamp || new Date()
      })
    },

    /**
     * 메시지 목록 초기화
     */
    clear() {
      this.messages = []
    },

    /**
     * 특정 ID의 메시지 삭제
     * @param {string} messageId - 삭제할 메시지 ID
     */
    removeMessage(messageId) {
      this.messages = this.messages.filter(msg => msg.id !== messageId)
    },

    setCurrentRoom(roomInfo) {
      if (!roomInfo || typeof roomInfo !== 'object') {
        console.error('유효하지 않은 방 정보:', roomInfo)
        return
      }

      if (!roomInfo.id || !roomInfo.name) {
        console.error('방 ID와 이름은 필수입니다:', roomInfo)
        return
      }

      // 방 정보 정규화
      this.currentRoom = {
        id: roomInfo.id,
        name: roomInfo.name,
        owner: roomInfo.owner || null,
        isOwner: Boolean(roomInfo.isOwner),
        userCount: Number(roomInfo.userCount) || 0,
        users: Array.isArray(roomInfo.users) ? [...roomInfo.users] : [],
        createdAt: roomInfo.createdAt ? new Date(roomInfo.createdAt) : null
      }

      console.log('현재 방 정보 설정됨:', this.currentRoom)
      console.log('방장 여부:', this.currentRoom.isOwner ? '예' : '아니오')
    },

    updateUserCount(count) {
      if (!this.currentRoom) {
        console.log('현재 방 정보가 없어 사용자 수를 업데이트할 수 없습니다.')
        return
      }

      const oldCount = this.currentRoom.userCount
      this.currentRoom.userCount = Number(count) || 0
      
      console.log(`방 사용자 수 업데이트: ${oldCount}명 → ${this.currentRoom.userCount}명`)
    },

    updateRoomOwner(newOwner, isMe = false) {
      if (!this.currentRoom) {
        console.log('현재 방 정보가 없어 방장 정보를 업데이트할 수 없습니다.')
        return
      }

      const oldOwner = this.currentRoom.owner
      this.currentRoom.owner = newOwner
      this.currentRoom.isOwner = Boolean(isMe)
      
      console.log(`방장 변경: ${oldOwner} → ${newOwner}`)
      console.log('내가 방장인가:', isMe ? '예' : '아니오')
    },

    clearCurrentRoom() {
      const roomName = this.currentRoom?.name || '알 수 없는 방'
      this.currentRoom = null
      
      console.log(`'${roomName}' 방 정보가 초기화되었습니다.`)
    },

    clearChat() {
      const messageCount = this.messages.length
      const roomName = this.currentRoom?.name || '알 수 없는 방'
      
      this.messages = []
      this.currentRoom = null
      
      console.log(`채팅 데이터 전체 초기화 완료:`)
      console.log(`- 삭제된 메시지: ${messageCount}개`)
      console.log(`- 초기화된 방: ${roomName}`)
    },

    getMessagesByUser(username) {
      return this.messages.filter(msg => 
        msg.user === username && msg.type !== 'system'
      )
    },

    getMessagesByTimeRange(startTime, endTime) {
      return this.messages.filter(msg => {
        const msgTime = new Date(msg.timestamp)
        return msgTime >= startTime && msgTime <= endTime
      })
    },

    searchMessages(keyword) {
      if (!keyword || typeof keyword !== 'string') {
        return []
      }

      const searchTerm = keyword.toLowerCase().trim()
      
      return this.messages.filter(msg => 
        msg.message.toLowerCase().includes(searchTerm) ||
        msg.user.toLowerCase().includes(searchTerm)
      )
    }
  }
})
