// Stretch test: verifies the real browser → server → filesystem path.
// Requires the dev server to be running with MAP_EDITOR_ENABLED=true.
// No API stubs — exercises the live PUT endpoint and confirms a backup file
// is written to data/scenarios/south-mountain/backups/ after a push.

const MAP_URL = '/tools/map-editor';

describe('Map Editor — Server Backups', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('backup file is created on the server after a push', () => {
    cy.task('listBackups').then((filesBefore) => {
      const countBefore = filesBefore.length;

      cy.visit(MAP_URL);
      cy.get('.save-btn', { timeout: 10_000 }).should('contain', 'Push to Server');

      cy.get('.save-btn').click();

      // Handle optional overwrite confirmation (server data may be newer)
      cy.get('body').then(($body) => {
        if ($body.find('.confirm-overlay').length) {
          cy.get('.confirm-ok-btn').click();
        }
      });

      cy.get('.save-flash', { timeout: 10_000 }).should('contain', 'Saved');

      cy.task('listBackups').then((filesAfter) => {
        expect(filesAfter.length).to.be.greaterThan(countBefore);
      });
    });
  });
});
