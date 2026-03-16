/**
 * Seed a map draft into localStorage for the given scenario.
 *
 * @param {string} scenarioId - Scenario identifier (e.g. 'south-mountain')
 * @param {object} draftData  - Map data object to store as the draft
 *
 * NOTE: This command uses cy.window() and therefore executes AFTER the page loads.
 * If the component reads localStorage in onMounted (e.g. for offline fallback),
 * seeding via this command will race with that read. For pre-mount seeding use
 * cy.visit(url, { onBeforeLoad(win) { win.localStorage.setItem(...) } }) instead.
 */
Cypress.Commands.add('seedMapDraft', (scenarioId, draftData) => {
  const key = `lob-map-editor-mapdata-${scenarioId}-v2`;
  cy.window().then((win) => win.localStorage.setItem(key, JSON.stringify(draftData)));
});
