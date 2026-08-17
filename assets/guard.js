(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "login.html";
    return;
  }

  KADOSK_NAV.rendreBarreLaterale("kadoskSidebar");
  KADOSK_NAV.rendreEnteteDroite("kadoskEnteteDroite");

  const lienDeconnexion = document.getElementById("lienDeconnexion");
  if (lienDeconnexion) {
    lienDeconnexion.addEventListener("click", () => {
      KADOSK_AUTH.deconnecter();
    });
  }

  // ---------------------------------------------------------------------
  // Déconnexion automatique après inactivité. La dernière activité est
  // stockée dans localStorage (pas sessionStorage) pour couvrir plusieurs
  // onglets/pages ouverts simultanément.
  // ---------------------------------------------------------------------
  const IDLE_TIMEOUT_MINUTES = 20;
  const CLE_DERNIERE_ACTIVITE = "kadosk_derniere_activite";

  function enregistrerActivite() {
    try {
      localStorage.setItem(CLE_DERNIERE_ACTIVITE, String(Date.now()));
    } catch (erreur) {
      // Stockage indisponible (navigation privée, quota) : on continue sans persistance.
    }
  }

  function inactifDepuisTropLongtemps() {
    try {
      const derniere = Number(localStorage.getItem(CLE_DERNIERE_ACTIVITE)) || Date.now();
      return Date.now() - derniere > IDLE_TIMEOUT_MINUTES * 60000;
    } catch (erreur) {
      return false;
    }
  }

  enregistrerActivite();
  ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"].forEach((evenement) => {
    window.addEventListener(evenement, enregistrerActivite, { passive: true });
  });

  setInterval(() => {
    if (inactifDepuisTropLongtemps()) {
      KADOSK_AUTH.deconnecter();
    }
  }, 30000);

  // ---------------------------------------------------------------------
  // Double authentification (2FA) : le serveur ne redemande un nouveau code
  // (ou la biométrie) que tous les 15 jours, pas à chaque connexion (voir
  // verifierBesoin2FA côté backend). Une fois vérifiée pour cette session
  // (marqueur sessionStorage posé par login-callback.html ou two-factor.html),
  // on ne rappelle plus le serveur à chaque changement de page — seul le tout
  // premier chargement de page après une connexion fait l'appel réseau.
  // ---------------------------------------------------------------------
  const PAGES_SANS_VERIF_2FA = ["two-factor.html", "login.html", "login-callback.html"];
  const pageActuelle = window.location.pathname.split("/").pop() || "dashboard.html";

  if (!PAGES_SANS_VERIF_2FA.includes(pageActuelle) && window.KADOSK_API) {
    if (!KADOSK_AUTH.verification2FAEffectuee()) {
      KADOSK_API.need2FA()
        .then((etat) => {
          if (etat && etat.enabled && etat.required) {
            window.location.href = "two-factor.html?retour=" + encodeURIComponent(pageActuelle);
          } else {
            // 2FA non exigée : on marque la session comme vérifiée pour éviter
            // de rappeler le serveur à chaque page tant que la session dure.
            KADOSK_AUTH.marquerVerification2FA();
          }
        })
        .catch((erreur) => {
          console.error("Vérification 2FA indisponible :", erreur);
        });
    }
  }
})();
