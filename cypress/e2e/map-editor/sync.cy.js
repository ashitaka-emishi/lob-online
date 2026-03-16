const FIXTURE = {
  _savedAt: 0,
  id: 'south-mountain',
  hexes: [],
  gridSpec: {
    cols: 64,
    rows: 35,
    dx: 0,
    dy: 0,
    hexWidth: 35,
    hexHeight: 35,
    imageScale: 1,
    orientation: 'flat',
    strokeWidth: 0.5,
    evenColUp: false,
  },
  terrainTypes: ['clear'],
  edgeFeatureTypes: ['road'],
  vpHexes: [],
  entryHexes: [],
};

const MAP_URL = '/tools/map-editor';
const API_URL = '/api/tools/map-editor/data';

describe('Map Editor — Push/Pull Sync', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('push happy path — PUT succeeds and shows Saved flash', () => {
    cy.intercept('GET', API_URL, { body: FIXTURE }).as('fetchMap');
    cy.intercept('PUT', API_URL, { body: { _savedAt: 12345 } }).as('pushMap');

    cy.visit(MAP_URL);
    cy.wait('@fetchMap');

    cy.get('.save-btn').should('contain', 'Push to Server').click();
    cy.wait('@pushMap');
    cy.get('.save-flash').should('contain', 'Saved');
  });

  it('push overwrite confirm — dialog appears when server data is newer', () => {
    const newerFixture = { ...FIXTURE, _savedAt: Date.now() + 1_000_000 };
    cy.intercept('GET', API_URL, { body: newerFixture }).as('fetchMap');

    cy.visit(MAP_URL);
    cy.wait('@fetchMap');

    cy.get('.save-btn').click();
    cy.get('.confirm-message').should('contain', 'Server data is newer. Overwrite?');
    cy.get('.confirm-cancel-btn').click();
    cy.get('.confirm-overlay').should('not.exist');
  });

  it('pull happy path — Pull from Server succeeds without confirmation', () => {
    cy.intercept('GET', API_URL, { body: FIXTURE }).as('fetchMap');

    cy.visit(MAP_URL);
    cy.wait('@fetchMap');

    cy.get('.pull-btn').should('contain', 'Pull from Server').click();
    cy.wait('@fetchMap');
    cy.get('.pull-btn').should('contain', 'Pull from Server');
    cy.get('.errors').should('not.exist');
  });

  it('pull discard confirm — dialog appears when there are unsaved changes', () => {
    cy.intercept('GET', API_URL, { body: FIXTURE }).as('fetchMap');

    cy.visit(MAP_URL);
    cy.wait('@fetchMap');

    // Mark state as having unsaved changes via Vue 3 dev-mode component access
    cy.get('.map-editor').then(($el) => {
      $el[0].__vueParentComponent.setupState.unsaved.value = true;
    });
    cy.get('.unsaved-marker').should('be.visible');

    cy.get('.pull-btn').click();
    cy.get('.confirm-message').should('contain', 'Discard local changes and load server data?');
    cy.get('.confirm-cancel-btn').click();
    cy.get('.confirm-overlay').should('not.exist');
    cy.get('.unsaved-marker').should('be.visible');
  });
});
