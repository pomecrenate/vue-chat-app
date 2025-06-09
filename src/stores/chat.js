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
    error: null // 에러 상태
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
    recentMessages: (state) => state.messages.slice(-10)
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
    }
  }
})
