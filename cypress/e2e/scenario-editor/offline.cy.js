import { FIXTURE } from '../../fixtures/scenario-editor.js';

const SCENARIO_URL = '/tools/scenario-editor';
const API_URL = '/api/tools/scenario-editor/data';
const STORAGE_KEY = 'lob-scenario-editor-south-mountain-v2';

describe('Scenario Editor — Offline Mode', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('offline with draft — loads draft and shows offline banner', () => {
    cy.intercept('GET', API_URL, { forceNetworkError: true });

    const draftData = { ...FIXTURE, _savedAt: Date.now() };
    cy.visit(SCENARIO_URL, {
      onBeforeLoad(win) {
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
      },
    });

    cy.get('.offline-banner').should('contain', 'Server unreachable — working from local draft');
    cy.get('.save-btn').should('be.disabled').should('contain', 'Offline');
  });

  it('offline without draft — shows fetch error, no offline banner', () => {
    cy.intercept('GET', API_URL, { forceNetworkError: true });

    cy.visit(SCENARIO_URL);

    cy.get('.errors .error-line').should('contain', 'Failed to load scenario data');
    cy.get('.offline-banner').should('not.exist');
  });
});
