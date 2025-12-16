const request = require("supertest");
const express = require("express");
const app = require("../server"); // adjust if server export differs

describe("Taxpayer API validation", () => {

  test("Rejects taxpayer creation when required fields are missing", async () => {
    const response = await request(app)
      .post("/api/taxpayers")
      .send({
        firstName: "John",
        // lastName missing
        email: "john@test.com",
        annualIncome: 50000
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBeDefined();
  });

});
