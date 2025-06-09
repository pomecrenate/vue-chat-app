/**
 * Vue Router 설정
 * 
 * SPA(Single Page Application)의 라우팅을 관리합니다.
 * 페이지 간 이동과 URL 관리를 담당합니다.
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

// 컴포넌트 import (지연 로딩 사용)
const Login = () => import('../views/Login.vue')
const Lobby = () => import('../views/Lobby.vue')
const ChatRoom = () => import('../views/ChatRoom.vue')

/**
 * 라우트 정의
 * 
 * 각 라우트는 URL 경로와 해당하는 컴포넌트를 매핑합니다.
 */
const routes = [
  /**
   * 루트 경로 - 로그인 페이지로 리디렉션
   */
  {
    path: '/',
    redirect: '/login'
  },

  /**
   * 로그인 페이지
   * 
   * 경로: /login
   * 컴포넌트: Login.vue
   * 설명: 사용자 닉네임 입력 및 인증
   */
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '로그인',
      description: '닉네임을 입력하여 채팅에 참여하세요',
      requiresAuth: false // 인증이 필요하지 않은 페이지
    }
  },

  /**
   * 로비 페이지
   * 
   * 경로: /lobby
   * 컴포넌트: Lobby.vue
   * 설명: 채팅방 목록 조회 및 채팅방 생성
   */
  {
    path: '/lobby',
    name: 'Lobby',
    component: Lobby,
    meta: {
      title: '채팅 로비',
      description: '채팅방을 생성하거나 기존 방에 입장하세요',
      requiresAuth: true // 인증이 필요한 페이지
    }
  },

  /**
   * 채팅방 페이지
   * 
   * 경로: /chat
   * 컴포넌트: ChatRoom.vue
   * 설명: 실시간 채팅 기능
   * 
   * 방장 시스템:
   * - 방 생성자가 자동으로 방장이 됨
   * - 방장 나가면 다음 사용자에게 권한 위임
   * - 빈 방은 자동 삭제
   */
  {
    path: '/chat',
    name: 'ChatRoom',
    component: ChatRoom,
    meta: {
      title: '채팅방',
      description: '실시간 채팅을 즐기세요',
      requiresAuth: true // 인증이 필요한 페이지
    }
  },

  /**
   * 404 Not Found 페이지
   * 
   * 존재하지 않는 경로에 대한 폴백
   */
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/login'
  }
]

/**
 * 라우터 인스턴스 생성
 * 
 * createWebHistory: HTML5 History 모드 사용
 * - URL에 '#' 없이 깔끔한 URL 사용
 * - 서버 설정이 필요 (모든 경로를 index.html로 리디렉션)
 */
const router = createRouter({
  history: createWebHistory(),
  routes,
  
  /**
   * 스크롤 동작 설정
   * 
   * 페이지 이동 시 스크롤 위치를 맨 위로 이동
   */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

/**
 * 라우터 가드 설정
 * 
 * 페이지 이동 전에 실행되는 미들웨어
 * 인증 상태 확인 및 권한 검사
 */
router.beforeEach((to, from, next) => {
  // 페이지 제목 설정
  if (to.meta.title) {
    document.title = `${to.meta.title} - Vue 채팅앱`
  }

  // 인증이 필요한 페이지 체크
  if (to.meta.requiresAuth) {
    const userStore = useUserStore()
    
    // 로그인 상태 확인
    if (!userStore.nickname) {
      console.log('인증되지 않은 접근:', to.path)
      
      // 로그인 페이지로 리디렉션
      next({
        path: '/login',
        query: { redirect: to.fullPath } // 로그인 후 원래 페이지로 돌아가기 위해
      })
      return
    }
  }

  // 로그인된 사용자가 로그인 페이지에 접근하려는 경우
  if (to.path === '/login') {
    const userStore = useUserStore()
    
    if (userStore.nickname) {
      console.log('이미 로그인된 사용자의 로그인 페이지 접근')
      
      // 로비로 리디렉션
      next('/lobby')
      return
    }
  }

  // 정상적인 네비게이션 허용
  next()
})

/**
 * 라우터 에러 처리
 */
router.onError((error) => {
  console.error('라우터 에러:', error)
  
  // 에러 발생 시 로그인 페이지로 이동
  router.push('/login')
})

export default router
