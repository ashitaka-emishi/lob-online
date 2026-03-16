Cypress.Commands.add('seedMapDraft', (scenarioId, draftData) => {
  const key = `lob-map-editor-mapdata-${scenarioId}-v2`;
  cy.window().then((win) => win.localStorage.setItem(key, JSON.stringify(draftData)));
});
