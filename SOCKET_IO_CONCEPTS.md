# Socket.io 핵심 개념 분석

## 1. io() vs Server() - 클라이언트와 서버 생성자

### 1.1 `io()` - 클라이언트 생성자 함수

```javascript
// 클라이언트 측 (src/api/socket.js)
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', options)
```

**io() 함수의 역할:**
- Socket.io **클라이언트** 인스턴스를 생성
- 서버에 연결을 시도
- 연결 설정, 재연결, 이벤트 처리 등을 담당
- **브라우저에서 실행**

### 1.2 `Server()` - 서버 생성자 클래스

```javascript
// 서버 측 (server/index.js)
const { Server } = require('socket.io')

const io = new Server(httpServer, options)
```

**Server() 클래스의 역할:**
- Socket.io **서버** 인스턴스를 생성
- 클라이언트 연결을 수락
- 전체 서버 관리 (브로드캐스트, 룸 관리 등)
- **Node.js 서버에서 실행**

## 2. const socket vs const io - 인스턴스 비교

### 2.1 클라이언트 측: `const socket`

```javascript
// 클라이언트 측
const socket = io('http://localhost:3000')
```

**클라이언트의 socket 특징:**
- **개별 연결 객체** - 하나의 브라우저 탭당 하나
- 서버와의 **단일 연결**을 나타냄
- 메시지 송수신, 이벤트 처리 담당

```javascript
// 사용 예시
socket.emit('chat message', data)    // 서버로 메시지 전송
socket.on('chat message', callback)  // 서버에서 메시지 수신
socket.join('room1')                 // ❌ 불가능 (서버에서만 가능)
```

### 2.2 서버 측: `const io`

```javascript
// 서버 측
const io = new Server(server)
```

**서버의 io 특징:**
- **서버 전체 관리 객체** - 모든 연결을 총괄
- 여러 클라이언트 연결들을 관리
- 전체 브로드캐스트, 룸 관리 담당

```javascript
// 사용 예시
io.emit('message', data)              // 모든 클라이언트에게 전송
io.to('room1').emit('message', data)  // 특정 룸에 전송
io.on('connection', (socket) => {     // 새로운 연결 감지
  // 여기서의 socket은 개별 클라이언트 연결
})
```

### 2.3 서버 측: `socket` (connection 콜백 내부)

```javascript
// 서버 측 - connection 이벤트 내부
io.on('connection', (socket) => {
  // 이 socket은 연결된 개별 클라이언트를 나타냄
})
```

**서버의 socket 특징:**
- **개별 클라이언트 연결 객체**
- 특정 한 명의 클라이언트와의 연결
- 개별 클라이언트와의 통신 담당

```javascript
// 사용 예시
socket.emit('message', data)          // 해당 클라이언트에게만 전송
socket.join('room1')                  // 해당 클라이언트를 룸에 추가
socket.on('chat message', callback)   // 해당 클라이언트에서 메시지 수신
socket.disconnect()                   // 해당 클라이언트 연결 해제
```

## 3. 상세 비교표

| 구분 | 위치 | 변수명 | 타입 | 역할 | 범위 |
|------|------|--------|------|------|------|
| `io()` | 클라이언트 | `socket` | 함수 | 클라이언트 생성 | 1:1 연결 |
| `Server()` | 서버 | `io` | 클래스 | 서버 생성 | 전체 관리 |
| 클라이언트 socket | 클라이언트 | `socket` | 객체 | 개별 연결 | 1:1 연결 |
| 서버 io | 서버 | `io` | 객체 | 서버 관리자 | 1:N 관리 |
| 서버 socket | 서버 | `socket` | 객체 | 개별 클라이언트 | 1:1 연결 |

## 4. 실제 코드에서의 사용

### 4.1 클라이언트 측 (src/api/socket.js)

```javascript
import { io } from 'socket.io-client'

// io() 함수로 클라이언트 인스턴스 생성
const socket = io('http://localhost:3000', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true
})

// socket 인스턴스 사용
socket.on('connect', () => {
  console.log('서버에 연결됨')
})

socket.emit('join', { user: 'Alice', room: 'single' })

socket.on('chat message', (msg) => {
  console.log('메시지 수신:', msg)
})

export default socket
```

### 4.2 서버 측 (server/index.js)

```javascript
const { Server } = require('socket.io')

// Server() 클래스로 서버 인스턴스 생성
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

// io 인스턴스로 전체 관리
io.on('connection', (socket) => {
  console.log('새로운 클라이언트 연결:', socket.id)
  
  // socket으로 개별 클라이언트 관리
  socket.on('join', (data) => {
    socket.join(data.room)
    
    // io로 전체 브로드캐스트
    io.to(data.room).emit('user joined', data)
  })
  
  socket.on('chat message', (msg) => {
    // io로 룸 브로드캐스트
    io.to(msg.room).emit('chat message', msg)
  })
  
  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제:', socket.id)
  })
})
```

## 5. 메소드 비교

### 5.1 클라이언트 socket 메소드

```javascript
// 연결 관리
socket.connect()           // 연결
socket.disconnect()        // 연결 해제

// 이벤트 송수신
socket.emit(event, data)   // 서버로 이벤트 전송
socket.on(event, callback) // 서버에서 이벤트 수신
socket.off(event)          // 이벤트 리스너 제거

// 연결 상태
socket.connected           // 연결 상태 (boolean)
socket.id                  // 소켓 ID
```

### 5.2 서버 io 메소드 (전체 관리)

```javascript
// 전체 브로드캐스트
io.emit(event, data)                    // 모든 클라이언트에게
io.to(room).emit(event, data)           // 특정 룸에게
io.except(socketId).emit(event, data)   // 특정 소켓 제외

// 연결 관리
io.on('connection', callback)           // 새 연결 감지
io.engine.clientsCount                  // 전체 연결 수
io.sockets.sockets                      // 모든 소켓 맵

// 룸 관리
io.sockets.adapter.rooms                // 모든 룸 정보
```

### 5.3 서버 socket 메소드 (개별 관리)

```javascript
// 개별 통신
socket.emit(event, data)     // 해당 클라이언트에게만
socket.on(event, callback)   // 해당 클라이언트에서 수신
socket.broadcast.emit()      // 자신 제외 브로드캐스트

// 룸 관리
socket.join(room)            // 룸 참여
socket.leave(room)           // 룸 나가기
socket.rooms                 // 참여 중인 룸 목록

// 연결 관리
socket.disconnect()          // 연결 해제
socket.id                    // 소켓 고유 ID
socket.handshake             // 핸드셰이크 정보
```

## 6. 실행 흐름 예시

```
1. 브라우저에서 io() 함수 호출
   ↓
2. 클라이언트 socket 인스턴스 생성
   ↓
3. 서버로 연결 시도
   ↓
4. 서버의 io 인스턴스가 연결 감지
   ↓
5. 서버에서 새로운 socket 인스턴스 생성 (개별 클라이언트용)
   ↓
6. connection 이벤트 발생
   ↓
7. 클라이언트 socket ↔ 서버 socket 양방향 통신 시작
```

## 요약

- **`io()`**: 클라이언트를 만드는 함수
- **`Server()`**: 서버를 만드는 클래스
- **클라이언트 `socket`**: 하나의 연결
- **서버 `io`**: 전체 서버 관리자
- **서버 `socket`**: 개별 클라이언트 연결

이렇게 각각의 역할이 명확히 구분되어 있습니다! 