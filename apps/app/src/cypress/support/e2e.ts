// Handle uncaught exceptions
Cypress.on("uncaught:exception", () => {
  // returning false here prevents Cypress from failing the test
  return false;
});

// Visit the base URL before each test
beforeEach(() => {
  cy.visit("/");
});
