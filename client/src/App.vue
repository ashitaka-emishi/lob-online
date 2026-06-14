<script setup></script>

<template>
  <a href="#main-content" class="skip-nav">Skip to main content</a>
  <main id="main-content">
    <RouterView />
  </main>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  height: 100%;
}

body {
  height: 100%;
  background: #1a1a1a;
  color: #e0d8c8;
  font-family: Georgia, serif;
}

.skip-nav {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.skip-nav:focus {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  width: auto;
  height: auto;
  padding: 0.4rem 0.8rem;
  background: #1a1a1a;
  color: #d8c8a0;
  border: 1px solid #d8c8a0;
  border-radius: 3px;
  z-index: 9999;
}
</style>
