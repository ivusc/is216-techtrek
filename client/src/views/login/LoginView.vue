<script setup>
import { ref } from 'vue';
import LoginPanel from '@/components/login/LoginPanel.vue';
import SignUpPanel from '@/components/login/SignUpPanel.vue';
const isLogin = ref(true);

function switchToLogin() {
  isLogin.value = true;
}

function switchToSignUp() {
  isLogin.value = false;
}
</script>

<template>
  <div class="row h-100 w-100">
    <div id="banner" class="d-flex h-100 w-50">
      <p>banner</p>
    </div>
    <div id="loginPanel" class="d-flex h-100 w-50">
      <div id="panel">
        <div id="slider">
          <button class="slider-button btn" :class="{selected : isLogin}" @click="switchToLogin()">Log in</button>
          <button class="slider-button btn" :class="{selected : !isLogin}" @click="switchToSignUp()">Sign up</button>
        </div>
        <LoginPanel v-show="isLogin" @switch-to-signup="switchToSignUp()"/>
        <SignUpPanel v-show="!isLogin"/>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
#loginPanel, #banner {
  display: flex;
  justify-content: center;
  align-items: center;
}

#panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 80%;
  height: 60%;
  background-color: white;
  padding: 8% 5%;
  gap: 3rem;
  border-radius: var(--bs-border-radius);
  box-shadow: 0px 10px 25px 0px rgba(0, 0, 0, 0.15);
}

#slider {
  background-color: #F6F3DA;
  border-radius: var(--bs-border-radius);
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
}

.slider-button {
  margin: 5px;
  border-radius: var(--bs-border-radius);
  width: 50%;
  font-weight: bold;
}

.selected {
  background-color: white;
  box-shadow:0px 1px 3px 0px rgba(0, 0, 0, 0.15);
}
</style>
