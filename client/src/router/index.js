import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const DEFAULT_SLUG = 'THG';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },

    // Scenario-scoped routes (#529)
    {
      path: '/scenarios/:scenarioSlug/lobby',
      component: () => import('../views/LobbyView.vue'),
    },
    {
      path: '/scenarios/:scenarioSlug/games/:id',
      component: () => import('../views/GameView.vue'),
    },
    {
      path: '/scenarios/:scenarioSlug/tools/map-editor',
      component: () => import('../views/tools/MapEditorView.vue'),
    },
    {
      path: '/scenarios/:scenarioSlug/tools/scenario-editor',
      component: () => import('../views/tools/ScenarioEditorView.vue'),
    },
    {
      path: '/scenarios/:scenarioSlug/tools/oob-editor',
      component: () => import('../views/tools/OobEditorView.vue'),
    },
    {
      path: '/scenarios/:scenarioSlug/tools/map-test',
      component: () => import('../views/tools/MapTestView.vue'),
    },
    {
      path: '/scenarios/:scenarioSlug/tools/table-test',
      component: () => import('../views/tools/TableTestView.vue'),
    },

    // Legacy redirects — send bare paths to the default scenario slug (#529)
    { path: '/lobby', redirect: `/scenarios/${DEFAULT_SLUG}/lobby` },
    { path: '/games/:id', redirect: (to) => `/scenarios/${DEFAULT_SLUG}/games/${to.params.id}` },
    { path: '/tools/map-editor', redirect: `/scenarios/${DEFAULT_SLUG}/tools/map-editor` },
    {
      path: '/tools/scenario-editor',
      redirect: `/scenarios/${DEFAULT_SLUG}/tools/scenario-editor`,
    },
    { path: '/tools/oob-editor', redirect: `/scenarios/${DEFAULT_SLUG}/tools/oob-editor` },
    { path: '/tools/map-test', redirect: `/scenarios/${DEFAULT_SLUG}/tools/map-test` },
    { path: '/tools/table-test', redirect: `/scenarios/${DEFAULT_SLUG}/tools/table-test` },
  ],
});
