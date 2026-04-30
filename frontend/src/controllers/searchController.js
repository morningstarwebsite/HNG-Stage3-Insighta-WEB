export function searchController(backendClient) {
  return {
    async show(req, res, next) {
      const queryText = (req.query.q || "").trim();

      if (!queryText) {
        return res.render("search", {
          title: "Search",
          queryText,
          results: [],
          total: 0
        });
      }

      try {
        const payload = await backendClient.searchProfiles(req.session.backendToken, queryText, {
          limit: req.query.limit || 10
        });

        const results = payload?.items || payload?.results || [];
        return res.render("search", {
          title: "Search",
          queryText,
          results,
          total: payload?.total ?? results.length
        });
      } catch (error) {
        req.flash("error", "Search is temporarily unavailable. Showing fallback view.");
        return res.render("search", {
          title: "Search",
          queryText,
          results: [],
          total: 0
        });
      }
    }
  };
}
