// Génération de la facture KADOSK -> marchand (HT/TVA/TTC) en PDF, entièrement
// CÔTÉ NAVIGATEUR (jsPDF, chargé en CDN par la page hôte - voir la balise
// <script> dans finance.html/admin-finance.html). Volontairement PAS de
// génération PDF côté backend Velo : ce backend (voir giftCardSecurity.web.js)
// ne supporte ni Buffer ni la plupart des libs PDF Node (même contrainte que
// pour le chiffrement, voir les commentaires en tête de ce fichier) - un rendu
// entièrement client est donc le choix le plus fiable, pas un raccourci.
// Les montants HT/TVA/TTC affichés viennent TOUJOURS de la ligne Invoices déjà
// figée côté serveur (enregistrerCommissionEtFacture) - ce module ne fait que
// les mettre en page, il ne recalcule jamais rien.
const KADOSK_FACTURE_PDF = (function () {
  function formaterMontant(valeur) {
    if (valeur === undefined || valeur === null) return "0,00";
    return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formaterDate(valeur) {
    if (!valeur) return "—";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "—";
    }
  }

  function telecharger(facture) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.error("jsPDF non chargé - impossible de générer le PDF.");
      alert("Le générateur de PDF n'a pas pu se charger. Merci de réessayer.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margeGauche = 20;
    let y = 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(20, 20, 20);
    doc.text("KADOSK", margeGauche, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Marketplace de cartes cadeaux — ICE/RC : à compléter", margeGauche, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text("FACTURE", 150, y, { align: "left" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("N° " + (facture.invoiceNumber || "—"), 150, y + 7);
    doc.text("Date : " + formaterDate(facture.createdAt), 150, y + 13);

    y += 28;
    doc.setDrawColor(220, 220, 220);
    doc.line(margeGauche, y, 190, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Facturé à", margeGauche, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(facture.merchantName || "—", margeGauche, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Réf. commande : " + (facture.orderNumber || "—"), margeGauche, y);

    y += 14;
    // En-tête du tableau (1 seule ligne : commission KADOSK sur la commande).
    doc.setFillColor(245, 245, 245);
    doc.rect(margeGauche, y, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Désignation", margeGauche + 2, y + 5.5);
    doc.text("Montant HT", 120, y + 5.5, { align: "right" });
    doc.text("TVA", 150, y + 5.5, { align: "right" });
    doc.text("Montant TTC", 188, y + 5.5, { align: "right" });

    y += 8;
    doc.setDrawColor(230, 230, 230);
    doc.rect(margeGauche, y, 170, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text("Commission KADOSK sur commande " + (facture.orderNumber || "—"), margeGauche + 2, y + 6.5);
    doc.text(formaterMontant(facture.montantHT) + " DH", 120, y + 6.5, { align: "right" });
    doc.text((facture.tauxTVA !== undefined && facture.tauxTVA !== null ? facture.tauxTVA : "—") + " %", 150, y + 6.5, { align: "right" });
    doc.text(formaterMontant(facture.montantTTC) + " DH", 188, y + 6.5, { align: "right" });

    y += 20;
    const ligneTotaux = [
      ["Total HT", formaterMontant(facture.montantHT) + " DH"],
      ["TVA (" + (facture.tauxTVA !== undefined && facture.tauxTVA !== null ? facture.tauxTVA : "—") + " %)", formaterMontant(facture.montantTVA) + " DH"],
      ["Total TTC", formaterMontant(facture.montantTTC) + " DH"]
    ];
    ligneTotaux.forEach(([label, valeur], index) => {
      const gras = index === ligneTotaux.length - 1;
      doc.setFont("helvetica", gras ? "bold" : "normal");
      doc.setFontSize(gras ? 11 : 9);
      doc.setTextColor(gras ? 20 : 90, gras ? 20 : 90, gras ? 20 : 90);
      doc.text(label, 150, y, { align: "right" });
      doc.text(valeur, 188, y, { align: "right" });
      y += gras ? 8 : 6;
    });

    y += 14;
    doc.setDrawColor(220, 220, 220);
    doc.line(margeGauche, y, 190, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      "TVA appliquée sur la commission KADOSK uniquement (pas sur la valeur faciale de la carte cadeau).",
      margeGauche,
      y
    );
    doc.text("Document généré automatiquement - ne constitue pas une pièce comptable officielle tant que les mentions légales KADOSK ne sont pas complétées.", margeGauche, y + 5);

    doc.save("Facture-" + (facture.invoiceNumber || "KADOSK") + ".pdf");
  }

  return { telecharger };
})();
