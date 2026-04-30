export function accountController() {
  return {
    async show(req, res) {
      return res.render("account", {
        title: "Account",
        user: req.user
      });
    }
  };
}
