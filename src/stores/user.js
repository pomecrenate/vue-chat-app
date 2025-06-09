/**
 * 사용자 관련 상태 관리 스토어
 * 사용자 정보와 인증 상태를 관리합니다.
 */
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  /**
   * 상태 정의
   * @returns {Object} 초기 상태 객체
   */
  state: () => ({
    nickname: '', // 사용자 닉네임
    isLogin: false, // 로그인 상태
    lastActive: null // 마지막 활동 시간
  }),

  /**
   * 게터 정의
   */
  getters: {
    /**
     * 사용자가 로그인했는지 확인
     * @returns {boolean} 로그인 여부
     */
    isLoggedIn: (state) => state.isLogin,

    /**
     * 사용자 닉네임의 첫 글자 반환 (아바타 등에 사용)
     * @returns {string} 닉네임의 첫 글자
     */
    userInitial: (state) => state.nickname ? state.nickname.charAt(0).toUpperCase() : ''
  },

  /**
   * 액션 정의
   */
  actions: {
    /**
     * 사용자 로그인 처리
     * @param {string} nickname - 사용자 닉네임
     */
    login(nickname) {
      this.nickname = nickname
      this.isLogin = true
      this.lastActive = new Date()
      
      // 로컬 스토리지에 사용자 정보 저장 (새로고침 시 유지)
      localStorage.setItem('user', JSON.stringify({
        nickname: this.nickname,
        isLogin: this.isLogin
      }))
    },

    /**
     * 사용자 로그아웃 처리
     */
    logout() {
      this.nickname = ''
      this.isLogin = false
      this.lastActive = null
      
      // 로컬 스토리지에서 사용자 정보 제거
      localStorage.removeItem('user')
    },

    /**
     * 로컬 스토리지에서 사용자 정보 복원
     */
    restoreUser() {
      const savedUser = localStorage.getItem('user')
      
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        this.nickname = userData.nickname
        this.isLogin = userData.isLogin
        this.lastActive = new Date()
      }
    }
  }
})