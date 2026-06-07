import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/tools/map-editor', component: () => import('../views/tools/MapEditorView.vue') },
    {
      path: '/tools/scenario-editor',
      component: () => import('../views/tools/ScenarioEditorView.vue'),
    },
    { path: '/tools/oob-editor', component: () => import('../views/tools/OobEditorView.vue') },
    { path: '/tools/map-test', component: () => import('../views/tools/MapTestView.vue') },
    { path: '/tools/table-test', component: () => import('../views/tools/TableTestView.vue') },
    { path: '/lobby', component: () => import('../views/LobbyView.vue') },
    { path: '/games/:id', component: () => import('../views/GameView.vue') },
  ],
});
