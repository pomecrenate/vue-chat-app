/**
 * Socket.io 채팅 서버
 * Express + Socket.io를 사용한 실시간 채팅 서버
 * 
 * 핵심 개념 구분:
 * 
 * 1. Server() 클래스:
 *    - Socket.io 서버 인스턴스를 생성하는 생성자
 *    - HTTP 서버에 붙어서 WebSocket 서버 역할
 *    - 모든 클라이언트 연결을 총괄 관리
 * 
 * 2. io 인스턴스 (const io):
 *    - Server() 클래스로 생성된 서버 관리 객체
 *    - 전체 서버 제어 (브로드캐스트, 룸 관리 등)
 *    - 1:N 관계 (하나의 서버 : 여러 클라이언트)
 * 
 * 3. socket 인스턴스 (connection 콜백의 매개변수):
 *    - 개별 클라이언트와의 연결 객체
 *    - 특정 한 명의 클라이언트와만 통신
 *    - 1:1 관계 (하나의 소켓 : 하나의 클라이언트)
 * 
 * 클라이언트 측 대응:
 * - 클라이언트: io() 함수로 클라이언트 인스턴스 생성
 * - 반환된 socket이 서버의 개별 socket과 매칭
 */
const express = require('express');
const http = require('http');
const cors = require('cors');

// Socket.io 서버 클래스 import
// Server 클래스는 서버 인스턴스를 생성하는 생성자
const { Server } = require('socket.io');

const app = express();

// CORS 설정 - 클라이언트(Vue.js)에서 서버로의 요청 허용
app.use(cors({
  origin: 'http://localhost:5173', // Vue.js 개발 서버 URL
  credentials: true
}));

app.use(express.json());

// HTTP 서버 생성
// Socket.io는 HTTP 서버 위에서 동작
const server = http.createServer(app);

/**
 * Socket.io 서버 인스턴스 생성
 * 
 * new Server() 분석:
 * - Socket.io의 Server 클래스로 서버 인스턴스 생성
 * - HTTP 서버에 WebSocket 기능을 추가
 * - 클라이언트들의 연결을 받아들이고 관리
 * 
 * 이 io 인스턴스는:
 * 1. 서버 전체를 관리하는 최상위 객체
 * 2. 모든 클라이언트 연결들을 총괄
 * 3. 전체 브로드캐스트, 룸 관리 등을 담당
 * 
 * 클라이언트 측과의 관계:
 * - 클라이언트의 io() 함수로 생성된 socket과 연결
 * - 클라이언트 socket → 서버 io → 서버 개별 socket
 */
const io = new Server(server, {
  cors: {
    origin: '*', // 모든 도메인에서의 접근 허용 (개발용)
    methods: ['GET', 'POST']
  }
});

// 현재 접속 중인 사용자 목록 저장
// 실제 프로덕션에서는 데이터베이스나 Redis 사용 권장
let connectedUsers = new Map();

/**
 * 채팅방 정보 저장
 * 방장 시스템을 위한 확장된 룸 데이터 구조
 * 
 * 데이터 구조:
 * {
 *   roomId: {
 *     name: '채팅방 이름',
 *     owner: 'socketId', // 방장의 소켓 ID
 *     ownerName: '방장 닉네임',
 *     users: [
 *       { socketId: 'id1', nickname: 'user1', joinedAt: Date },
 *       { socketId: 'id2', nickname: 'user2', joinedAt: Date }
 *     ],
 *     createdAt: Date,
 *     isPrivate: false
 *   }
 * }
 */
let chatRooms = new Map();

/**
 * 채팅방 ID 생성 함수
 * 고유한 채팅방 ID를 생성합니다.
 */
function generateRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 방장 권한 위임 함수
 * 방장이 나갔을 때 다음 사용자에게 권한을 위임합니다.
 * 
 * @param {string} roomId - 채팅방 ID
 * @returns {Object|null} 새로운 방장 정보 또는 null (방이 삭제됨)
 */
function transferOwnership(roomId) {
  const room = chatRooms.get(roomId);
  if (!room || room.users.length === 0) {
    // 방이 없거나 사용자가 없으면 방 삭제
    chatRooms.delete(roomId);
    return null;
  }

  // 가장 먼저 입장한 사용자(2번째)를 새 방장으로 지정
  // users 배열은 입장 순서대로 정렬되어 있음
  const newOwner = room.users[0];
  room.owner = newOwner.socketId;
  room.ownerName = newOwner.nickname;

  console.log(`👑 방장 권한 위임: ${room.name} → ${newOwner.nickname}`);
  return newOwner;
}

