# Socket.io 메커니즘 상세 분석

## 1. Socket.io 개요

Socket.io는 실시간 양방향 통신을 위한 JavaScript 라이브러리입니다.
WebSocket을 기본으로 하되, 환경에 따라 다른 전송 방식으로 자동 폴백됩니다.

### 전송 방식 우선순위:
1. **WebSocket** (가장 효율적)
2. **WebSocket over HTTP/2**
3. **HTTP long-polling**
4. **HTTP polling**

## 2. 연결 설정 과정

### 클라이언트 측 (src/api/socket.js)
```javascript
// 1. Socket.io 클라이언트 인스턴스 생성
const socket = io('http://localhost:3000', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true
})

// 2. 연결 이벤트 리스너 등록
socket.on('connect', () => {
  console.log('소켓 서버에 연결되었습니다.')
})
```

### 서버 측 (server/index.js)
```javascript
// 1. Socket.io 서버 생성
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// 2. 클라이언트 연결 감지
io.on('connection', (socket) => {
  console.log(`새로운 사용자 연결: ${socket.id}`)
})
```

## 3. 이벤트 기반 통신 메커니즘

Socket.io는 이벤트 기반으로 동작합니다. 클라이언트와 서버가 서로 이벤트를 보내고 받습니다.

### 이벤트 전송 (`emit`)
```javascript
// 클라이언트에서 서버로 이벤트 전송
socket.emit('이벤트이름', 데이터)

// 서버에서 클라이언트로 이벤트 전송
socket.emit('이벤트이름', 데이터)
```

### 이벤트 수신 (`on`)
```javascript
// 이벤트 리스너 등록
socket.on('이벤트이름', (데이터) => {
  // 이벤트 처리 로직
})
```

## 4. 채팅 애플리케이션의 이벤트 흐름

### 4.1 채팅방 입장 과정

```
클라이언트                           서버
    |                                |
    | 1. emit('join', userData)     |
    |------------------------------>|
    |                               | 2. 사용자 정보 저장
    |                               | 3. 채팅방에 추가
    |                               | 4. 입장 알림 생성
    | 5. on('chat message', msg)    |
    |<------------------------------|
    | 6. 화면에 입장 메시지 표시      |
```

### 4.2 메시지 전송 과정

```
클라이언트 A                        서버                     클라이언트 B, C
    |                                |                           |
    | 1. emit('chat message', msg)  |                           |
    |------------------------------>|                           |
    |                               | 2. 메시지 검증             |
    |                               | 3. 채팅방 내 모든          |
    |                               |    클라이언트에게 전송     |
    | 4. on('chat message', msg)    |                           |
    |<------------------------------|-------------------------->| 4. on('chat message', msg)
    | 5. 화면에 메시지 표시          |                           | 5. 화면에 메시지 표시
```

## 5. 룸(Room) 시스템

Socket.io의 룸은 클라이언트들을 그룹으로 관리하는 메커니즘입니다.

### 룸 입장
```javascript
// 서버에서 클라이언트를 특정 룸에 추가
socket.join('roomName')
```

### 룸 내 브로드캐스트
```javascript
// 특정 룸의 모든 클라이언트에게 메시지 전송
io.to('roomName').emit('이벤트이름', 데이터)
```

### 룸 나가기
```javascript
// 클라이언트를 룸에서 제거
socket.leave('roomName')
```

## 6. 브로드캐스팅 방식

### 6.1 전체 브로드캐스트
```javascript
// 모든 연결된 클라이언트에게 전송
io.emit('이벤트이름', 데이터)
```

### 6.2 룸 브로드캐스트
```javascript
// 특정 룸의 모든 클라이언트에게 전송
io.to('roomName').emit('이벤트이름', 데이터)
```

### 6.3 개별 전송
```javascript
// 특정 소켓에게만 전송
socket.emit('이벤트이름', 데이터)
```

### 6.4 자신 제외 브로드캐스트
```javascript
// 자신을 제외한 모든 클라이언트에게 전송
socket.broadcast.emit('이벤트이름', 데이터)

// 자신을 제외한 룸 내 클라이언트에게 전송
socket.broadcast.to('roomName').emit('이벤트이름', 데이터)
```

## 7. 연결 관리

### 7.1 연결 해제 처리
```javascript
socket.on('disconnect', (reason) => {
  console.log(`연결 종료: ${reason}`)
  // 정리 작업 수행
})
```

### 7.2 재연결 메커니즘
```javascript
// 클라이언트 측 재연결 설정
const socket = io(url, {
  reconnectionAttempts: 5,    // 재연결 시도 횟수
  reconnectionDelay: 1000,    // 재연결 지연 시간
  reconnectionDelayMax: 5000, // 최대 지연 시간
  randomizationFactor: 0.5    // 지연 시간 랜덤화
})
```

## 8. 실제 프로젝트에서의 이벤트 맵핑

### 클라이언트 → 서버 이벤트

| 이벤트 이름 | 발생 위치 | 전달 데이터 | 서버 처리 |
|------------|----------|-----------|----------|
| `join` | ChatRoom.vue 마운트 시 | `{user, room}` | 채팅방 입장 처리 |
| `chat message` | ChatInput에서 메시지 전송 | `{user, text, room, timestamp}` | 메시지 브로드캐스트 |
| `leave` | ChatRoom 언마운트/나가기 | `{user, room}` | 채팅방 퇴장 처리 |
| `get rooms` | Lobby.vue 마운트 시 | 없음 | 채팅방 목록 전송 |

### 서버 → 클라이언트 이벤트

| 이벤트 이름 | 발생 조건 | 전달 데이터 | 클라이언트 처리 |
|------------|----------|-----------|---------------|
| `chat message` | 메시지 수신 시 | `{user, text, timestamp}` | 메시지 화면 표시 |
| `rooms list` | 채팅방 목록 요청 시 | `[{id, name, users}]` | 로비 화면 업데이트 |

## 9. Socket.io의 장점

### 9.1 자동 폴백
- WebSocket 지원하지 않는 환경에서 HTTP polling으로 자동 전환
- 네트워크 상황에 따른 최적 전송 방식 선택

### 9.2 재연결 관리
- 네트워크 끊김 시 자동 재연결 시도
- 연결 상태 모니터링 및 이벤트 제공

### 9.3 룸 시스템
- 클라이언트 그룹 관리 용이
- 효율적인 메시지 라우팅

### 9.4 이벤트 기반
- 직관적인 API
- 타입별 메시지 처리 가능

## 10. 성능 최적화 고려사항

### 10.1 이벤트 리스너 정리
```javascript
// 컴포넌트 언마운트 시 리스너 제거
onUnmounted(() => {
  socket.off('chat message')
  socket.off('rooms list')
})
```

### 10.2 메시지 크기 최적화
- 불필요한 데이터 전송 최소화
- JSON 구조 간소화

### 10.3 연결 관리
- 적절한 재연결 간격 설정
- 불필요한 연결 유지 방지

이러한 메커니즘을 통해 Socket.io는 실시간 양방향 통신을 안정적이고 효율적으로 제공합니다. 