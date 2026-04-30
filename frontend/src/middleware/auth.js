const USER_CACHE_WINDOW_MS = 60_000;

export function requireAuth(backendClient) {
  return async (req, res, next) => {
    try {
      if (!req.session?.backendToken) {
        return res.redirect("/login");
      }

      const now = Date.now();
      const lastFetchedAt = req.session.userFetchedAt || 0;
      const hasFreshCache = req.session.currentUser && now - lastFetchedAt < USER_CACHE_WINDOW_MS;

      if (!hasFreshCache) {
        const authPayload = await backendClient.getCurrentUser(req.session.backendToken);
        const user = authPayload?.user || authPayload;
        req.session.currentUser = user;
        req.session.userFetchedAt = now;
      }

      req.user = req.session.currentUser;
      res.locals.currentUser = req.user;
      return next();
    } catch (error) {
      if (req.session?.currentUser && req.session?.backendToken) {
        req.user = req.session.currentUser;
        res.locals.currentUser = req.user;
        return next();
      }

      req.session.destroy(() => {
        res.redirect("/login?expired=1");
      });
      return undefined;
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).render("error", {
        title: "Access denied",
        message: "You do not have permission to perform this action."
      });
    }

    return next();
  };
}

export function canManageProfiles(user) {
  return user?.role === "admin" || user?.role === "manager";
}
