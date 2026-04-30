export function adminController(backendClient) {
  return {
    async syncProfiles(req, res, next) {
      try {
        await backendClient.triggerAdminSync(req.session.backendToken);
        req.flash("success", "Profile sync started successfully.");
        return res.redirect("/dashboard");
      } catch (error) {
        return next(error);
      }
    }
  };
}
