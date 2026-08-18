// Favoris (modèle "suivi par email", pas de compte acheteur - voir doc
// d'architecture) : stockés en local sur cet appareil/navigateur (source de vérité
// immédiate, fonctionne même sans jamais avoir donné d'email), ET synchronisés au
// serveur (collection Favorites, voir getFavoris/toggleFavori) dès qu'un email a été
// "identifié" quelque part dans le parcours (mes-commandes, étape 4 destinataire,
// panier.html) - à ce moment-là seulement, les favoris peuvent suivre l'acheteur
// d'un appareil à l'autre. Tant qu'aucun email n'est identifié, tout reste local
// uniquement, comme avant.
const KADOSK_FAVORIS = (function () {
  const CLE_STOCKAGE = "kadosk_favoris_v2";
  const CLE_EMAIL = "kadosk_email_identifie";

  function lire() {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      const ids = brut ? JSON.parse(brut) : [];
      return Array.isArray(ids) ? ids : [];
    } catch (erreur) {
      return [];
    }
  }

  function ecrire(ids) {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(ids));
    } catch (erreur) {
      console.error("KADOSK_FAVORIS : impossible d'enregistrer :", erreur);
    }
  }

  function lireEmailIdentifie() {
    try {
      return localStorage.getItem(CLE_EMAIL) || "";
    } catch (erreur) {
      return "";
    }
  }

  // Appelée dès qu'un email acheteur est saisi/confirmé ailleurs dans le parcours
  // (pas une inscription - juste "on sait maintenant qui navigue"). Best-effort :
  // ne bloque jamais l'appelant si le stockage échoue.
  function enregistrerEmailIdentifie(email) {
    const propre = String(email || "").trim().toLowerCase();
    if (!propre) return;
    try {
      localStorage.setItem(CLE_EMAIL, propre);
    } catch (erreur) {
      // sans conséquence : le reste continue de fonctionner en local uniquement.
    }
  }

  function estFavori(merchantId) {
    return lire().includes(merchantId);
  }

  function basculer(merchantId) {
    const ids = lire();
    const index = ids.indexOf(merchantId);
    const maintenantFavori = index === -1;
    if (maintenantFavori) {
      ids.push(merchantId);
    } else {
      ids.splice(index, 1);
    }
    ecrire(ids);

    // Synchro serveur best-effort (fire-and-forget) : ne retarde jamais le retour
    // de basculer(), qui doit rester instantané pour l'UI (bouton cœur).
    const email = lireEmailIdentifie();
    if (email && window.KADOSK_API) {
      KADOSK_API.toggleFavori(email, merchantId).catch((erreur) => {
        console.error("KADOSK_FAVORIS : synchro serveur échouée pour", merchantId, erreur);
      });
    }

    return maintenantFavori;
  }

  function retirer(merchantId) {
    ecrire(lire().filter((id) => id !== merchantId));
    const email = lireEmailIdentifie();
    if (email && window.KADOSK_API) {
      KADOSK_API.toggleFavori(email, merchantId).catch((erreur) => {
        console.error("KADOSK_FAVORIS : synchro serveur échouée pour", merchantId, erreur);
      });
    }
  }

  // À appeler au chargement d'une page qui affiche les favoris (favoris.html,
  // accueil.html) : si un email est identifié, fusionne les favoris serveur dans le
  // stockage local (union, jamais de suppression locale) pour que les favoris
  // ajoutés sur un autre appareil apparaissent ici aussi. Best-effort, silencieux en
  // cas d'échec (les favoris locaux restent affichés tels quels).
  async function synchroniser() {
    const email = lireEmailIdentifie();
    if (!email || !window.KADOSK_API) return lire();
    try {
      const resultat = await KADOSK_API.getFavoris(email);
      const idsServeur = (resultat && resultat.merchantIds) || [];
      const idsLocaux = lire();
      const fusion = Array.from(new Set([...idsLocaux, ...idsServeur]));
      if (fusion.length !== idsLocaux.length) {
        ecrire(fusion);
      }
      return fusion;
    } catch (erreur) {
      console.error("KADOSK_FAVORIS : synchronisation serveur échouée :", erreur);
      return lire();
    }
  }

  return { lire, estFavori, basculer, retirer, lireEmailIdentifie, enregistrerEmailIdentifie, synchroniser };
})();
