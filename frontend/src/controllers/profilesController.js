const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function profilesController(backendClient) {
  return {
    async list(req, res, next) {
      try {
        const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
        const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        const sort = req.query.sort || "updated_at:desc";
        const role = req.query.role || "";
        const status = req.query.status || "";
        const query = req.query.query || "";

        const payload = await backendClient.listProfiles(req.session.backendToken, {
          page,
          limit,
          sort,
          role,
          status,
          query
        });

        const items = payload?.items || payload?.profiles || [];
        const pagination = payload?.pagination || {
          page,
          limit,
          total: items.length,
          pages: 1
        };

        return res.render("profiles", {
          title: "Profiles",
          items,
          filters: { role, status, query, sort },
          pagination
        });
      } catch (error) {
        const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
        const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
        const sort = req.query.sort || "updated_at:desc";
        const role = req.query.role || "";
        const status = req.query.status || "";
        const query = req.query.query || "";

        req.flash("error", "Profiles data is temporarily unavailable. Showing fallback view.");
        return res.render("profiles", {
          title: "Profiles",
          items: [],
          filters: { role, status, query, sort },
          pagination: {
            page,
            limit,
            total: 0,
            pages: 1
          }
        });
      }
    },

    async detail(req, res, next) {
      try {
        const payload = await backendClient.getProfileById(req.session.backendToken, req.params.id);
        const profile = payload?.profile || payload;

        return res.render("profile-detail", {
          title: `Profile ${profile?.id || ""}`,
          profile
        });
      } catch (error) {
        req.flash("error", "Profile details are temporarily unavailable.");
        return res.render("profile-detail", {
          title: "Profile Detail",
          profile: null
        });
      }
    }
  };
}
