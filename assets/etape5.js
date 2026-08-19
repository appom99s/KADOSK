(function () {
  const blocConfirmation = document.getElementById("blocConfirmation");
  const etatIntrouvable = document.getElementById("etatIntrouvable");
  const texteNumeroCommande = document.getElementById("texteNumeroCommande");
  const listeRecapFinal = document.getElementById("listeRecapFinal");
  const texteTotalFinal = document.getElementById("texteTotalFinal");
  const texteEmailDestinataire = document.getElementById("texteEmailDestinataire");

  document.getElementById("k2IconeSucces").innerHTML = window.KADOSK_ICONE("check-circle");

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }

  function afficherCommande(commande) {
    blocConfirmation.style.display = "block";
    etatIntrouvable.style.display = "none";

    texteNumeroCommande.textContent = commande.orderNumber || "";
    texteEmailDestinataire.textContent = commande.forSelf ? "votre adresse" : commande.recipientEmail || "";

    listeRecapFinal.innerHTML = (commande.merchants || [])
      .map(
        (m) => `
      <div class="k2-confirmation-ligne">
        <span>${echapperHtml(m.businessName)}${m.quantity > 1 ? " × " + m.quantity : ""}</span>
        <span>${formaterMontant(m.subtotal)}</span>
      </div>`
      )
      .join("");

    texteTotalFinal.textContent = formaterMontant(commande.totalAmount);
  }

  let commande = null;
  try {
    const brut = sessionStorage.getItem("kadosk_derniere_commande");
    commande = brut ? JSON.parse(brut) : null;
  } catch (erreur) {
    commande = null;
  }

  if (commande && commande.orderNumber) {
    afficherCommande(commande);
  } else {
    etatIntrouvable.style.display = "block";
  }
})();
