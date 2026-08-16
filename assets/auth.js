const KADOSK_AUTH = (function () {
  const OAUTH_TOKEN_URL = "https://www.wixapis.com/oauth2/token";
  const LOGIN_V2_URL = "https://www.wixapis.com/_api/iam/authentication/v2/login";
  const REGISTER_V2_URL = "https://www.wixapis.com/_api/iam/authentication/v2/register";
  const REDIRECT_SESSION_URL = "https://www.wixapis.com/_api/redirects-api/v1/redirect-session";

  const STORAGE_KEY = "kadosk_member_tokens";
  const PKCE_STORAGE_KEY = "kadosk_pkce_verifier";
  const STATE_STORAGE_KEY = "kadosk_oauth_state";

  // Marqueur (sessionStorage, donc effacé à la fermeture de l'onglet/navigateur)
  // indiquant que la double authentification (TOTP ou biométrie) a déjà été
  // vérifiée pour CETTE session de connexion. Politique : la 2FA est exigée à
  // chaque nouvelle connexion, mais on évite de la redemander à chaque
  // changement de page ou de rappeler le serveur en boucle une fois vérifiée.
  const VERIF_2FA_STORAGE_KEY = "kadosk_2fa_verifiee_session";

  function marquerVerification2FA() {
    try {
      sessionStorage.setItem(VERIF_2FA_STORAGE_KEY, "1");
    } catch (erreur) {
      // Stockage indisponible : on continue sans persistance (redemandera la 2FA).
    }
  }

  function verification2FAEffectuee() {
    try {
      return sessionStorage.getItem(VERIF_2FA_STORAGE_KEY) === "1";
    } catch (erreur) {
      return false;
    }
  }

  function effacerVerification2FA() {
    try {
      sessionStorage.removeItem(VERIF_2FA_STORAGE_KEY);
    } catch (erreur) {
      // Rien à faire.
    }
  }

  function config() {
    return window.KADOSK_CONFIG;
  }

  function base64UrlEncoder(buffer) {
    let chaine = "";
    const octets = new Uint8Array(buffer);
    for (let i = 0; i < octets.byteLength; i++) {
      chaine += String.fromCharCode(octets[i]);
    }
    return btoa(chaine).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function genererChaineAleatoire(longueur) {
    const octets = new Uint8Array(longueur);
    crypto.getRandomValues(octets);
    return base64UrlEncoder(octets.buffer);
  }

  async function genererDefiPkce(verifier) {
    const donnees = new TextEncoder().encode(verifier);
    const hachage = await crypto.subtle.digest("SHA-256", donnees);
    return base64UrlEncoder(hachage);
  }

  function lireTokens() {
    try {
      const brut = localStorage.getItem(STORAGE_KEY);
      return brut ? JSON.parse(brut) : null;
    } catch (erreur) {
      return null;
    }
  }

  function ecrireTokens(tokens) {
    const expiresAt = Date.now() + (tokens.expires_in || 14400) * 1000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || (lireTokens() || {}).refreshToken,
        expiresAt
      })
    );
  }

  function effacerTokens() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PKCE_STORAGE_KEY);
    localStorage.removeItem(STATE_STORAGE_KEY);
    effacerVerification2FA();
  }

  async function appelJson(url, corps, headersSupplementaires) {
    let reponse;
    try {
      reponse = await fetch(url, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, headersSupplementaires || {}),
        body: JSON.stringify(corps)
      });
    } catch (erreurReseau) {
      console.error("KADOSK_AUTH appel réseau échoué vers", url, erreurReseau);
      const erreur = new Error("ERREUR_RESEAU");
      erreur.cause = erreurReseau;
      throw erreur;
    }

    const donnees = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      console.error("KADOSK_AUTH réponse non-OK depuis", url, reponse.status, donnees);
      const erreur = new Error(donnees.message || donnees.details || "ERREUR_AUTHENTIFICATION");
      erreur.status = reponse.status;
      erreur.donnees = donnees;
      throw erreur;
    }

    return donnees;
  }

  async function obtenirTokenVisiteur() {
    const donnees = await appelJson(OAUTH_TOKEN_URL, {
      clientId: config().clientId,
      grantType: "anonymous"
    });
    return donnees.access_token;
  }

  async function loginMembre(email, motDePasse) {
    const tokenVisiteur = await obtenirTokenVisiteur();
    return appelJson(
      LOGIN_V2_URL,
      { loginId: { email }, password: motDePasse },
      { Authorization: tokenVisiteur }
    );
  }

  async function inscrireMembre(email, motDePasse, profile) {
    const tokenVisiteur = await obtenirTokenVisiteur();
    return appelJson(
      REGISTER_V2_URL,
      { loginId: { email }, password: motDePasse, profile: profile || {} },
      { Authorization: tokenVisiteur }
    );
  }

  async function demarrerAutorisationMembre(sessionToken) {
    const verifier = genererChaineAleatoire(64);
    const defi = await genererDefiPkce(verifier);
    const etat = genererChaineAleatoire(24);

    sessionStorage.setItem(PKCE_STORAGE_KEY, verifier);
    sessionStorage.setItem(STATE_STORAGE_KEY, etat);

    const redirectUri = config().frontendBaseUrl + config().loginCallbackPath;
    const tokenVisiteur = await obtenirTokenVisiteur();

    const reponse = await appelJson(
      REDIRECT_SESSION_URL,
      {
        origin: config().frontendBaseUrl,
        auth: {
          authRequest: {
            clientId: config().clientId,
            codeChallenge: defi,
            codeChallengeMethod: "S256",
            responseMode: "query",
            responseType: "code",
            scope: "offline_access",
            state: etat,
            sessionToken: sessionToken,
            redirectUri: redirectUri
          }
        }
      },
      { Authorization: tokenVisiteur }
    );

    window.location.href = reponse.redirectSession.fullUrl;
  }

  async function traiterRetourAutorisation() {
    const parametres = new URLSearchParams(window.location.search);
    const code = parametres.get("code");
    const etatRecu = parametres.get("state");
    const erreur = parametres.get("error");

    if (erreur) {
      throw new Error("AUTORISATION_REFUSEE");
    }

    const etatAttendu = sessionStorage.getItem(STATE_STORAGE_KEY);
    const verifier = sessionStorage.getItem(PKCE_STORAGE_KEY);

    if (!code || !etatRecu || !etatAttendu || etatRecu !== etatAttendu || !verifier) {
      throw new Error("SESSION_INVALIDE");
    }

    const redirectUri = config().frontendBaseUrl + config().loginCallbackPath;

    const tokens = await appelJson(OAUTH_TOKEN_URL, {
      clientId: config().clientId,
      grantType: "authorization_code",
      code: code,
      codeVerifier: verifier,
      redirectUri: redirectUri
    });

    ecrireTokens(tokens);
    sessionStorage.removeItem(PKCE_STORAGE_KEY);
    sessionStorage.removeItem(STATE_STORAGE_KEY);
  }

  async function rafraichirToken() {
    const tokens = lireTokens();
    if (!tokens || !tokens.refreshToken) {
      throw new Error("SESSION_EXPIREE");
    }
    const nouveauxTokens = await appelJson(OAUTH_TOKEN_URL, {
      clientId: config().clientId,
      grantType: "refresh_token",
      refreshToken: tokens.refreshToken
    });
    ecrireTokens(nouveauxTokens);
    return lireTokens().accessToken;
  }

  async function obtenirAccessTokenValide() {
    const tokens = lireTokens();
    if (!tokens) {
      throw new Error("NON_CONNECTE");
    }
    if (tokens.expiresAt - Date.now() < 60000) {
      return rafraichirToken();
    }
    return tokens.accessToken;
  }

  function estConnecte() {
    return !!lireTokens();
  }

  // La déconnexion est gérée entièrement côté client : ce site n'a pas de session Wix
  // basée sur des cookies à faire terminer côté serveur (l'authentification repose
  // uniquement sur les jetons access/refresh stockés en local, via PKCE) - effacer ces
  // jetons et revenir directement à la page de connexion suffit, et garantit qu'on y
  // revient toujours (contrairement à l'ancienne version, qui passait par l'API Redirect
  // Session de Wix avec une forme de requête "logout" non documentée/non confirmée, et qui
  // pouvait donc ne pas respecter le postFlowUrl attendu).
  async function deconnecter() {
    effacerTokens();
    window.location.href = config().logoutRedirectPath;
  }

  return {
    loginMembre,
    inscrireMembre,
    demarrerAutorisationMembre,
    traiterRetourAutorisation,
    obtenirAccessTokenValide,
    obtenirTokenVisiteur,
    estConnecte,
    deconnecter,
    marquerVerification2FA,
    verification2FAEffectuee,
    effacerVerification2FA
  };
})();