/**
 * 채팅방에서 사용자 제거 함수
 * 
 * @param {string} roomId - 채팅방 ID
 * @param {string} socketId - 제거할 사용자의 소켓 ID
 * @returns {boolean} 제거 성공 여부
 */
function removeUserFromRoom(roomId, socketId) {
  const room = chatRooms.get(roomId);
  if (!room) return false;

  const userIndex = room.users.findIndex(user => user.socketId === socketId);
  if (userIndex === -1) return false;

  room.users.splice(userIndex, 1);
  return true;
}

/**
 * 클라이언트 연결 처리
 * 
 * io.on('connection', callback) 분석:
 * - io 인스턴스의 메서드: 새로운 클라이언트 연결을 감지
 * - 클라이언트가 io() 함수로 연결할 때마다 실행
 * - callback의 socket 매개변수: 연결된 개별 클라이언트 객체
 * 
 * socket 매개변수 (개별 클라이언트):
 * - 특정 한 명의 클라이언트와의 연결 객체
 * - 해당 클라이언트와만 1:1 통신
 * - 클라이언트의 socket과 직접 대응
 * 
 * io vs socket 메서드 차이:
 * 
 * io 메서드 (서버 전체 관리):
 * - io.emit(): 모든 클라이언트에게 전송
 * - io.to(room).emit(): 특정 룸의 모든 클라이언트에게 전송
 * - io.sockets.sockets: 모든 연결된 소켓 맵
 * - io.engine.clientsCount: 전체 연결 수
 * 
 * socket 메서드 (개별 클라이언트 관리):
 * - socket.emit(): 해당 클라이언트에게만 전송
 * - socket.on(): 해당 클라이언트에서 오는 이벤트 수신
 * - socket.join(room): 해당 클라이언트를 룸에 추가
 * - socket.broadcast.emit(): 해당 클라이언트 제외하고 전송
 */
