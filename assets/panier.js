// Panier public KADOSK (boutique.html / fiche-marchand.html / panier.html) : état
// stocké en localStorage côté navigateur, PAS de connexion requise. Peut contenir
// des cartes de plusieurs marchands différents (chacun avec son propre RIB, géré
// à l'étape du checkout dans panier.html).
const KADOSK_PANIER = (function () {
  const CLE_STOCKAGE = "kadosk_panier_public";

  function genererId() {
    return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function lire() {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE);
      const lignes = brut ? JSON.parse(brut) : [];
      return Array.isArray(lignes) ? lignes : [];
    } catch (erreur) {
      return [];
    }
  }

  function ecrire(lignes) {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(lignes));
    } catch (erreur) {
      console.error("KADOSK_PANIER : impossible d'enregistrer le panier :", erreur);
    }
    mettreAJourBadges();
  }

  // Ajoute une carte au panier. Si une ligne identique existe déjà pour le même
  // marchand et le même montant, on augmente simplement sa quantité au lieu de
  // dupliquer une ligne.
  function ajouter({ merchantId, businessName, logoUrl, montant, quantite }) {
    const lignes = lire();
    const quantiteAAjouter = Math.max(1, Number(quantite) || 1);
    const montantNombre = Number(montant);

    const ligneExistante = lignes.find(
      (l) => l.merchantId === merchantId && l.montant === montantNombre
    );

    if (ligneExistante) {
      ligneExistante.quantite += quantiteAAjouter;
    } else {
      lignes.push({
        id: genererId(),
        merchantId,
        businessName: businessName || "",
        logoUrl: logoUrl || "",
        montant: montantNombre,
        quantite: quantiteAAjouter
      });
    }

    ecrire(lignes);
    return lignes;
  }

  function retirer(id) {
    const lignes = lire().filter((l) => l.id !== id);
    ecrire(lignes);
    return lignes;
  }

  function modifierQuantite(id, quantite) {
    const lignes = lire();
    const ligne = lignes.find((l) => l.id === id);
    if (!ligne) return lignes;

    const nouvelleQuantite = Math.max(0, Math.floor(Number(quantite) || 0));
    if (nouvelleQuantite <= 0) {
      return retirer(id);
    }
    ligne.quantite = nouvelleQuantite;
    ecrire(lignes);
    return lignes;
  }

  function vider() {
    ecrire([]);
  }

  function compterArticles() {
    return lire().reduce((total, l) => total + l.quantite, 0);
  }

  // Regroupe les lignes par marchand, pratique pour l'affichage du récap et pour
  // le checkout (une commande distincte doit être créée par marchand/montant).
  function grouperParMarchand() {
    const lignes = lire();
    const groupes = new Map();

    lignes.forEach((ligne) => {
      if (!groupes.has(ligne.merchantId)) {
        groupes.set(ligne.merchantId, {
          merchantId: ligne.merchantId,
          businessName: ligne.businessName,
          logoUrl: ligne.logoUrl,
          lignes: []
        });
      }
      groupes.get(ligne.merchantId).lignes.push(ligne);
    });

    return Array.from(groupes.values());
  }

  function totalGeneral() {
    return lire().reduce((total, l) => total + l.montant * l.quantite, 0);
  }

  // Met à jour tout élément portant l'attribut data-panier-badge présent sur la
  // page courante (compteur d'articles dans l'en-tête), s'il y en a un.
  function mettreAJourBadges() {
    const total = compterArticles();
    document.querySelectorAll("[data-panier-badge]").forEach((el) => {
      el.textContent = String(total);
      el.style.display = total > 0 ? "" : "none";
    });
  }

  return {
    lire,
    ajouter,
    retirer,
    modifierQuantite,
    vider,
    compterArticles,
    grouperParMarchand,
    totalGeneral,
    mettreAJourBadges
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  KADOSK_PANIER.mettreAJourBadges();
});
