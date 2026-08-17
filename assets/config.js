window.KADOSK_CONFIG = {
  clientId: "42596ab1-7d24-468b-8a31-abd953f52194",
  siteBaseUrl: "https://www.kadosk.com",
  frontendBaseUrl: "https://merchant.kadosk.com",
  loginCallbackPath: "/login-callback.html",
  logoutRedirectPath: "/login.html",
  // Callback léger utilisé par la boutique publique (authentification silencieuse du
  // membre déjà connecté sur www.kadosk.com) - distinct du callback marchand, qui gère
  // en plus la 2FA et la redirection vers le dashboard.
  boutiqueCallbackPath: "/boutique-callback.html"
};
