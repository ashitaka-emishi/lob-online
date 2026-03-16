import { FIXTURE } from '../../fixtures/map-editor.js';

const MAP_URL = '/tools/map-editor';
const API_URL = '/api/tools/map-editor/data';

describe('Map Editor — Offline Mode', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('offline with draft — loads draft and shows offline banner', () => {
    cy.intercept('GET', API_URL, { forceNetworkError: true });

    const draftData = { ...FIXTURE, _savedAt: Date.now() };
    cy.visit(MAP_URL, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          'lob-map-editor-mapdata-south-mountain-v2',
          JSON.stringify(draftData)
        );
      },
    });

    cy.get('.offline-banner').should('contain', 'Server unreachable — working from local draft');
    cy.get('.save-btn').should('be.disabled').should('contain', 'Offline');
  });

  it('offline without draft — shows fetch error, no offline banner', () => {
    cy.intercept('GET', API_URL, { forceNetworkError: true });

    cy.visit(MAP_URL);

    cy.get('.errors .error-line').should('contain', 'Failed to load map data');
    cy.get('.offline-banner').should('not.exist');
  });
});