io.on('connection', (socket) => {
  console.log('\n=== 새로운 클라이언트 연결 ===');
  console.log(`소켓 ID: ${socket.id}`);
  console.log(`현재 연결된 클라이언트 수: ${io.engine.clientsCount}`);
  console.log('클라이언트 IP:', socket.handshake.address);
  console.log('연결 시간:', new Date().toLocaleString());

  /**
   * 채팅방 생성 이벤트 처리
   * 
   * 새로운 기능: 사용자가 직접 채팅방을 생성할 수 있습니다.
   * 생성자는 자동으로 방장이 되며, 방 관리 권한을 가집니다.
   */
  socket.on('create room', (data) => {
    console.log(`\n--- 채팅방 생성 요청 ---`);
    console.log(`생성자: ${data.user}`);
    console.log(`방 이름: ${data.roomName}`);
    console.log(`소켓 ID: ${socket.id}`);

    // 방 이름 유효성 검사
    if (!data.roomName || data.roomName.trim().length === 0) {
      socket.emit('room creation failed', {
        error: '채팅방 이름을 입력해주세요.',
        code: 'INVALID_ROOM_NAME'
      });
      return;
    }

    // 방 이름 중복 검사
    const roomNameExists = Array.from(chatRooms.values())
      .some(room => room.name.toLowerCase() === data.roomName.trim().toLowerCase());

    if (roomNameExists) {
      socket.emit('room creation failed', {
        error: '이미 존재하는 채팅방 이름입니다.',
        code: 'ROOM_NAME_EXISTS'
      });
      return;
    }

    // 고유한 방 ID 생성
    const roomId = generateRoomId();
    const roomName = data.roomName.trim();

    // 새 채팅방 데이터 생성
    const newRoom = {
      id: roomId,
      name: roomName,
      owner: socket.id,           // 생성자가 방장
      ownerName: data.user,
      users: [{
        socketId: socket.id,
        nickname: data.user,
        joinedAt: new Date(),
        isOwner: true
      }],
      createdAt: new Date(),
      isPrivate: false
    };

    // 서버 메모리에 방 정보 저장
    chatRooms.set(roomId, newRoom);

    // 사용자 정보 저장
    connectedUsers.set(socket.id, {
      username: data.user,
      room: roomId,
      isOwner: true
    });

    // 생성자를 방에 입장시킴
    socket.join(roomId);

    console.log(`✅ 채팅방 생성 완료: ${roomName} (ID: ${roomId})`);
    console.log(`👑 방장: ${data.user}`);

    // 생성자에게 생성 성공 알림
    socket.emit('room created', {
      success: true,
      room: {
        id: roomId,
        name: roomName,
        owner: data.user,
        isOwner: true,
        userCount: 1
      },
      message: `'${roomName}' 채팅방이 생성되었습니다. 당신이 방장입니다.`,
      timestamp: new Date()
    });

    // 모든 클라이언트에게 새 채팅방 목록 전송
    broadcastRoomsList();

    console.log(`현재 총 채팅방 수: ${chatRooms.size}`);
  });

  /**
   * 채팅방 입장 이벤트 처리
   * 
   * socket.on() vs io.on() 차이:
   * - socket.on(): 이 특정 클라이언트에서 오는 이벤트만 처리
   * - io.on(): 서버 레벨 이벤트 처리 (connection, error 등)
   * 
   * 여기서 socket.on('join')은:
   * - 이 클라이언트가 'join' 이벤트를 보냈을 때만 실행
   * - 다른 클라이언트의 'join' 이벤트와는 별개
   */
  socket.on('join', (data) => {
    console.log(`\n--- 채팅방 입장 요청 ---`);
    console.log(`사용자: ${data.user}`);
    console.log(`채팅방 ID: ${data.room}`);
    console.log(`소켓 ID: ${socket.id}`);

    // 채팅방 존재 여부 확인
    const room = chatRooms.get(data.room);
    if (!room) {
      socket.emit('join failed', {
        error: '존재하지 않는 채팅방입니다.',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    // 이미 다른 방에 있는지 확인
    const currentUser = connectedUsers.get(socket.id);
    if (currentUser && currentUser.room !== data.room) {
      // 기존 방에서 나가기
      socket.leave(currentUser.room);
      removeUserFromRoom(currentUser.room, socket.id);
    }

    // 사용자 정보 저장 - 이 특정 소켓에 연결된 사용자
    connectedUsers.set(socket.id, {
      username: data.user,
      room: data.room,
      isOwner: room.owner === socket.id
    });

    // 방 사용자 목록에 추가 (중복 제거)
    const existingUserIndex = room.users.findIndex(user => user.socketId === socket.id);
    if (existingUserIndex === -1) {
      room.users.push({
        socketId: socket.id,
        nickname: data.user,
        joinedAt: new Date(),
        isOwner: room.owner === socket.id
      });
    }

    /**
     * 룸 참여 처리
     * 
     * socket.join() 분석:
     * - 이 특정 클라이언트를 해당 룸에 추가
     * - 룸은 논리적 그룹 (같은 룸의 클라이언트들끼리 메시지 공유)
     * - 클라이언트에서는 socket.join() 사용 불가 (서버에서만 가능)
     * 
     * 룸 시스템:
     * - socket.join(room): 개별 클라이언트를 룸에 추가
     * - io.to(room).emit(): 해당 룸의 모든 클라이언트에게 전송
     * - socket.rooms: 해당 클라이언트가 속한 룸 목록
     */
    socket.join(data.room);
    console.log(`${data.user}님이 ${room.name} 채팅방에 입장했습니다.`);
    console.log(`소켓이 속한 룸 목록:`, Array.from(socket.rooms));

    // 해당 룸의 다른 사용자들에게 입장 알림
    /**
     * socket.to(room).emit() vs io.to(room).emit() 차이:
     * 
     * socket.to(room).emit():
     * - 해당 룸에 있는 다른 클라이언트들에게만 전송 (자신 제외)
     * - socket.broadcast.to(room).emit()와 동일
     * 
     * io.to(room).emit():
     * - 해당 룸의 모든 클라이언트에게 전송 (자신 포함)
     * 
     * 여기서는 입장한 본인은 제외하고 다른 사람들에게만 알림
     */
    socket.to(data.room).emit('user joined', {
      user: data.user,
      message: `${data.user}님이 채팅방에 입장했습니다.`,
      timestamp: new Date(),
      type: 'system' // 시스템 메시지 타입
    });

    /**
     * 클라이언트에게 입장 확인 응답
     * 
     * socket.emit() 분석:
     * - 이 특정 클라이언트에게만 전송
     * - 다른 클라이언트들은 받지 않음
     * - 입장 성공을 해당 클라이언트에게만 알림
     */
    socket.emit('join confirmed', {
      success: true,
      room: {
        id: data.room,
        name: room.name,
        owner: room.ownerName,
        isOwner: room.owner === socket.id,
        userCount: room.users.length,
        users: room.users.map(user => ({
          nickname: user.nickname,
          isOwner: user.isOwner,
          joinedAt: user.joinedAt
        }))
      },
      user: data.user,
      message: `${room.name} 채팅방에 성공적으로 입장했습니다.`,
      timestamp: new Date()
    });

    // 서버 로그: 현재 룸 상황
    console.log(`현재 ${room.name} 룸의 클라이언트 수:`, room.users.length);
    console.log(`전체 연결된 사용자 수: ${connectedUsers.size}`);

    // 모든 클라이언트에게 업데이트된 채팅방 목록 전송
    broadcastRoomsList();
  });

  /**
   * 채팅 메시지 수신 및 브로드캐스트
   * 
   * 메시지 흐름:
   * 1. 클라이언트가 socket.emit('chat message', data) 전송
   * 2. 서버의 이 socket.on('chat message') 핸들러가 받음
   * 3. 서버가 같은 룸의 모든 클라이언트에게 브로드캐스트
   * 4. 클라이언트들이 socket.on('chat message') 핸들러로 받음
   */
  socket.on('chat message', (msg) => {
    console.log(`\n--- 메시지 수신 ---`);
    console.log(`발신자: ${msg.user}`);
    console.log(`룸: ${msg.room}`);
    console.log(`메시지: ${msg.message}`);
    console.log(`소켓 ID: ${socket.id}`);
    console.log(`타임스탬프: ${new Date(msg.timestamp).toLocaleString()}`);

    // 메시지 검증
    if (!msg.user || !msg.message || !msg.room) {
      console.log('❌ 잘못된 메시지 데이터');
      socket.emit('error', { message: '메시지 데이터가 올바르지 않습니다.' });
      return;
    }

    // 채팅방 존재 여부 확인
    const room = chatRooms.get(msg.room);
    if (!room) {
      socket.emit('error', { message: '존재하지 않는 채팅방입니다.' });
      return;
    }

    // 사용자가 해당 방에 있는지 확인
    const userInRoom = room.users.find(user => user.socketId === socket.id);
    if (!userInRoom) {
      socket.emit('error', { message: '채팅방에 입장하지 않은 상태입니다.' });
      return;
    }

    // 메시지에 서버 타임스탬프와 고유 ID 추가
    const messageWithId = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      serverTimestamp: new Date(),
      socketId: socket.id, // 발신자 소켓 ID 추가
      isOwner: room.owner === socket.id // 방장 여부 추가
    };

    /**
     * 룸 브로드캐스트
     * 
     * io.to(room).emit() 분석:
     * - 해당 룸에 속한 모든 클라이언트에게 전송 (발신자 포함)
     * - socket.to(room).emit()은 발신자 제외
     * - 여기서는 발신자도 메시지를 받아야 하므로 io.to() 사용
     * 
     * 브로드캐스트 방식 비교:
     * 1. io.emit(): 서버의 모든 클라이언트에게
     * 2. io.to(room).emit(): 특정 룸의 모든 클라이언트에게
     * 3. socket.emit(): 해당 클라이언트에게만
     * 4. socket.broadcast.emit(): 해당 클라이언트 제외 모든 클라이언트에게
     * 5. socket.to(room).emit(): 해당 룸의 다른 클라이언트들에게 (자신 제외)
     */
    io.to(msg.room).emit('chat message', messageWithId);

    console.log(`✅ 메시지가 ${room.name} 룸의 모든 클라이언트에게 브로드캐스트됨`);
    
    // 해당 룸의 클라이언트 수 확인
    const roomSize = room.users.length;
    console.log(`브로드캐스트 대상: ${roomSize}명의 클라이언트`);
  });

  /**
   * 채팅방 나가기 이벤트 처리
   */
  socket.on('leave', (data) => {
    console.log(`\n--- 채팅방 나가기 요청 ---`);
    console.log(`사용자: ${data.user}`);
    console.log(`채팅방 ID: ${data.room}`);
    console.log(`소켓 ID: ${socket.id}`);

    const room = chatRooms.get(data.room);
    if (!room) {
      socket.emit('leave failed', {
        error: '존재하지 않는 채팅방입니다.',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    const wasOwner = room.owner === socket.id;

    /**
     * 룸에서 나가기
     * 
     * socket.leave() 분석:
     * - 해당 클라이언트를 룸에서 제거
     * - 이후 해당 룸으로 오는 메시지를 받지 않음
     * - 클라이언트에서는 사용 불가 (서버에서만 가능)
     */
    socket.leave(data.room);
    console.log(`${data.user}님이 ${room.name} 채팅방에서 나갔습니다.`);

    // 방 사용자 목록에서 제거
    removeUserFromRoom(data.room, socket.id);

    // 해당 룸의 다른 사용자들에게 퇴장 알림
    // socket.to()를 사용하여 나간 본인은 제외
    socket.to(data.room).emit('user left', {
      user: data.user,
      message: `${data.user}님이 채팅방을 나갔습니다.`,
      timestamp: new Date(),
      type: 'system',
      wasOwner: wasOwner
    });

    let newOwner = null;
    let roomDeleted = false;

    /**
     * 방장이 나간 경우 처리
     */
    if (wasOwner) {
      console.log(`👑 방장이 나감: ${data.user}`);
      
      if (room.users.length > 0) {
        // 다른 사용자가 있으면 권한 위임
        newOwner = transferOwnership(data.room);
        
        if (newOwner) {
          console.log(`👑 새로운 방장: ${newOwner.nickname}`);
          
          // 새 방장에게 권한 부여 알림
          const newOwnerSocket = io.sockets.sockets.get(newOwner.socketId);
          if (newOwnerSocket) {
            newOwnerSocket.emit('ownership transferred', {
              message: '당신이 새로운 방장이 되었습니다.',
              room: {
                id: data.room,
                name: room.name
              },
              timestamp: new Date()
            });
            
            // 사용자 정보 업데이트
            const userData = connectedUsers.get(newOwner.socketId);
            if (userData) {
              userData.isOwner = true;
            }
          }
          
          // 방의 모든 사용자에게 방장 변경 알림
          io.to(data.room).emit('owner changed', {
            newOwner: newOwner.nickname,
            message: `${newOwner.nickname}님이 새로운 방장이 되었습니다.`,
            timestamp: new Date(),
            type: 'system'
          });
        }
      } else {
        // 아무도 없으면 방 삭제
        chatRooms.delete(data.room);
        roomDeleted = true;
        console.log(`🗑️ 빈 채팅방 삭제: ${room.name}`);
      }
    }

    // 나간 클라이언트에게 확인 응답
    socket.emit('leave confirmed', {
      success: true,
      room: {
        id: data.room,
        name: room.name
      },
      user: data.user,
      message: `${room.name} 채팅방에서 나갔습니다.`,
      roomDeleted: roomDeleted,
      newOwner: newOwner ? newOwner.nickname : null,
      timestamp: new Date()
    });

    // 사용자 정보에서 방 제거
    connectedUsers.delete(socket.id);

    console.log(`현재 ${room.name} 룸의 클라이언트 수:`, room.users.length);

    // 모든 클라이언트에게 업데이트된 채팅방 목록 전송
    broadcastRoomsList();
  });

  /**
   * 채팅방 목록 요청 처리
   */
  socket.on('get rooms', () => {
    console.log(`\n--- 채팅방 목록 요청 ---`);
    console.log(`요청 소켓 ID: ${socket.id}`);

    sendRoomsListToClient(socket);
  });

  /**
   * 클라이언트 연결 해제 처리
   * 
   * disconnect 이벤트:
   * - 클라이언트가 브라우저를 닫거나 페이지를 떠날 때 자동 발생
   * - 네트워크 문제로 연결이 끊어졌을 때도 발생
   * - socket.disconnect()를 명시적으로 호출했을 때도 발생
   */
  socket.on('disconnect', (reason) => {
    console.log(`\n=== 클라이언트 연결 해제 ===`);
    console.log(`소켓 ID: ${socket.id}`);
    console.log(`해제 사유: ${reason}`);
    console.log(`해제 시간: ${new Date().toLocaleString()}`);

    // 연결 해제된 사용자 정보 조회
    const disconnectedUser = connectedUsers.get(socket.id);
    
    if (disconnectedUser) {
      console.log(`해제된 사용자: ${disconnectedUser.username}`);
      console.log(`마지막 활동 룸: ${disconnectedUser.room}`);
      
      const room = chatRooms.get(disconnectedUser.room);
      if (room) {
        const wasOwner = disconnectedUser.isOwner;

        // 방 사용자 목록에서 제거
        removeUserFromRoom(disconnectedUser.room, socket.id);

        /**
         * 해당 룸의 다른 사용자들에게 퇴장 알림
         * 
         * socket.to() 사용 이유:
         * - 이미 연결이 해제된 소켓이므로 본인은 메시지를 받을 수 없음
         * - 따라서 socket.to()와 io.to()의 결과가 동일
         * - 하지만 의미상 socket.to()가 더 적절
         */
        socket.to(disconnectedUser.room).emit('user left', {
          user: disconnectedUser.username,
          message: `${disconnectedUser.username}님이 연결을 해제했습니다.`,
          timestamp: new Date(),
          type: 'system',
          wasOwner: wasOwner
        });

        /**
         * 방장이 연결 해제된 경우 처리
         */
        if (wasOwner) {
          console.log(`👑 방장이 연결 해제됨: ${disconnectedUser.username}`);
          
          if (room.users.length > 0) {
            // 다른 사용자가 있으면 권한 위임
            const newOwner = transferOwnership(disconnectedUser.room);
            
            if (newOwner) {
              console.log(`👑 새로운 방장: ${newOwner.nickname}`);
              
              // 새 방장에게 권한 부여 알림
              const newOwnerSocket = io.sockets.sockets.get(newOwner.socketId);
              if (newOwnerSocket) {
                newOwnerSocket.emit('ownership transferred', {
                  message: '당신이 새로운 방장이 되었습니다.',
                  room: {
                    id: disconnectedUser.room,
                    name: room.name
                  },
                  timestamp: new Date()
                });
                
                // 사용자 정보 업데이트
                const userData = connectedUsers.get(newOwner.socketId);
                if (userData) {
                  userData.isOwner = true;
                }
              }
              
              // 방의 모든 사용자에게 방장 변경 알림
              io.to(disconnectedUser.room).emit('owner changed', {
                newOwner: newOwner.nickname,
                message: `${newOwner.nickname}님이 새로운 방장이 되었습니다.`,
                timestamp: new Date(),
                type: 'system'
              });
            }
          } else {
            // 아무도 없으면 방 삭제
            chatRooms.delete(disconnectedUser.room);
            console.log(`🗑️ 빈 채팅방 삭제: ${room.name}`);
          }
        }

        // 모든 클라이언트에게 업데이트된 채팅방 목록 전송
        broadcastRoomsList();
      }

      // 사용자 정보에서 제거
      connectedUsers.delete(socket.id);
      console.log(`사용자 정보 삭제 완료`);
    }

    console.log(`현재 연결된 클라이언트 수: ${io.engine.clientsCount}`);
    console.log(`저장된 사용자 수: ${connectedUsers.size}`);
    console.log(`활성 채팅방 수: ${chatRooms.size}`);

    /**
     * 연결 해제 사유 (reason) 종류:
     * - 'transport close': 클라이언트가 연결을 정상적으로 종료
     * - 'client namespace disconnect': 클라이언트가 disconnect() 호출
     * - 'server namespace disconnect': 서버가 disconnect() 호출
     * - 'ping timeout': 핑 타임아웃 (기본 60초)
     * - 'transport error': 전송 계층 오류
     */
  });

  // 에러 처리
  socket.on('error', (error) => {
    console.error(`\n❌ 소켓 에러 (${socket.id}):`, error);
  });
});

/**
 * 모든 클라이언트에게 채팅방 목록 브로드캐스트
 */
function broadcastRoomsList() {
  const roomsList = Array.from(chatRooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    owner: room.ownerName,
    userCount: room.users.length,
    users: room.users.map(user => user.nickname),
    createdAt: room.createdAt,
    isPrivate: room.isPrivate
  }));

  io.emit('rooms list', {
    rooms: roomsList,
    totalRooms: roomsList.length,
    timestamp: new Date()
  });

  console.log(`📋 채팅방 목록 브로드캐스트: ${roomsList.length}개 방`);
}

/**
 * 특정 클라이언트에게 채팅방 목록 전송
 */
function sendRoomsListToClient(socket) {
  const roomsList = Array.from(chatRooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    owner: room.ownerName,
    userCount: room.users.length,
    users: room.users.map(user => user.nickname),
    createdAt: room.createdAt,
    isPrivate: room.isPrivate
  }));

  socket.emit('rooms list', {
    rooms: roomsList,
    totalRooms: roomsList.length,
    timestamp: new Date()
  });

  console.log(`✅ 채팅방 목록 전송 완료: ${roomsList.length}개 룸`);
  console.log('룸 목록:', roomsList.map(room => `${room.name}(${room.userCount}명, 방장: ${room.owner})`).join(', '));
}

/**
 * 서버 에러 처리
 * 
 * io.on() vs socket.on() 차이:
 * - io.on(): 서버 레벨 이벤트 처리
 * - socket.on(): 개별 클라이언트 이벤트 처리
 */
io.on('error', (error) => {
  console.error('❌ Socket.io 서버 에러:', error);
});

// REST API 엔드포인트들
app.get('/', (req, res) => {
  res.json({ 
    message: 'Socket.io 채팅 서버가 실행 중입니다!',
    timestamp: new Date(),
    connectedClients: io.engine.clientsCount,
    activeRooms: chatRooms.size
  });
});

// 서버 상태 조회 API
app.get('/status', (req, res) => {
  const rooms = Array.from(chatRooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    owner: room.ownerName,
    userCount: room.users.length
  }));

  res.json({
    server: 'Socket.io Chat Server',
    status: 'running',
    timestamp: new Date(),
    statistics: {
      connectedClients: io.engine.clientsCount,
      activeRooms: chatRooms.size,
      totalUsers: connectedUsers.size
    },
    rooms: rooms
  });
});

