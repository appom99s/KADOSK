(function () {
  const parametres = new URLSearchParams(window.location.search);
  const merchantId = parametres.get("merchantId");

  const etatChargement = document.getElementById("etatChargement");
  const etatErreur = document.getElementById("etatErreur");
  const sectionOffre = document.getElementById("sectionOffre");

  const logoMarchand = document.getElementById("logoMarchand");
  const nomBoutique = document.getElementById("nomBoutique");
  const nomCarte = document.getElementById("nomCarte");
  const descriptionCarte = document.getElementById("descriptionCarte");
  const texteExpiration = document.getElementById("texteExpiration");
  const boutonsMontants = document.getElementById("boutonsMontants");
  const blocMontantLibre = document.getElementById("blocMontantLibre");
  const checkboxMontantLibre = document.getElementById("checkboxMontantLibre");
  const inputMontantLibre = document.getElementById("inputMontantLibre");
  const btnMoins = document.getElementById("btnMoins");
  const btnPlus = document.getElementById("btnPlus");
  const texteQuantite = document.getElementById("texteQuantite");
  const btnAjouterPanier = document.getElementById("btnAjouterPanier");
  const messageAjout = document.getElementById("messageAjout");

  const QUANTITE_MIN = 1;
  const QUANTITE_MAX = 20;

  let offre = null;
  let montantSelectionne = null;
  let montantLibreActif = false;
  let quantite = 1;

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function majBoutonAjouter() {
    btnAjouterPanier.disabled = !montantSelectionne || montantSelectionne <= 0;
  }

  function selectionnerMontant(montant, boutonElement) {
    montantSelectionne = montant;
    montantLibreActif = false;
    checkboxMontantLibre.checked = false;
    inputMontantLibre.style.display = "none";
    document.querySelectorAll(".kadosk-montant-bouton").forEach((b) => b.classList.remove("actif"));
    if (boutonElement) boutonElement.classList.add("actif");
    majBoutonAjouter();
  }

  async function charger() {
    if (!merchantId) {
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Lien invalide : commerce introuvable.";
      return;
    }

    try {
      offre = await KADOSK_API.getGiftCardOffer(merchantId);

      etatChargement.style.display = "none";
      sectionOffre.style.display = "block";

      if (offre.logoUrl) {
        logoMarchand.innerHTML = `<img src="${echapperHtml(offre.logoUrl)}" alt="${echapperHtml(offre.businessName)}" />`;
      } else {
        logoMarchand.innerHTML = `<span>${echapperHtml((offre.businessName || "?").slice(0, 1).toUpperCase())}</span>`;
      }

      nomBoutique.textContent = offre.businessName;
      nomCarte.textContent = offre.name;
      descriptionCarte.textContent = offre.description || "";
      texteExpiration.textContent =
        offre.expirationMonths > 0
          ? `Valable ${offre.expirationMonths} mois à compter de l'achat`
          : "Ne périme jamais";

      boutonsMontants.innerHTML = (offre.presetAmounts || [])
        .map((montant) => `<button type="button" class="kadosk-montant-bouton" data-montant="${montant}">${montant} MAD</button>`)
        .join("");

      boutonsMontants.querySelectorAll(".kadosk-montant-bouton").forEach((bouton) => {
        bouton.addEventListener("click", () => selectionnerMontant(Number(bouton.dataset.montant), bouton));
      });

      if (offre.freeAmountEnabled) {
        blocMontantLibre.style.display = "block";
        inputMontantLibre.placeholder = `Entre ${offre.freeAmountMin} et ${offre.freeAmountMax} MAD`;
      }
    } catch (erreur) {
      console.error("Erreur chargement offre :", erreur);
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Ce commerce n'accepte pas de commande de carte cadeau pour le moment.";
    }
  }

  checkboxMontantLibre.addEventListener("change", () => {
    if (checkboxMontantLibre.checked) {
      montantLibreActif = true;
      montantSelectionne = null;
      inputMontantLibre.style.display = "block";
      document.querySelectorAll(".kadosk-montant-bouton").forEach((b) => b.classList.remove("actif"));
      majBoutonAjouter();
    } else {
      montantLibreActif = false;
      inputMontantLibre.style.display = "none";
      majBoutonAjouter();
    }
  });

  inputMontantLibre.addEventListener("input", () => {
    if (!montantLibreActif) return;
    const valeur = Number(inputMontantLibre.value);
    montantSelectionne = valeur > 0 ? valeur : null;
    majBoutonAjouter();
  });

  btnMoins.addEventListener("click", () => {
    if (quantite > QUANTITE_MIN) {
      quantite -= 1;
      texteQuantite.textContent = String(quantite);
    }
  });

  btnPlus.addEventListener("click", () => {
    if (quantite < QUANTITE_MAX) {
      quantite += 1;
      texteQuantite.textContent = String(quantite);
    }
  });

  btnAjouterPanier.addEventListener("click", () => {
    if (!montantSelectionne || montantSelectionne <= 0) return;

    if (montantLibreActif && (montantSelectionne < offre.freeAmountMin || montantSelectionne > offre.freeAmountMax)) {
      messageAjout.textContent = `Le montant doit être entre ${offre.freeAmountMin} et ${offre.freeAmountMax} MAD.`;
      messageAjout.style.color = "var(--kadosk-danger)";
      return;
    }

    KADOSK_PANIER.ajouter({
      merchantId,
      businessName: offre.businessName,
      logoUrl: offre.logoUrl,
      montant: montantSelectionne,
      quantite
    });

    messageAjout.style.color = "var(--kadosk-vert)";
    messageAjout.innerHTML = `Ajouté au panier. <a href="panier.html">Voir mon panier</a> ou continuez vos achats.`;
  });

  charger();
})();
