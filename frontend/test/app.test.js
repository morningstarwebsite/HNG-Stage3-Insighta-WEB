import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

function createMockBackendClient({ role = "admin" } = {}) {
  return {
    buildAuthStartUrl({ state }) {
      return `https://backend.example/auth/github?state=${state}`;
    },
    async exchangeOAuthCode() {
      return {
        accessToken: "token-123",
        user: { id: "u1", name: "Portal User", email: "portal@example.com", role }
      };
    },
    async getCurrentUser() {
      return { user: { id: "u1", name: "Portal User", email: "portal@example.com", role } };
    },
    async logout() {
      return { ok: true };
    },
    async getDashboardMetrics() {
      return {
        metrics: {
          totalProfiles: 25,
          activeProfiles: 20,
          searchesToday: 8
        },
        highlights: [{ label: "3 profiles updated in last 24h" }]
      };
    },
    async listProfiles() {
      return {
        items: [{ id: "p1", name: "Jane Doe", email: "jane@example.com", role: "viewer", status: "active" }],
        pagination: { page: 1, pages: 1, limit: 10, total: 1 }
      };
    },
    async getProfileById(_token, id) {
      return { profile: { id, name: "Jane Doe", role: "viewer", status: "active" } };
    },
    async searchProfiles() {
      return { items: [{ id: "p1", name: "Jane Doe" }], total: 1 };
    },
    async triggerAdminSync() {
      return { ok: true };
    }
  };
}

async function authenticate(agent) {
  const start = await agent.get("/auth/github").expect(302);
  const redirected = new URL(start.headers.location);
  const state = redirected.searchParams.get("state");
  assert.ok(state);

  await agent.get(`/auth/callback?code=fake-code&state=${state}`).expect(302);
}

test("redirects unauthenticated users to login", async () => {
  const app = createApp({ backendClient: createMockBackendClient() });
  await request(app).get("/dashboard").expect(302).expect("Location", "/login");
});

test("shows dashboard metrics for authenticated user", async () => {
  const app = createApp({ backendClient: createMockBackendClient({ role: "admin" }) });
  const agent = request.agent(app);

  await authenticate(agent);

  const res = await agent.get("/dashboard").expect(200);
  assert.match(res.text, /Total Profiles/);
  assert.match(res.text, /25/);
  assert.match(res.text, /Trigger Profile Sync/);
});

test("hides admin-only action for non-admin role", async () => {
  const app = createApp({ backendClient: createMockBackendClient({ role: "viewer" }) });
  const agent = request.agent(app);

  await authenticate(agent);

  const res = await agent.get("/dashboard").expect(200);
  assert.doesNotMatch(res.text, /Trigger Profile Sync/);
});
