describe("Wallet Connection", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("has connect wallet button", () => {
    cy.get('[data-testid="connect-wallet-button"]').should("be.visible");
  });

  // Skipping MetaMask-specific test due to Chrome extension limitations
  it("clicking connect wallet button opens modal with metamask option", () => {
    cy.get('[data-testid="connect-wallet-button"]').click();
    cy.get('[data-testid="rk-wallet-option-metaMask"]').should("be.visible");
  });
});
