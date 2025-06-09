/**
 * Socket.io 클라이언트 설정
 * 실시간 채팅 기능을 위한 웹소켓 연결을 관리합니다.
 */
import { io } from 'socket.io-client'

// 소켓 서버 URL - 로컬 서버 URL로 변경
const SOCKET_SERVER_URL = 'http://localhost:3000'

// 소켓 연결 옵션
const options = {
  reconnectionAttempts: 5, // 재연결 시도 횟수
  reconnectionDelay: 1000, // 재연결 지연 시간 (밀리초)
  autoConnect: true // 자동 연결 여부
}

/**
 * 소켓 인스턴스 생성
 * 애플리케이션 전체에서 공유되는 싱글톤 인스턴스
 */
const socket = io(SOCKET_SERVER_URL, options)

// 소켓 연결 이벤트 리스너 등록
socket.on('connect', () => {
  console.log('소켓 서버에 연결되었습니다.')
})

socket.on('connect_error', (error) => {
  console.error('소켓 연결 에러:', error)
})

socket.on('disconnect', (reason) => {
  console.log('소켓 연결이 끊어졌습니다:', reason)
})

export default socket
