import { FIXTURE } from '../../fixtures/scenario-editor.js';

const SCENARIO_URL = '/tools/scenario-editor';
const API_URL = '/api/tools/scenario-editor/data';

describe('Scenario Editor — Push/Pull Sync', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('push happy path — PUT succeeds and shows Saved flash', () => {
    cy.intercept('GET', API_URL, { body: FIXTURE }).as('fetchScenario');
    cy.intercept('PUT', API_URL, { body: { ...FIXTURE, _savedAt: 12345 } }).as('pushScenario');

    cy.visit(SCENARIO_URL);
    cy.wait('@fetchScenario');

    cy.get('.save-btn').should('contain', 'Push to Server').click();
    cy.wait('@pushScenario');
    cy.get('.save-flash').should('contain', 'Saved');
  });

  it('push overwrite confirm — dialog appears when server data is newer', () => {
    const newerFixture = { ...FIXTURE, _savedAt: Date.now() + 1_000_000 };
    cy.intercept('GET', API_URL, { body: newerFixture }).as('fetchScenario');

    cy.visit(SCENARIO_URL);
    cy.wait('@fetchScenario');

    cy.get('.save-btn').click();
    cy.get('.confirm-message').should('contain', 'Server data is newer. Overwrite?');
    cy.get('.confirm-cancel-btn').click();
    cy.get('.confirm-overlay').should('not.exist');
  });

  it('pull happy path — Pull from Server succeeds without confirmation', () => {
    cy.intercept('GET', API_URL, { body: FIXTURE }).as('fetchScenario');

    cy.visit(SCENARIO_URL);
    cy.wait('@fetchScenario');

    cy.get('.pull-btn').should('contain', 'Pull from Server').click();
    cy.wait('@fetchScenario');
    cy.get('.pull-btn').should('contain', 'Pull from Server');
    cy.get('.errors').should('not.exist');
  });

  it('pull no-op — dialog appears when there are unsaved changes', () => {
    cy.intercept('GET', API_URL, { body: FIXTURE }).as('fetchScenario');

    cy.visit(SCENARIO_URL);
    cy.wait('@fetchScenario');

    // Set unsaved = true via Vue 3 dev-mode component access.
    // Only works against the Vite dev server (production builds omit __vueParentComponent).
    cy.get('.scenario-editor').then(($el) => {
      const component = $el[0].__vueParentComponent;
      if (!component) throw new Error('__vueParentComponent not found — run against dev server');
      component.setupState.unsaved.value = true;
    });
    cy.get('.unsaved-marker').should('be.visible');

    cy.get('.pull-btn').click();
    cy.get('.confirm-message').should('contain', 'Discard local changes and load server data?');
    cy.get('.confirm-cancel-btn').click();
    cy.get('.confirm-overlay').should('not.exist');
    cy.get('.unsaved-marker').should('be.visible');
  });

  it('network error on push — shows error state', () => {
    cy.intercept('GET', API_URL, { body: FIXTURE }).as('fetchScenario');
    cy.intercept('PUT', API_URL, { forceNetworkError: true }).as('pushFail');

    cy.visit(SCENARIO_URL);
    cy.wait('@fetchScenario');

    cy.get('.save-btn').click();
    cy.wait('@pushFail');
    cy.get('.errors .error-line').should('exist');
  });
});
