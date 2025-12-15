// taxUtils.js
function computeTax(taxableIncome) {
  if (taxableIncome < 0) return 0;
  return +(taxableIncome * 0.23).toFixed(2);
}

module.exports = { computeTax };
