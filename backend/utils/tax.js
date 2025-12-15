// utils/tax.js

/**
 * Calculates tax at a flat 23% rate
 * @param {number} income
 * @returns {number}
 */
function calculateTax(income) {
  if (income <= 0) return 0;
  return Math.round(income * 0.23);
}

module.exports = {
  calculateTax
};
