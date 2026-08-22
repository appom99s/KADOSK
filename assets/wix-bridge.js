// ---------------------------------------------------------------------------
// Pont avec le site Wix principal, pour le cas où une page KADOSK (boutique.html,
// etape-4-destinataire.html, mes-commandes.html...) est intégrée dans une page Wix via
// l'élément "HTML iframe" (Embed a Site). Objectif : si le visiteur est déjà connecté
// en tant que membre Wix sur le site parent, il est reconnu automatiquement dans "Mes
// commandes" - SANS revérification par le code à 6 chiffres.
//
// Comment c'est sécurisé (important à comprendre avant de toucher ce fichier) :
// - Le jeton acheteur reçu ici n'est jamais fabriqué côté client. Il vient du webMethod
//   giftCardSecurity.web.js :: genererJetonAcheteurPourMembreWix, protégé par
//   Permissions.SiteMember - Wix lui-même vérifie que l'appelant est un membre
//   authentifié AVANT que ce webMethod ne s'exécute, et l'e-mail utilisé est TOUJOURS
//   celui de la session Wix réelle (jamais une valeur transmise par la page).
// - C'est donc un VRAI jeton "Mes commandes" (même mécanisme que login par code par
//   e-mail), pas juste un pré-remplissage : une fois reçu, l'acheteur est réellement
//   connecté, comme s'il avait tapé son code.
// - Ce fichier ne fait QUE relayer ce jeton déjà signé par le serveur - il ne décide
//   jamais lui-même de qui est connecté.
// - Un message qui ne vient pas EXACTEMENT du domaine Wix attendu est ignoré.
//
// Mise en place côté Wix (une fois, dans l'Éditeur Wix, sur la page qui contient
// l'élément HTML iframe) :
//   1. Ajouter l'élément "Intégrer un site" (HTML iframe), pointer son "src" vers la
//      page KADOSK concernée, lui donner un ID (ex. htmlBoutique).
//   2. Dans le code de la page Wix (panneau Velo), coller :
//
//        import { genererJetonAcheteurPourMembreWix } from 'backend/giftCardSecurity.web';
//
//        $w.onReady(function () {
//          $w('#htmlBoutique').onMessage(async (event) => {
//            if (event.data !== 'KADOSK_READY') return;
//            try {
//              const resultat = await genererJetonAcheteurPourMembreWix();
//              $w('#htmlBoutique').postMessage({ type: 'KADOSK_BUYER_TOKEN', ...resultat });
//            } catch (e) {
//              // Visiteur non connecté en tant que membre Wix - rien à envoyer,
//              // la page KADOSK reste sur son flux normal (email + code).
//            }
//          });
//        });
//
//   (Le "KADOSK_READY" évite une course : on n'appelle le webMethod qu'une fois la
//   page KADOSK prête à recevoir le résultat.)
// ---------------------------------------------------------------------------
(function () {
  // À REMPLACER par le domaine RÉEL du site Wix qui embarque ces pages - jamais "*"
  // (voir avertissement officiel Wix : un targetOrigin/origin générique permettrait à
  // n'importe quel site tiers d'envoyer ou d'intercepter ce message).
  const ORIGINE_WIX_AUTORISEE = "https://www.kadosk.com";
  const CLE_TOKEN_ACHETEUR = "kadosk_buyer_token";

  function estDansIframe() {
    try {
      return window.self !== window.top;
    } catch (erreur) {
      // Accès à window.top bloqué par le navigateur = on est bien dans un iframe
      // cross-origin.
      return true;
    }
  }

  if (!estDansIframe()) return;

  function enregistrerSessionAcheteur(token, email, expiresInDays) {
    try {
      // Même clé/format que mes-commandes.js (lireSessionAcheteur) - ne pas modifier
      // sans mettre à jour ce fichier-là aussi.
      localStorage.setItem(
        CLE_TOKEN_ACHETEUR,
        JSON.stringify({
          token,
          email,
          expiresAt: Date.now() + (Number(expiresInDays) || 60) * 24 * 60 * 60 * 1000
        })
      );
    } catch (erreur) {
      // Sans conséquence : le pont ne fonctionnera simplement pas pour cette visite.
      return false;
    }
    return true;
  }

  window.addEventListener("message", (evenement) => {
    // Rejette tout message qui ne vient pas EXACTEMENT du site Wix attendu - c'est
    // la seule vraie protection ici, ne jamais l'assouplir.
    if (evenement.origin !== ORIGINE_WIX_AUTORISEE) return;
    const donnees = evenement.data;
    if (!donnees || donnees.type !== "KADOSK_BUYER_TOKEN" || !donnees.token || !donnees.email) return;

    // Si l'acheteur avait déjà une session locale valide (déjà connecté sur cette
    // page/cet appareil), on ne l'écrase pas silencieusement - inutile, et ça évite
    // de perturber une session en cours sur le même e-mail.
    let dejaConnecte = false;
    try {
      const brut = localStorage.getItem(CLE_TOKEN_ACHETEUR);
      const existant = brut ? JSON.parse(brut) : null;
      dejaConnecte = !!(existant && existant.email && Date.now() < existant.expiresAt);
    } catch (erreur) {
      dejaConnecte = false;
    }
    if (dejaConnecte) return;

    if (enregistrerSessionAcheteur(donnees.token, donnees.email, donnees.expiresInDays)) {
      document.dispatchEvent(new CustomEvent("kadosk:buyer-logged-in", { detail: { email: donnees.email } }));
    }
  });

  // Signale au parent que cette page est prête à recevoir le jeton.
  try {
    window.parent.postMessage("KADOSK_READY", ORIGINE_WIX_AUTORISEE);
  } catch (erreur) {
    // Sans conséquence : le pont ne fonctionnera simplement pas pour cette visite.
  }
})();
