/**
 * Socket.io 채팅 서버
 * 실시간 채팅을 위한 서버 애플리케이션
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Express 앱 생성 및 설정
const app = express();
app.use(cors()); // CORS 미들웨어 설정

// HTTP 서버 생성
const server = http.createServer(app);

// Socket.io 서버 생성
const io = new Server(server, {
  cors: {
    origin: '*', // 개발 환경에서는 모든 도메인에서 접근 허용
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 사용자 관리를 위한 Map 객체
const users = new Map();
// 채팅방 관리를 위한 객체
const rooms = {
  'single': {
    id: 'single',
    name: '단일 채팅방',
    users: 0,
    description: '모든 사용자를 위한 공개 채팅방입니다.'
  }
};

// 루트 경로 핸들러
app.get('/', (req, res) => {
  res.send('Socket.io 채팅 서버가 실행 중입니다.');
});

// Socket.io 연결 이벤트 핸들러
io.on('connection', (socket) => {
  console.log(`새로운 사용자 연결: ${socket.id}`);
  
  // 채팅방 입장 이벤트
  socket.on('join', (data) => {
    const { user, room } = data;
    
    // 사용자 정보 저장
    users.set(socket.id, { nickname: user, room });
    
    // 채팅방에 입장
    socket.join(room);
    
    // 채팅방 사용자 수 증가
    if (rooms[room]) {
      rooms[room].users += 1;
    }
    
    // 입장 알림 메시지
    io.to(room).emit('chat message', {
      user: '시스템',
      text: `${user}님이 입장하셨습니다.`,
      timestamp: new Date()
    });
    
    // 채팅방 목록 업데이트 및 전송
    io.emit('rooms list', Object.values(rooms));
    
    console.log(`${user}님이 ${room} 채팅방에 입장했습니다.`);
  });
  
  // 채팅 메시지 이벤트
  socket.on('chat message', (msg) => {
    const user = users.get(socket.id);
    
    if (user) {
      // 채팅방에 메시지 전송
      io.to(msg.room).emit('chat message', {
        user: msg.user,
        text: msg.text,
        timestamp: new Date()
      });
      
      console.log(`${msg.user}: ${msg.text} (${msg.room} 채팅방)`);
    }
  });
  
  // 채팅방 목록 요청 이벤트
  socket.on('get rooms', () => {
    socket.emit('rooms list', Object.values(rooms));
  });
  
  // 채팅방 나가기 이벤트
  socket.on('leave', (data) => {
    const { user, room } = data;
    
    // 채팅방에서 퇴장
    socket.leave(room);
    
    // 채팅방 사용자 수 감소
    if (rooms[room]) {
      rooms[room].users = Math.max(0, rooms[room].users - 1);
    }
    
    // 퇴장 알림 메시지
    io.to(room).emit('chat message', {
      user: '시스템',
      text: `${user}님이 퇴장하셨습니다.`,
      timestamp: new Date()
    });
    
    // 채팅방 목록 업데이트 및 전송
    io.emit('rooms list', Object.values(rooms));
    
    console.log(`${user}님이 ${room} 채팅방에서 퇴장했습니다.`);
  });
  
  // 연결 종료 이벤트
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user) {
      const { nickname, room } = user;
      
      // 채팅방 사용자 수 감소
      if (rooms[room]) {
        rooms[room].users = Math.max(0, rooms[room].users - 1);
      }
      
      // 퇴장 알림 메시지
      io.to(room).emit('chat message', {
        user: '시스템',
        text: `${nickname}님이 연결을 종료했습니다.`,
        timestamp: new Date()
      });
      
      // 사용자 정보 삭제
      users.delete(socket.id);
      
      // 채팅방 목록 업데이트 및 전송
      io.emit('rooms list', Object.values(rooms));
      
      console.log(`사용자 연결 종료: ${socket.id} (${nickname})`);
    } else {
      console.log(`사용자 연결 종료: ${socket.id}`);
    }
  });
});

// 서버 포트 설정 및 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 