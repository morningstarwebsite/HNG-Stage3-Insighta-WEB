import crypto from "node:crypto";
import { env } from "../config/env.js";

function safeInternalRedirect(target) {
  if (!target || typeof target !== "string") {
    return "/dashboard";
  }

  if (!target.startsWith("/") || target.startsWith("//")) {
    return "/dashboard";
  }

  return target;
}

export function authController(backendClient) {
  return {
    showLogin(req, res) {
      if (req.session?.backendToken) {
        return res.redirect("/dashboard");
      }

      const expired = req.query.expired === "1";
      return res.render("login", {
        title: "Sign in",
        expired
      });
    },

    async startGithub(req, res, next) {
      try {
        const state = crypto.randomBytes(24).toString("hex");
        const returnTo = safeInternalRedirect(req.query.returnTo || "/dashboard");
        req.session.oauthState = state;
        req.session.oauthReturnTo = returnTo;
        req.session.backendOAuthCookie = null;

        const callbackUrl = new URL("/auth/callback", env.portalBaseUrl).toString();
        let authUrl;

        if (typeof backendClient.startOAuth === "function") {
          const handshake = await backendClient.startOAuth({
            state,
            redirectUri: callbackUrl
          });

          authUrl = handshake.authUrl;
          req.session.backendOAuthCookie = handshake.backendOAuthCookie || null;

          // In local development, fail fast if backend returns an OAuth callback
          // bound to another origin (e.g., deployed Railway URL), because the
          // login flow will never return to this local app instance.
          if (!env.isProduction) {
            const expectedOrigin = new URL(env.portalBaseUrl).origin;

            try {
              const parsedAuthUrl = new URL(authUrl);
              const returnedRedirectUri = parsedAuthUrl.searchParams.get("redirect_uri");

              if (returnedRedirectUri) {
                const returnedOrigin = new URL(returnedRedirectUri).origin;
                if (returnedOrigin !== expectedOrigin) {
                  req.flash(
                    "error",
                    `OAuth callback origin mismatch. Expected ${expectedOrigin}, got ${returnedOrigin}. Update backend OAuth callback settings.`
                  );
                  return res.redirect("/login");
                }
              }
            } catch {
              // Ignore URL parsing errors and proceed with default flow.
            }
          }
        } else {
          authUrl = backendClient.buildAuthStartUrl({
            state,
            redirectUri: callbackUrl
          });
        }

        await new Promise((resolve) => {
          req.session.save((saveErr) => {
            if (saveErr) {
              // Non-fatal: log and continue. In-memory state is still valid for this request.
              // eslint-disable-next-line no-console
              console.warn("Session save warning before OAuth redirect:", saveErr.message);
            }
            resolve();
          });
        });

        return res.redirect(authUrl);
      } catch (error) {
        req.flash("error", "Unable to start GitHub login right now. Please try again.");
        return res.redirect("/login");
      }
    },

    async oauthCallback(req, res, next) {
      try {
        const { code, state } = req.query;

        if (!code || !state) {
          req.flash("error", "Invalid login callback. Please try again.");
          return res.redirect("/login");
        }

        if (!req.session?.oauthState || req.session.oauthState !== state) {
          delete req.session.oauthState;
          delete req.session.oauthReturnTo;
          delete req.session.backendOAuthCookie;
          req.flash("error", "Login verification failed. Please try again.");
          return res.redirect("/login");
        }

        const callbackUrl = new URL("/auth/callback", env.portalBaseUrl).toString();
        const authPayload = await backendClient.exchangeOAuthCode({
          code,
          state,
          redirectUri: callbackUrl,
          backendOAuthCookie: req.session.backendOAuthCookie
        });

        if (!authPayload?.accessToken) {
          req.flash("error", "Login failed. Backend did not return a valid session.");
          return res.redirect("/login");
        }

        req.session.backendToken = authPayload.accessToken;
        req.session.currentUser = authPayload.user || null;
        req.session.userFetchedAt = Date.now();

        const returnTo = safeInternalRedirect(req.session.oauthReturnTo);
        delete req.session.oauthState;
        delete req.session.oauthReturnTo;
        delete req.session.backendOAuthCookie;

        return res.redirect(returnTo);
      } catch (error) {
        req.flash("error", "Login failed. Please try again.");
        return res.redirect("/login");
      }
    },

    async logout(req, res) {
      try {
        if (req.session?.backendToken) {
          await backendClient.logout(req.session.backendToken);
        }
      } catch {
        // Logout should still clear local session even if backend logout fails.
      }

      return req.session.destroy(() => {
        res.clearCookie("insighta.sid");
        res.redirect("/login");
      });
    }
  };
}
