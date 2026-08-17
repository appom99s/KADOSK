// Panier du NOUVEAU parcours public en 5 étapes (étape-1 à étape-5, favoris,
// mes-commandes). Clé localStorage DIFFÉRENTE de assets/panier.js (kadosk_panier_v2
// au lieu de kadosk_panier_public) : on ne réutilise pas l'ancien module, qui autorise
// plusieurs lignes par marchand (un montant choisi dès l'ajout). Ici le modèle est
// différent et volontairement plus simple : UNE ligne par marchand sélectionné,
// created sans montant à l'étape 1 (le montant n'est choisi qu'à l'étape 2). Séparer
// les deux clés évite tout mélange avec l'ancien parcours (fiche-marchand.html /
// panier.html), qui reste en place tel quel.
const KADOSK_PANIER2 = (function () {
  const CLE_STOCKAGE = "kadosk_panier_v2";
  const CLE_DESTINATAIRE = "kadosk_destinataire_v2";

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
      console.error("KADOSK_PANIER2 : impossible d'enregistrer le panier :", erreur);
    }
    mettreAJourBadges();
  }

  // Étape 1 : sélectionner une carte (sans montant pour l'instant). N'ajoute rien si
  // le marchand est déjà sélectionné.
  function selectionner(marchand) {
    const lignes = lire();
    if (lignes.some((l) => l.merchantId === marchand.merchantId)) {
      return lignes;
    }
    lignes.push({
      merchantId: marchand.merchantId,
      businessName: marchand.businessName || marchand.name || "",
      name: marchand.name || marchand.businessName || "",
      logoUrl: marchand.logoUrl || "",
      category: marchand.category || "",
      accentColor: marchand.accentColor || "teal",
      montant: null,
      quantite: 1
    });
    ecrire(lignes);
    return lignes;
  }

  function deselectionner(merchantId) {
    const lignes = lire().filter((l) => l.merchantId !== merchantId);
    ecrire(lignes);
    return lignes;
  }

  function estSelectionne(merchantId) {
    return lire().some((l) => l.merchantId === merchantId);
  }

  function definirMontant(merchantId, montant) {
    const lignes = lire();
    const ligne = lignes.find((l) => l.merchantId === merchantId);
    if (!ligne) return lignes;
    ligne.montant = Number(montant) > 0 ? Number(montant) : null;
    ecrire(lignes);
    return lignes;
  }

  function definirQuantite(merchantId, quantite) {
    const lignes = lire();
    const ligne = lignes.find((l) => l.merchantId === merchantId);
    if (!ligne) return lignes;
    ligne.quantite = Math.max(1, Math.min(20, Math.floor(Number(quantite) || 1)));
    ecrire(lignes);
    return lignes;
  }

  function retirer(merchantId) {
    return deselectionner(merchantId);
  }

  function vider() {
    ecrire([]);
    try {
      localStorage.removeItem(CLE_DESTINATAIRE);
    } catch (erreur) {
      // sans conséquence
    }
  }

  function compterArticles() {
    return lire().length;
  }

  function toutesLignesOntUnMontant() {
    const lignes = lire();
    return lignes.length > 0 && lignes.every((l) => Number(l.montant) > 0);
  }

  function totalGeneral() {
    return lire().reduce((total, l) => total + (Number(l.montant) || 0) * (Number(l.quantite) || 1), 0);
  }

  // Format attendu par le backend (creerCommandeMultiMarchand) : uniquement des
  // intentions (marchand/montant affiché/quantité) - jamais un sous-total ou un total,
  // recalculés côté serveur avant toute écriture.
  function articlesPourCommande() {
    return lire().map((l) => ({
      merchantId: l.merchantId,
      amount: Number(l.montant),
      quantity: Number(l.quantite) || 1
    }));
  }

  // Destinataire + message (étape 4) : saisis une seule fois pour tout le panier,
  // conservés séparément du panier lui-même le temps de la navigation entre étapes.
  function enregistrerDestinataire({ buyerEmail, recipientName, recipientEmail, message }) {
    try {
      localStorage.setItem(
        CLE_DESTINATAIRE,
        JSON.stringify({ buyerEmail: buyerEmail || "", recipientName: recipientName || "", recipientEmail: recipientEmail || "", message: message || "" })
      );
    } catch (erreur) {
      console.error("KADOSK_PANIER2 : impossible d'enregistrer le destinataire :", erreur);
    }
  }

  function lireDestinataire() {
    try {
      const brut = localStorage.getItem(CLE_DESTINATAIRE);
      return brut ? JSON.parse(brut) : { buyerEmail: "", recipientName: "", recipientEmail: "", message: "" };
    } catch (erreur) {
      return { buyerEmail: "", recipientName: "", recipientEmail: "", message: "" };
    }
  }

  function mettreAJourBadges() {
    const total = compterArticles();
    document.querySelectorAll("[data-panier-badge]").forEach((el) => {
      el.textContent = String(total);
      el.style.display = total > 0 ? "" : "none";
    });
  }

  return {
    lire,
    selectionner,
    deselectionner,
    estSelectionne,
    definirMontant,
    definirQuantite,
    retirer,
    vider,
    compterArticles,
    toutesLignesOntUnMontant,
    totalGeneral,
    articlesPourCommande,
    enregistrerDestinataire,
    lireDestinataire,
    mettreAJourBadges
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  KADOSK_PANIER2.mettreAJourBadges();
});
