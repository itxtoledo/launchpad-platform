// Import Synpress commands for MetaMask
import { synpressCommandsForMetaMask } from "@synthetixio/synpress/cypress/support";

// Handle uncaught exceptions
Cypress.on("uncaught:exception", () => {
  // returning false here prevents Cypress from failing the test
  return false;
});

// Initialize Synpress commands
synpressCommandsForMetaMask();

// Visit the base URL before each test
before(() => {
  cy.visit("/");
});
