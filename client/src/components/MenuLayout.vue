<template>
  <main id="main-content" class="menu-bg">
    <slot />
  </main>
</template>

<style scoped>
.menu-bg {
  min-height: 100vh;
  background-image: url('/menu-bg.png');
  background-size: cover;
  background-position: center;
}
</style>
