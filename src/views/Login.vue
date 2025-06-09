<template>
  <div class="login-container">
    <div class="login-card">
      <h2>채팅방 입장</h2>
      <form @submit.prevent="enterChat">
        <div class="form-group">
          <label for="nickname">닉네임</label>
          <input 
            id="nickname"
            v-model="nickname" 
            placeholder="닉네임을 입력하세요" 
            required 
            autofocus
          />
        </div>
        <button type="submit" class="btn-enter">입장하기</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

// 라우터와 사용자 스토어 가져오기
const router = useRouter()
const userStore = useUserStore()
const nickname = ref('')

/**
 * 채팅방 입장 처리 함수
 * 사용자가 입력한 닉네임으로 로그인 처리 후 로비 페이지로 이동
 */
function enterChat() {
  if (nickname.value.trim()) {
    // 스토어에 사용자 정보 저장
    userStore.login(nickname.value)
    // 로비 페이지로 이동
    router.push('/lobby')
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #42b983;
  text-align: center;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.btn-enter {
  width: 100%;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-enter:hover {
  background-color: #3aa876;
}
</style>
  