const PORT = process.env.PORT || 3000;

/**
 * 서버 시작
 * 
 * server.listen() vs app.listen() 차이:
 * - server.listen(): HTTP 서버와 Socket.io 서버 모두 시작
 * - app.listen(): Express 서버만 시작 (Socket.io 작동 안함)
 * 
 * Socket.io는 HTTP 서버 위에서 동작하므로 server.listen() 사용 필수
 */
server.listen(PORT, () => {
  console.log('\n🚀 Socket.io 채팅 서버 시작!');
  console.log(`📍 서버 주소: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket 엔드포인트: ws://localhost:${PORT}`);
  console.log(`⏰ 시작 시간: ${new Date().toLocaleString()}`);
  console.log('\n📊 서버 설정:');
  console.log(`   - CORS: 모든 도메인 허용`);
  console.log(`   - 재연결: 자동`);
  console.log(`   - 핑 타임아웃: 60초`);
  console.log('\n🎯 사용 가능한 이벤트:');
  console.log(`   📥 수신: create room, join, leave, chat message, get rooms`);
  console.log(`   📤 송신: room created, chat message, user joined, user left, rooms list, ownership transferred`);
  console.log('\n👑 방장 시스템:');
  console.log(`   - 채팅방 생성자가 방장이 됨`);
  console.log(`   - 방장 나가면 2번째 사용자가 방장 승계`);
  console.log(`   - 빈 방은 자동 삭제`);
  console.log('\n' + '='.repeat(50));
});

/**
 * 프로세스 종료 시 정리 작업
 * Graceful Shutdown을 위한 이벤트 핸들러
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM 신호 수신. 서버를 안전하게 종료합니다...');
  
  // 모든 클라이언트에게 서버 종료 알림
  io.emit('server shutdown', {
    message: '서버가 종료됩니다. 잠시 후 다시 연결해주세요.'
  });
  
  // 모든 연결 종료
  io.close(() => {
    console.log('모든 Socket.io 연결이 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nCTRL+C 감지. 서버를 안전하게 종료합니다...');
  
  io.emit('server shutdown', {
    message: '서버가 종료됩니다.'
  });
  
  io.close(() => {
    console.log('Socket.io 서버가 종료되었습니다.');
    process.exit(0);
  });
}); 