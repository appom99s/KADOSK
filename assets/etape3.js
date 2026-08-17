(function () {
  const etatVide = document.getElementById("etatVide");
  const etatChargement = document.getElementById("etatChargement");
  const etatErreur = document.getElementById("etatErreur");
  const listeRib = document.getElementById("listeRib");
  const blocTotal = document.getElementById("blocTotal");
  const texteTotal = document.getElementById("texteTotal");
  const btnRetour = document.getElementById("btnRetour");
  const btnContinuer = document.getElementById("btnContinuer");

  document.getElementById("k2IconeRetour").innerHTML = window.KADOSK_ICONE("arrow-left");
  document.getElementById("k2IconeContinuer").innerHTML = window.KADOSK_ICONE("arrow-right");
  document.getElementById("k2IconeSecurite").innerHTML = window.KADOSK_ICONE("shield-check");

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }

  function rendreLogo(logoUrl, nom) {
    return logoUrl
      ? `<img src="${echapperHtml(logoUrl)}" alt="${echapperHtml(nom)}" />`
      : `<span>${echapperHtml((nom || "?").slice(0, 1).toUpperCase())}</span>`;
  }

  function blocLigneRib(label, valeur) {
    const idUnique = "rib_" + Math.random().toString(36).slice(2, 9);
    return `
      <div class="k2-rib-label">${label}</div>
      <div class="k2-rib-valeur" id="${idUnique}">${echapperHtml(valeur)}</div>
      <button type="button" class="k2-btn-copier" data-copier="${idUnique}">${window.KADOSK_ICONE("copy")} Copier</button>
    `;
  }

  async function rendreBlocMarchand(ligne) {
    let offre;
    try {
      offre = await KADOSK_API.getGiftCardOffer(ligne.merchantId);
    } catch (erreur) {
      return null;
    }

    const sousTotal = (Number(ligne.montant) || 0) * (Number(ligne.quantite) || 1);
    const div = document.createElement("div");
    div.className = "k2-rib-bloc";
    div.innerHTML = `
      <div class="k2-rib-entete">
        <div class="k2-rib-marchand">
          <div class="k2-rib-marchand-logo">${rendreLogo(offre.logoUrl, offre.businessName)}</div>
          <span>${echapperHtml(offre.businessName)}</span>
        </div>
        <div class="k2-rib-montant">${formaterMontant(sousTotal)}</div>
      </div>
      <div class="k2-rib-table">
        ${offre.paymentRibHolderName ? blocLigneRib("Titulaire", offre.paymentRibHolderName) : ""}
        ${offre.paymentBankName ? blocLigneRib("Banque", offre.paymentBankName) : ""}
        ${offre.paymentRib ? blocLigneRib("RIB", offre.paymentRib) : ""}
      </div>
      ${!offre.paymentRib ? '<p style="font-size:12px;color:var(--k2-danger);margin-top:8px;">Coordonnées de paiement momentanément indisponibles pour ce marchand.</p>' : ""}
    `;

    div.querySelectorAll("[data-copier]").forEach((bouton) => {
      bouton.addEventListener("click", async () => {
        const texte = document.getElementById(bouton.dataset.copier).textContent;
        try {
          await navigator.clipboard.writeText(texte);
          const libelleOriginal = bouton.innerHTML;
          bouton.innerHTML = `${window.KADOSK_ICONE("check")} Copié`;
          setTimeout(() => (bouton.innerHTML = libelleOriginal), 1500);
        } catch (erreur) {
          console.error("Copie impossible :", erreur);
        }
      });
    });

    return div;
  }

  async function charger() {
    const lignes = KADOSK_PANIER2.lire();
    if (lignes.length === 0) {
      etatChargement.style.display = "none";
      etatVide.style.display = "block";
      btnContinuer.disabled = true;
      return;
    }
    if (!KADOSK_PANIER2.toutesLignesOntUnMontant()) {
      window.location.href = "etape-2-montant.html";
      return;
    }

    try {
      for (const ligne of lignes) {
        const bloc = await rendreBlocMarchand(ligne);
        if (bloc) listeRib.appendChild(bloc);
      }
      etatChargement.style.display = "none";
      blocTotal.style.display = "flex";
      texteTotal.textContent = formaterMontant(KADOSK_PANIER2.totalGeneral());
    } catch (erreur) {
      console.error("Erreur chargement récapitulatif :", erreur);
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Impossible de charger les informations de paiement.";
    }
  }

  btnRetour.addEventListener("click", () => {
    window.location.href = "etape-2-montant.html";
  });
  btnContinuer.addEventListener("click", () => {
    window.location.href = "etape-4-destinataire.html";
  });

  charger();
})();
