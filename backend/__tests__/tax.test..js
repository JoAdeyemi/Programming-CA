const { calculateTax } = require("../utils/tax");

describe("Tax Calculation – Flat 23%", () => {
  test("Tax is calculated at flat 23%", () => {
    const income = 100000;
    const result = calculateTax(income);
    expect(result).toBe(23000);
  });

  test("Zero income returns zero tax", () => {
    expect(calculateTax(0)).toBe(0);
  });

  test("Negative income returns zero tax", () => {
    expect(calculateTax(-5000)).toBe(0);
  });
});
