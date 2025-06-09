/**
 * Socket.io 클라이언트 설정
 * 실시간 채팅 기능을 위한 웹소켓 연결을 관리합니다.
 * 
 * 핵심 개념:
 * - io(): Socket.io 클라이언트 인스턴스를 생성하는 함수
 * - socket: 생성된 클라이언트 인스턴스 (서버와의 개별 연결을 나타냄)
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
 * Socket.io 클라이언트 인스턴스 생성
 * 
 * io() 함수 분석:
 * - 클라이언트 측에서 사용하는 Socket.io 생성자 함수
 * - 서버 URL과 옵션을 받아서 클라이언트 인스턴스를 생성
 * - 반환값: socket 객체 (개별 연결을 나타내는 클라이언트 인스턴스)
 * 
 * 이 socket은:
 * 1. 브라우저 하나당 하나의 연결
 * 2. 서버의 특정 socket과 1:1 매칭
 * 3. 메시지 송수신, 이벤트 처리 담당
 * 
 * 서버 측 대응:
 * - 서버에서는 new Server()로 io 인스턴스 생성
 * - io.on('connection', (socket) => {}) 에서 socket은 이 클라이언트를 나타냄
 */
const socket = io(SOCKET_SERVER_URL, options)

/**
 * 소켓 연결 이벤트 리스너
 * 
 * 클라이언트 socket과 서버 socket의 차이점:
 * 
 * 클라이언트 socket (여기):
 * - socket.emit(): 서버로 이벤트 전송
 * - socket.on(): 서버에서 이벤트 수신
 * - socket.join(): ❌ 불가능 (서버에서만 가능)
 * 
 * 서버 socket:
 * - socket.emit(): 해당 클라이언트에게만 전송
 * - socket.on(): 해당 클라이언트에서 수신
 * - socket.join(): ✅ 가능 (룸 관리)
 * - socket.broadcast.emit(): 자신 제외하고 전송
 * 
 * 서버 io:
 * - io.emit(): 모든 클라이언트에게 전송
 * - io.to(room).emit(): 특정 룸에 전송
 * - io.on('connection'): 새 연결 감지
 */

// 연결 성공 이벤트
socket.on('connect', () => {
  console.log('소켓 서버에 연결되었습니다.')
  console.log('클라이언트 소켓 ID:', socket.id)
  console.log('연결 상태:', socket.connected)
})

// 연결 에러 이벤트
socket.on('connect_error', (error) => {
  console.error('소켓 연결 에러:', error)
  console.log('재연결 시도 중...')
})

// 연결 해제 이벤트
socket.on('disconnect', (reason) => {
  console.log('소켓 연결이 끊어졌습니다:', reason)
  console.log('연결 상태:', socket.connected)
  
  /**
   * 연결 해제 사유 (reason) 종류:
   * - 'io server disconnect': 서버에서 연결 해제
   * - 'io client disconnect': 클라이언트에서 연결 해제  
   * - 'ping timeout': 핑 타임아웃
   * - 'transport close': 전송 연결 종료
   * - 'transport error': 전송 오류
   */
})

// 재연결 시도 이벤트
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`재연결 시도 #${attemptNumber}`)
})

// 재연결 성공 이벤트
socket.on('reconnect', (attemptNumber) => {
  console.log(`재연결 성공! (시도 횟수: ${attemptNumber})`)
})

/**
 * 채팅방 생성 관련 이벤트
 * 새로운 기능: 사용자가 직접 채팅방을 생성할 수 있습니다.
 */

// 채팅방 생성 성공 이벤트
socket.on('room created', (data) => {
  console.log('채팅방 생성 성공:', data)
  console.log(`새 채팅방: ${data.room.name} (ID: ${data.room.id})`)
  console.log(`방장 여부: ${data.room.isOwner ? '예' : '아니오'}`)
})

// 채팅방 생성 실패 이벤트
socket.on('room creation failed', (error) => {
  console.error('채팅방 생성 실패:', error)
  console.error(`에러 코드: ${error.code}`)
  console.error(`에러 메시지: ${error.error}`)
})

/**
 * 채팅방 입장 관련 이벤트
 */

// 채팅방 입장 실패 이벤트
socket.on('join failed', (error) => {
  console.error('채팅방 입장 실패:', error)
  console.error(`에러 코드: ${error.code}`)
  console.error(`에러 메시지: ${error.error}`)
})

// 채팅방 나가기 실패 이벤트
socket.on('leave failed', (error) => {
  console.error('채팅방 나가기 실패:', error)
  console.error(`에러 코드: ${error.code}`)
  console.error(`에러 메시지: ${error.error}`)
})

/**
 * 방장 시스템 관련 이벤트
 * 방장 권한 위임, 변경 등을 처리합니다.
 */

// 방장 권한 위임 이벤트 (나에게 방장 권한이 넘어왔을 때)
socket.on('ownership transferred', (data) => {
  console.log('👑 방장 권한을 받았습니다!')
  console.log(`채팅방: ${data.room.name}`)
  console.log(`메시지: ${data.message}`)
  console.log(`시간: ${new Date(data.timestamp).toLocaleString()}`)
})

// 방장 변경 알림 이벤트 (다른 사람이 방장이 되었을 때)
socket.on('owner changed', (data) => {
  console.log('👑 방장이 변경되었습니다')
  console.log(`새로운 방장: ${data.newOwner}`)
  console.log(`메시지: ${data.message}`)
  console.log(`시간: ${new Date(data.timestamp).toLocaleString()}`)
})

/**
 * 이 socket 인스턴스는 애플리케이션 전체에서 공유됩니다.
 * 
 * 사용하는 컴포넌트들:
 * - Lobby.vue: 채팅방 목록 요청, 채팅방 생성
 * - ChatRoom.vue: 채팅방 입장/퇴장, 메시지 송수신
 * 
 * 주요 이벤트들:
 * 
 * 클라이언트 → 서버:
 * - create room: 새 채팅방 생성
 * - join: 채팅방 입장
 * - leave: 채팅방 퇴장  
 * - chat message: 메시지 전송
 * - get rooms: 채팅방 목록 요청
 * 
 * 서버 → 클라이언트:
 * - room created: 채팅방 생성 성공
 * - room creation failed: 채팅방 생성 실패
 * - join confirmed: 입장 확인
 * - join failed: 입장 실패
 * - leave confirmed: 나가기 확인
 * - leave failed: 나가기 실패
 * - chat message: 메시지 수신
 * - user joined: 사용자 입장 알림
 * - user left: 사용자 퇴장 알림
 * - rooms list: 채팅방 목록 수신
 * - ownership transferred: 방장 권한 받음
 * - owner changed: 방장 변경 알림
 * 
 * 방장 시스템:
 * - 채팅방 생성자가 자동으로 방장이 됨
 * - 방장이 나가면 가장 먼저 입장한 사용자가 새 방장
 * - 마지막 사용자가 나가면 채팅방 자동 삭제
 */
export default socket
