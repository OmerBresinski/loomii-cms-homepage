import { describe, it, expect } from "bun:test";
import { app } from "../../app";

describe("Health Routes", () => {
  describe("GET /health", () => {
    it("returns healthy status", async () => {
      const res = await app.request("/health");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe("healthy");
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("GET /health/ready", () => {
    it("returns readiness status", async () => {
      const res = await app.request("/health/ready");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBeDefined();
      expect(json.checks).toBeDefined();
    });
  });
});
