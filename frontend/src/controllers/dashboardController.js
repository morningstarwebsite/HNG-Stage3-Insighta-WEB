import { env } from "../config/env.js";

export function dashboardController(backendClient) {
  return {
    async show(req, res, next) {
      try {
        if (!env.isProduction && req.query.mock === "1") {
          return res.render("dashboard", {
            title: "Dashboard",
            metrics: {
              totalProfiles: 128,
              activeProfiles: 114,
              searchesToday: 36
            },
            highlights: [
              { label: "12 profiles updated in the last 24 hours" },
              { label: "Top search: ML engineers in Abuja" }
            ]
          });
        }

        const payload = await backendClient.getDashboardMetrics(req.session.backendToken);

        return res.render("dashboard", {
          title: "Dashboard",
          metrics: payload?.metrics || payload || {},
          highlights: payload?.highlights || []
        });
      } catch (error) {
        req.flash("error", "Dashboard data is temporarily unavailable. Showing fallback view.");
        return res.render("dashboard", {
          title: "Dashboard",
          metrics: {
            totalProfiles: "N/A",
            activeProfiles: "N/A",
            searchesToday: "N/A"
          },
          highlights: []
        });
      }
    }
  };
}
