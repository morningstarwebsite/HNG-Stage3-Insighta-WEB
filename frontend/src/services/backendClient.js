 import { env } from "../config/env.js";

export class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

function toCookieHeader(setCookieHeaders = []) {
  if (!Array.isArray(setCookieHeaders) || setCookieHeaders.length === 0) {
    return null;
  }

  const pairs = setCookieHeaders
    .map((item) => String(item).split(";")[0].trim())
    .filter(Boolean);

  return pairs.length ? pairs.join("; ") : null;
}

export class BackendClient {
  constructor(config = env) {
    this.baseUrl = config.backendBaseUrl;
    this.apiVersion = config.backendApiVersion;
    this.authStartPath = config.backendAuthStartPath;
    this.authExchangePath = config.backendAuthExchangePath;
    this.mePath = config.backendMePath;
    this.logoutPath = config.backendLogoutPath;
  }

  buildAuthStartUrl({ redirectUri, state }) {
    const url = new URL(normalizePath(this.authStartPath), this.baseUrl);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  }

  async startOAuth({ redirectUri, state }) {
    const url = new URL(normalizePath(this.authStartPath), this.baseUrl);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-API-Version": this.apiVersion
      },
      redirect: "manual"
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      throw new ApiError("Backend OAuth start did not return redirect", response.status);
    }

    const authUrl = response.headers.get("location");
    if (!authUrl) {
      throw new ApiError("Backend OAuth start missing redirect location", response.status);
    }

    let setCookieHeaders = [];
    if (typeof response.headers.getSetCookie === "function") {
      setCookieHeaders = response.headers.getSetCookie();
    } else {
      const single = response.headers.get("set-cookie");
      if (single) {
        setCookieHeaders = [single];
      }
    }

    return {
      authUrl,
      backendOAuthCookie: toCookieHeader(setCookieHeaders)
    };
  }

  async exchangeOAuthCode({ code, state, redirectUri, backendOAuthCookie }) {
    // Backend's GitHub callback endpoint is GET-only (designed for GitHub to call directly).
    // We proxy the code + state via GET query params so the backend handles exchange itself.
    const payload = await this.request(normalizePath(this.authExchangePath), {
      method: "GET",
      query: { code, state, redirect_uri: redirectUri },
      extraHeaders: backendOAuthCookie ? { Cookie: backendOAuthCookie } : undefined
    });

    // Normalize backend shape: { status, data: { access_token, user } }
    const data = payload?.data || payload;
    return {
      accessToken: data?.accessToken || data?.access_token || null,
      user: data?.user || payload?.user || null,
      raw: payload
    };
  }

  async getCurrentUser(token) {
    return this.request(normalizePath(this.mePath), { token });
  }

  async logout(token) {
    return this.request(normalizePath(this.logoutPath), {
      method: "POST",
      token
    });
  }

  async getDashboardMetrics(token) {
    return this.request("/dashboard/metrics", { token });
  }

  async listProfiles(token, query) {
    return this.request("/profiles", { token, query });
  }

  async getProfileById(token, id) {
    return this.request(`/profiles/${encodeURIComponent(id)}`, { token });
  }

  async searchProfiles(token, queryText, options = {}) {
    return this.request("/search", {
      token,
      query: { q: queryText, ...options }
    });
  }

  async triggerAdminSync(token) {
    return this.request("/admin/profiles/sync", {
      method: "POST",
      token
    });
  }

  async request(path, { method = "GET", token, query, body, extraHeaders } = {}) {
    const url = new URL(normalizePath(path), this.baseUrl);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers = {
      "Accept": "application/json",
      "X-API-Version": this.apiVersion
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (extraHeaders && typeof extraHeaders === "object") {
      Object.assign(headers, extraHeaders);
    }

    let payload;
    if (body) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: payload
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const parsed = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message = isJson && parsed?.message ? parsed.message : "Backend request failed";
      throw new ApiError(message, response.status, parsed);
    }

    return parsed;
  }
}
