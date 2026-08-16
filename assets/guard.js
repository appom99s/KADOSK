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
  // Double authentification (2FA) : si activée et qu'aucun code n'a été
  // resaisi depuis 15 jours, on redirige vers la page de vérification avant
  // de laisser continuer sur le dashboard.
  // ---------------------------------------------------------------------
  const PAGES_SANS_VERIF_2FA = ["two-factor.html", "login.html", "login-callback.html"];
  const pageActuelle = window.location.pathname.split("/").pop() || "dashboard.html";

  if (!PAGES_SANS_VERIF_2FA.includes(pageActuelle) && window.KADOSK_API) {
    KADOSK_API.need2FA()
      .then((etat) => {
        if (etat && etat.enabled && etat.required) {
          window.location.href = "two-factor.html?retour=" + encodeURIComponent(pageActuelle);
        }
      })
      .catch((erreur) => {
        console.error("Vérification 2FA indisponible :", erreur);
      });
  }
})();
