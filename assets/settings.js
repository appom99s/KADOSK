(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "login.html";
    return;
  }

  KADOSK_NAV.rendreBarreLaterale("kadoskSidebar");
  KADOSK_NAV.rendreEnteteDroite("kadoskEnteteDroite");

  const champNom = document.getElementById("champNom");
  const champDescription = document.getElementById("champDescription");
  const champLogoUrl = document.getElementById("champLogoUrl");
  const champScope = document.getElementById("champScope");
  const blocDomaine = document.getElementById("blocDomaine");
  const champDomaine = document.getElementById("champDomaine");
  const champMontants = document.getElementById("champMontants");
  const champMontantLibreActif = document.getElementById("champMontantLibreActif");
  const blocMontantLibre = document.getElementById("blocMontantLibre");
  const champMontantLibreMin = document.getElementById("champMontantLibreMin");
  const champMontantLibreMax = document.getElementById("champMontantLibreMax");
  const champExpiration = document.getElementById("champExpiration");
  const boutonEnregistrer = document.getElementById("boutonEnregistrer");
  const messageStatutParametres = document.getElementById("messageStatutParametres");
  const lienReinitialiserLogo = document.getElementById("lienReinitialiserLogo");

  const apercuLogoMarchand = document.getElementById("apercuLogoMarchand");
  const blocLogoMarchand = apercuLogoMarchand ? apercuLogoMarchand.parentElement : null;
  const apercuTitreCarte = document.getElementById("apercuTitreCarte");
  const apercuMontantCarte = document.getElementById("apercuMontantCarte");

  let logoEntrepriseParDefaut = "";

  document.getElementById("lienDeconnexion").addEventListener("click", () => {
    KADOSK_AUTH.deconnecter();
  });

  function actualiserVisibilite() {
    blocDomaine.style.display = champScope.value === "DOMAIN" ? "block" : "none";
    blocMontantLibre.style.display = champMontantLibreActif.checked ? "block" : "none";
  }

  function actualiserApercu() {
    if (!apercuLogoMarchand) return;

    const logoUrl = champLogoUrl.value.trim();
    if (logoUrl) {
      apercuLogoMarchand.src = logoUrl;
      apercuLogoMarchand.style.display = "block";
      blocLogoMarchand.classList.add("a-un-logo");
    } else {
      apercuLogoMarchand.style.display = "none";
      blocLogoMarchand.classList.remove("a-un-logo");
    }

    apercuTitreCarte.textContent = champNom.value.trim() || "Nom de la carte cadeau";

    const premierMontant = champMontants.value
      .split(",")
      .map((valeur) => Number(valeur.trim()))
      .find((nombre) => !isNaN(nombre) && nombre > 0);
    apercuMontantCarte.textContent = premierMontant
      ? premierMontant.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
      : (champMontantLibreMin.value || "100");
  }

  async function chargerParametres() {
    try {
      const parametres = await KADOSK_API.getOfferSettings();

      champNom.value = parametres.name || "";
      champDescription.value = parametres.description || "";
      champLogoUrl.value = parametres.logoUrl || "";
      champScope.value = parametres.scope || "MERCHANT_ONLY";
      champDomaine.value = parametres.domain || "";
      champMontants.value = parametres.presetAmounts || "";
      champMontantLibreActif.checked = !!parametres.freeAmountEnabled;
      champMontantLibreMin.value = parametres.freeAmountMin || "";
      champMontantLibreMax.value = parametres.freeAmountMax || "";
      champExpiration.value = parametres.expirationMonths || 0;
      logoEntrepriseParDefaut = parametres.businessLogoUrl || "";

      actualiserVisibilite();
      actualiserApercu();
    } catch (erreur) {
      console.error("Erreur chargement paramètres offre :", erreur);
      messageStatutParametres.textContent = "Impossible de charger vos paramètres actuels.";
    }
  }

  async function enregistrerParametres() {
    messageStatutParametres.textContent = "";

    if (!champNom.value.trim()) {
      messageStatutParametres.textContent = "Le nom de la carte cadeau est obligatoire.";
      return;
    }

    boutonEnregistrer.disabled = true;

    try {
      await KADOSK_API.saveOfferSettings({
        name: champNom.value.trim(),
        description: champDescription.value.trim(),
        logoUrl: champLogoUrl.value.trim(),
        scope: champScope.value,
        domain: champDomaine.value.trim(),
        presetAmounts: champMontants.value.trim(),
        freeAmountEnabled: champMontantLibreActif.checked,
        freeAmountMin: champMontantLibreMin.value ? Number(champMontantLibreMin.value) : null,
        freeAmountMax: champMontantLibreMax.value ? Number(champMontantLibreMax.value) : null,
        expirationMonths: Number(champExpiration.value) || 0
      });

      messageStatutParametres.style.color = "#1faa6c";
      messageStatutParametres.textContent = "Paramètres enregistrés.";
    } catch (erreur) {
      console.error("Erreur enregistrement paramètres offre :", erreur);
      messageStatutParametres.style.color = "";
      messageStatutParametres.textContent = "Échec de l'enregistrement. Vérifiez vos champs.";
    } finally {
      boutonEnregistrer.disabled = false;
    }
  }

  champScope.addEventListener("change", actualiserVisibilite);
  champMontantLibreActif.addEventListener("change", actualiserVisibilite);
  boutonEnregistrer.addEventListener("click", enregistrerParametres);

  [champNom, champLogoUrl, champMontants, champMontantLibreMin].forEach((champ) => {
    champ.addEventListener("input", actualiserApercu);
  });

  if (lienReinitialiserLogo) {
    lienReinitialiserLogo.addEventListener("click", (evenement) => {
      evenement.preventDefault();
      champLogoUrl.value = logoEntrepriseParDefaut;
      actualiserApercu();
    });
  }

  chargerParametres();
})();
