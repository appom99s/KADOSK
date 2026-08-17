// Favoris (modèle "suivi par email", pas de compte acheteur - voir doc
// d'architecture) : stockés uniquement en local sur cet appareil/navigateur, aucune
// synchronisation serveur. C'est une vraie limite (les favoris ne suivent pas
// l'acheteur d'un appareil à l'autre) mais cohérente avec le choix fait pour ce
// parcours (pas de mot de passe, pas de compte) - à revoir si un compte acheteur
// complet est ajouté plus tard.
const KADOSK_FAVORIS = (function () {
  const CLE_STOCKAGE = "kadosk_favoris_v2";

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

  function estFavori(merchantId) {
    return lire().includes(merchantId);
  }

  function basculer(merchantId) {
    const ids = lire();
    const index = ids.indexOf(merchantId);
    if (index === -1) {
      ids.push(merchantId);
    } else {
      ids.splice(index, 1);
    }
    ecrire(ids);
    return ids.includes(merchantId);
  }

  function retirer(merchantId) {
    ecrire(lire().filter((id) => id !== merchantId));
  }

  return { lire, estFavori, basculer, retirer };
})();
