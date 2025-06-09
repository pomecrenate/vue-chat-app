<script setup>
// 앱의 루트 컴포넌트
import { onMounted } from 'vue'
import { useUserStore } from './stores/user'

const userStore = useUserStore()

/**
 * 앱 초기화 시 실행되는 로직
 * 로컬 스토리지에서 사용자 정보를 복원
 */
onMounted(() => {
  // 사용자 정보 복원 (로컬 스토리지에 저장된 데이터가 있으면)
  userStore.restoreUser()
})
</script>

<template>
  <div class="app">
    <header>
      <h1>Vue 채팅 애플리케이션</h1>
    </header>
    <main>
      <!-- 라우터 뷰: 현재 경로에 맞는 컴포넌트를 표시 -->
      <router-view />
    </main>
  </div>
</template>

<style>
body {
  font-family: 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  color: #42b983;
}

main {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
}
</style>
