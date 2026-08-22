// Certificat cadeau PDF (section 4 de l'audit) - généré CÔTÉ NAVIGATEUR (jsPDF,
// voir la balise <script> CDN dans mes-commandes.html), pour la même raison que
// invoice-pdf.js : le backend Velo classique ne supporte pas de génération PDF
// fiable. VOLONTAIREMENT décoratif : ne contient JAMAIS le code permanent de la
// carte ni de QR d'encaissement - la vraie mécanique de rachat reste le QR
// temporaire anti-rejeu (voir modalQr dans mes-commandes.js) ou le code reçu par
// email à l'activation (activateGiftCardAndSend). Ce PDF sert uniquement de
// support imprimable/partageable à offrir - jamais utilisé pour valider un
// encaissement en caisse.
const KADOSK_CARTE_CADEAU_PDF = (function () {
  function formaterDate(valeur) {
    if (!valeur) return "";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    } catch (erreur) {
      return "";
    }
  }

  function telecharger(carte) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.error("jsPDF non chargé - impossible de générer le PDF.");
      alert("Le générateur de PDF n'a pas pu se charger. Merci de réessayer.");
      return;
    }
    const { jsPDF } = window.jspdf;
    // Format paysage, proportions proches d'une vraie carte cadeau physique.
    const doc = new jsPDF({ unit: "mm", format: [210, 120], orientation: "landscape" });

    // Fond dégradé simulé par bandes (jsPDF ne supporte pas les vrais dégradés
    // sans plugin) - palette KADOSK par défaut, en attendant la sélection de
    // template par marchand (GiftCardTemplateId, voir Phase 4 de l'audit).
    const COULEUR_HAUT = [17, 24, 39];
    const COULEUR_BAS = [79, 70, 229];
    const largeur = 210;
    const hauteur = 120;
    const etapes = 40;
    for (let i = 0; i < etapes; i++) {
      const t = i / (etapes - 1);
      const r = Math.round(COULEUR_HAUT[0] + (COULEUR_BAS[0] - COULEUR_HAUT[0]) * t);
      const g = Math.round(COULEUR_HAUT[1] + (COULEUR_BAS[1] - COULEUR_HAUT[1]) * t);
      const b = Math.round(COULEUR_HAUT[2] + (COULEUR_BAS[2] - COULEUR_HAUT[2]) * t);
      doc.setFillColor(r, g, b);
      doc.rect(0, (hauteur / etapes) * i, largeur, hauteur / etapes + 0.5, "F");
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("KADOSK", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(230, 230, 240);
    doc.text("CARTE CADEAU", 14, 21);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text(carte.businessName || "—", 14, 45);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    doc.text((carte.amount !== undefined && carte.amount !== null ? Number(carte.amount).toLocaleString("fr-FR") : "—") + " DH", 14, 65);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(230, 230, 240);
    let yInfos = 78;
    if (!carte.forSelf && carte.recipientName) {
      doc.text("À l'attention de : " + carte.recipientName, 14, yInfos);
      yInfos += 6;
    }
    if (carte.message) {
      const lignesMessage = doc.splitTextToSize(carte.message, 120);
      doc.text(lignesMessage, 14, yInfos);
      yInfos += lignesMessage.length * 5;
    }

    doc.setFontSize(8);
    doc.setTextColor(210, 210, 225);
    const infosBas = [];
    if (carte.expirationDate) infosBas.push("Valable jusqu'au " + formaterDate(carte.expirationDate));
    infosBas.push("Réf. commande : " + (carte.orderNumber || "—"));
    doc.text(infosBas.join("   ·   "), 14, hauteur - 10);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(220, 220, 235);
    doc.text(
      "Ce document est un aperçu cadeau, pas un instrument d'encaissement : utilisez le QR depuis votre espace",
      largeur - 96,
      hauteur - 16
    );
    doc.text("« Mes commandes » KADOSK, ou le code reçu par e-mail, pour l'utiliser en magasin.", largeur - 96, hauteur - 12);

    doc.save("Carte-cadeau-" + (carte.businessName || "KADOSK").replace(/[^a-z0-9]+/gi, "-") + ".pdf");
  }

  return { telecharger };
})();
