<script setup>

</script>

<template>
  <div class="row h-100">
    <div id="banner" class="d-flex h-100 col-6">
      <p>banner</p>
    </div>
    <div id="loginPanel" class="d-flex h-100 col-6">
      <div id="panel" class="">
        <p>login</p>
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
  background-color: white;
  width: 90%;
  height: 90%;
  padding: 95%;
  border-radius: var(--bs-border-radius);
}
</style>
