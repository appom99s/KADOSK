// ---------------------------------------------------------------------------
// Pont optionnel avec le site Wix principal, pour le cas où une page KADOSK
// (boutique.html, etape-4-destinataire.html, mes-commandes.html...) est intégrée
// dans une page Wix via l'élément "HTML iframe" (Embed a Site). Objectif : si le
// visiteur est déjà connecté en tant que membre Wix sur le site parent, pré-remplir
// son e-mail ici par confort, pour lui éviter de le retaper.
//
// IMPORTANT - ce que ce script NE FAIT PAS :
// - Il ne prouve RIEN au serveur. Un postMessage venant de la page parente n'est
//   pas vérifiable cryptographiquement côté backend - n'importe quelle page pourrait
//   prétendre être "connectée en tant que untel@email.com". C'est donc UNIQUEMENT du
//   confort de saisie (pré-remplissage d'un champ), jamais une preuve d'identité.
// - "Mes commandes" continue d'exiger le code à 6 chiffres reçu par e-mail
//   (demanderCodeCommandes / confirmerCodeCommandes) avant de renvoyer la moindre
//   donnée de commande ou d'autoriser la génération d'un QR temporaire - voir
//   giftCardSecurity.web.js. Ce pont ne contourne jamais cette vérification.
// - Si la page n'est PAS chargée dans un iframe (visite directe du domaine KADOSK,
//   cas normal), ce script ne fait rien.
//
// Mise en place côté Wix (une fois, dans l'Éditeur Wix, sur la page qui contient
// l'élément HTML iframe) :
//   1. Ajouter l'élément "Intégrer un site" (HTML iframe), pointer son "src" vers la
//      page KADOSK concernée (ex. .../etape-4-destinataire.html), lui donner un ID
//      (ex. htmlBoutique).
//   2. Dans le code de la page Wix (panneau Velo), coller :
//
//        import { currentMember } from 'wix-members-frontend';
//
//        $w.onReady(async function () {
//          $w('#htmlBoutique').onMessage((event) => {
//            if (event.data !== 'KADOSK_READY') return;
//            currentMember.getMember()
//              .then((member) => {
//                if (!member) return;
//                $w('#htmlBoutique').postMessage({
//                  type: 'KADOSK_WIX_MEMBER',
//                  email: member.loginEmail || '',
//                  firstName: (member.contactDetails && member.contactDetails.firstName) || ''
//                });
//              })
//              .catch(() => {});
//          });
//        });
//
//   (Le "KADOSK_READY" évite une course : on n'envoie l'e-mail qu'une fois la page
//   KADOSK prête à le recevoir, plutôt qu'à l'aveugle au chargement du parent.)
// ---------------------------------------------------------------------------
(function () {
  // À REMPLACER par le domaine RÉEL du site Wix qui embarque ces pages - jamais "*"
  // (voir avertissement officiel Wix : un targetOrigin/origin générique permettrait à
  // n'importe quel site tiers d'envoyer ou d'intercepter ce message).
  const ORIGINE_WIX_AUTORISEE = "https://www.kadosk.com";

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

  window.addEventListener("message", (evenement) => {
    // Rejette tout message qui ne vient pas EXACTEMENT du site Wix attendu - c'est
    // la seule vraie protection ici, ne jamais l'assouplir.
    if (evenement.origin !== ORIGINE_WIX_AUTORISEE) return;
    const donnees = evenement.data;
    if (!donnees || donnees.type !== "KADOSK_WIX_MEMBER") return;

    window.KADOSK_WIX_MEMBER = {
      email: String(donnees.email || "").trim(),
      firstName: String(donnees.firstName || "").trim()
    };
    document.dispatchEvent(new CustomEvent("kadosk:wix-member", { detail: window.KADOSK_WIX_MEMBER }));
  });

  // Signale au parent que cette page est prête à recevoir l'identité du membre.
  try {
    window.parent.postMessage("KADOSK_READY", ORIGINE_WIX_AUTORISEE);
  } catch (erreur) {
    // Sans conséquence : le pont ne fonctionnera simplement pas pour cette visite.
  }
})();
