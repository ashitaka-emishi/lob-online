import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

import { DEFAULT_SLUG } from '../stores/useModuleStore.js';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/about', component: () => import('../views/AboutView.vue') },

    // Module-scoped routes (#529): modules are published LoB/RSS games like THG, SM, NBH.
    {
      path: '/modules/:moduleSlug/scenarios/:scenarioSlug/lobby',
      component: () => import('../views/LobbyView.vue'),
    },
    {
      path: '/modules/:moduleSlug/lobby',
      redirect: (to) => `/modules/${to.params.moduleSlug}/scenarios/full-battle/lobby`,
    },
    {
      path: '/modules/:moduleSlug/scenarios/:scenarioSlug/games/:id',
      component: () => import('../views/GameView.vue'),
    },
    {
      path: '/modules/:moduleSlug/games/:id',
      redirect: (to) =>
        `/modules/${to.params.moduleSlug}/scenarios/full-battle/games/${to.params.id}`,
    },
    {
      path: '/modules/:moduleSlug/tools/map-editor',
      component: () => import('../views/tools/MapEditorView.vue'),
    },
    {
      path: '/modules/:moduleSlug/scenarios/:scenarioSlug/tools/scenario-editor',
      component: () => import('../views/tools/ScenarioEditorView.vue'),
    },
    {
      path: '/modules/:moduleSlug/tools/scenario-editor',
      redirect: (to) =>
        `/modules/${to.params.moduleSlug}/scenarios/full-battle/tools/scenario-editor`,
    },
    {
      path: '/modules/:moduleSlug/tools/oob-editor',
      component: () => import('../views/tools/OobEditorView.vue'),
    },
    {
      path: '/modules/:moduleSlug/tools/map-test',
      component: () => import('../views/tools/MapTestView.vue'),
    },
    {
      path: '/modules/:moduleSlug/tools/table-test',
      component: () => import('../views/tools/TableTestView.vue'),
    },

    // Legacy redirects — send bare paths to the default module + full-battle scenario (#529)
    { path: '/lobby', redirect: `/modules/${DEFAULT_SLUG}/scenarios/full-battle/lobby` },
    {
      path: '/games/:id',
      redirect: (to) => `/modules/${DEFAULT_SLUG}/scenarios/full-battle/games/${to.params.id}`,
    },
    { path: '/tools/map-editor', redirect: `/modules/${DEFAULT_SLUG}/tools/map-editor` },
    {
      path: '/tools/scenario-editor',
      redirect: `/modules/${DEFAULT_SLUG}/scenarios/full-battle/tools/scenario-editor`,
    },
    { path: '/tools/oob-editor', redirect: `/modules/${DEFAULT_SLUG}/tools/oob-editor` },
    { path: '/tools/map-test', redirect: `/modules/${DEFAULT_SLUG}/tools/map-test` },
    { path: '/tools/table-test', redirect: `/modules/${DEFAULT_SLUG}/tools/table-test` },
  ],
});
