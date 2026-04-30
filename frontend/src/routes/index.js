import { Router } from "express";
import { accountController } from "../controllers/accountController.js";
import { adminController } from "../controllers/adminController.js";
import { authController } from "../controllers/authController.js";
import { dashboardController } from "../controllers/dashboardController.js";
import { profilesController } from "../controllers/profilesController.js";
import { searchController } from "../controllers/searchController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export function createRouter(backendClient) {
  const router = Router();

  const auth = authController(backendClient);
  const dashboard = dashboardController(backendClient);
  const profiles = profilesController(backendClient);
  const search = searchController(backendClient);
  const account = accountController(backendClient);
  const admin = adminController(backendClient);
  const mustBeAuthenticated = requireAuth(backendClient);

  router.get("/", mustBeAuthenticated, (req, res) => res.redirect("/dashboard"));

  router.get("/login", auth.showLogin);
  router.get("/auth/github", auth.startGithub);
  router.get("/auth/callback", auth.oauthCallback);
  router.get("/logout", mustBeAuthenticated, auth.logout);
  router.post("/logout", mustBeAuthenticated, auth.logout);

  router.get("/dashboard", mustBeAuthenticated, dashboard.show);

  router.get("/profiles", mustBeAuthenticated, profiles.list);
  router.get("/profiles/:id", mustBeAuthenticated, profiles.detail);

  router.get("/search", mustBeAuthenticated, search.show);

  router.get("/account", mustBeAuthenticated, account.show);

  router.post("/admin/profiles/sync", mustBeAuthenticated, requireRole("admin"), admin.syncProfiles);

  router.use((req, res) => {
    res.status(404).render("error", {
      title: "Not found",
      message: "The page you requested does not exist."
    });
  });

  return router;
}
