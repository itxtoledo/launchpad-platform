import { defineConfig } from "cypress";

// Define Cypress configuration
export default defineConfig({
  chromeWebSecurity: true,
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "test/cypress/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "src/cypress/support/e2e.{js,jsx,ts,tsx}",
    testIsolation: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      return config;
    },
  },
});
