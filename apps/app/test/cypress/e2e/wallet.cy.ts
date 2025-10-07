describe("Wallet Connection", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("has connect wallet button", () => {
    cy.contains("button", "Connect Wallet").should("be.visible");
  });

  // Skipping MetaMask-specific test due to Chrome extension limitations
  it("clicking connect wallet button opens modal with metamask option", () => {
    cy.contains("button", "Connect Wallet").click();
    cy.get('[data-testid="rk-wallet-option-metaMask"]').should("be.visible");
  });
});
