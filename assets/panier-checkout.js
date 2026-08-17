(function () {
  const etatVide = document.getElementById("etatVide");
  const contenuPanier = document.getElementById("contenuPanier");
  const listeGroupes = document.getElementById("listeGroupes");
  const texteTotal = document.getElementById("texteTotal");
  const inputEmail = document.getElementById("inputEmail");
  const inputNom = document.getElementById("inputNom");
  const inputMessage = document.getElementById("inputMessage");
  const btnValiderCommande = document.getElementById("btnValiderCommande");
  const messageCommande = document.getElementById("messageCommande");
  const resultatCommande = document.getElementById("resultatCommande");

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formaterMontant(valeur) {
    return Number(valeur).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " MAD";
  }

  function afficherPanier() {
    const groupes = KADOSK_PANIER.grouperParMarchand();

    if (groupes.length === 0) {
      etatVide.style.display = "block";
      contenuPanier.style.display = "none";
      return;
    }

    etatVide.style.display = "none";
    contenuPanier.style.display = "block";

    listeGroupes.innerHTML = groupes
      .map(
        (groupe) => `
      <div class="kadosk-panier-groupe">
        <div class="kadosk-panier-groupe-entete">
          ${groupe.logoUrl ? `<img src="${echapperHtml(groupe.logoUrl)}" alt="" />` : ""}
          <strong>${echapperHtml(groupe.businessName)}</strong>
        </div>
        ${groupe.lignes
          .map(
            (ligne) => `
          <div class="kadosk-panier-ligne" data-id="${ligne.id}">
            <span>${formaterMontant(ligne.montant)} × </span>
            <input type="number" min="1" max="20" value="${ligne.quantite}" class="kadosk-panier-quantite" data-id="${ligne.id}" />
            <span class="kadosk-panier-sous-total">${formaterMontant(ligne.montant * ligne.quantite)}</span>
            <button type="button" class="kadosk-panier-retirer" data-id="${ligne.id}" title="Retirer">✕</button>
          </div>
        `
          )
          .join("")}
      </div>
    `
      )
      .join("");

    texteTotal.textContent = formaterMontant(KADOSK_PANIER.totalGeneral());

    listeGroupes.querySelectorAll(".kadosk-panier-retirer").forEach((bouton) => {
      bouton.addEventListener("click", () => {
        KADOSK_PANIER.retirer(bouton.dataset.id);
        afficherPanier();
      });
    });

    listeGroupes.querySelectorAll(".kadosk-panier-quantite").forEach((input) => {
      input.addEventListener("change", () => {
        KADOSK_PANIER.modifierQuantite(input.dataset.id, input.value);
        afficherPanier();
      });
    });
  }

  async function validerCommande() {
    const email = inputEmail.value.trim();
    const nom = inputNom.value.trim();
    const message = inputMessage.value.trim();

    messageCommande.textContent = "";

    if (!email) {
      messageCommande.textContent = "Merci d'indiquer votre email.";
      return;
    }

    const groupes = KADOSK_PANIER.grouperParMarchand();
    if (groupes.length === 0) return;

    btnValiderCommande.disabled = true;
    btnValiderCommande.textContent = "Traitement en cours...";

    const resultatsParMarchand = [];
    const idsReussis = [];

    for (const groupe of groupes) {
      const resultatGroupe = { businessName: groupe.businessName, lignesReussies: [], lignesEchouees: [] };

      for (const ligne of groupe.lignes) {
        try {
          await KADOSK_API.placeOrder(groupe.merchantId, ligne.montant, email, nom, ligne.quantite, message);
          resultatGroupe.lignesReussies.push(ligne);
          idsReussis.push(ligne.id);
        } catch (erreur) {
          console.error("Erreur commande pour", groupe.businessName, erreur);
          resultatGroupe.lignesEchouees.push({ ligne, erreur: (erreur && erreur.message) || "ERREUR_INCONNUE" });
        }
      }

      if (resultatGroupe.lignesReussies.length > 0) {
        try {
          const offre = await KADOSK_API.getGiftCardOffer(groupe.merchantId);
          resultatGroupe.paiement = {
            rib: offre.paymentRib,
            bankName: offre.paymentBankName,
            ribHolderName: offre.paymentRibHolderName,
            address: offre.paymentAddress
          };
        } catch (erreur) {
          // Le RIB n'a pas pu être re-chargé pour l'affichage - la commande est
          // quand même enregistrée côté marchand, on l'indique simplement.
          resultatGroupe.paiementIndisponible = true;
        }
      }

      resultatsParMarchand.push(resultatGroupe);
    }

    // On retire du panier uniquement les lignes effectivement commandées avec
    // succès - les échecs restent dans le panier pour que le client puisse
    // réessayer sans tout ressaisir.
    idsReussis.forEach((id) => KADOSK_PANIER.retirer(id));

    afficherResultat(resultatsParMarchand);
    afficherPanier();

    btnValiderCommande.disabled = false;
    btnValiderCommande.textContent = "Valider la commande";
  }

  function afficherResultat(resultatsParMarchand) {
    const auMoinsUnSucces = resultatsParMarchand.some((r) => r.lignesReussies.length > 0);

    if (!auMoinsUnSucces) {
      messageCommande.textContent = "Aucune commande n'a pu être enregistrée. Vérifiez votre panier et réessayez.";
      return;
    }

    resultatCommande.style.display = "block";
    resultatCommande.innerHTML = `
      <h2 class="kadosk-public-titre">Commande enregistrée</h2>
      <p class="kadosk-message-info">Effectuez les virements ci-dessous. Chaque marchand vous enverra votre/vos carte(s) une fois le paiement confirmé.</p>
      ${resultatsParMarchand
        .filter((r) => r.lignesReussies.length > 0)
        .map((r) => {
          const totalMarchand = r.lignesReussies.reduce((t, l) => t + l.montant * l.quantite, 0);
          const instructions = r.paiement && r.paiement.rib
            ? `
            <p><strong>Bénéficiaire :</strong> ${echapperHtml(r.paiement.ribHolderName)}</p>
            ${r.paiement.bankName ? `<p><strong>Banque :</strong> ${echapperHtml(r.paiement.bankName)}</p>` : ""}
            <p><strong>RIB :</strong> ${echapperHtml(r.paiement.rib)}</p>
            ${r.paiement.address ? `<p><strong>Adresse :</strong> ${echapperHtml(r.paiement.address)}</p>` : ""}
          `
            : `<p>Le marchand n'a pas encore renseigné de RIB - contactez-le directement pour connaître les modalités de paiement.</p>`;

          return `
          <div class="kadosk-carte-info">
            <h3>${echapperHtml(r.businessName)} — ${formaterMontant(totalMarchand)}</h3>
            ${instructions}
            ${
              r.lignesEchouees.length > 0
                ? `<p class="kadosk-message-erreur">${r.lignesEchouees.length} ligne(s) de cette commande n'ont pas pu être enregistrées et restent dans votre panier.</p>`
                : ""
            }
          </div>
        `;
        })
        .join("")}
    `;

    document.getElementById("formulaireAcheteur").style.display = "none";
  }

  btnValiderCommande.addEventListener("click", validerCommande);

  afficherPanier();
})();
