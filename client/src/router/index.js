import { createRouter, createWebHistory } from 'vue-router';
import StatusView from '../views/StatusView.vue';
import MapEditorView from '../views/tools/MapEditorView.vue';
import ScenarioEditorView from '../views/tools/ScenarioEditorView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: StatusView },
    { path: '/tools/map-editor', component: MapEditorView },
    { path: '/tools/scenario-editor', component: ScenarioEditorView },
  ],
});
