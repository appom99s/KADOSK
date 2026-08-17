window.KADOSK_CONFIG = {
  clientId: "REMPLACER_PAR_VOTRE_CLIENT_ID_HEADLESS",
  siteBaseUrl: "https://www.kadosk.com",
  frontendBaseUrl: "https://merchant.kadosk.com",
  loginCallbackPath: "/login-callback.html",
  logoutRedirectPath: "/login.html",
  // Callback léger utilisé par la boutique publique (authentification silencieuse du
  // membre déjà connecté sur www.kadosk.com) - distinct du callback marchand, qui gère
  // en plus la 2FA et la redirection vers le dashboard.
  boutiqueCallbackPath: "/boutique-callback.html"
};
