(function () {
  // L'authentification, la barre latérale, l'en-tête et la déconnexion sont
  // gérées par guard.js (chargé avant ce script).

  const champNom = document.getElementById("champNom");
  const champDescription = document.getElementById("champDescription");
  const champLogoUrl = document.getElementById("champLogoUrl");
  const choixCouleurAccent = document.getElementById("choixCouleurAccent");
  const pastillesCouleur = choixCouleurAccent ? Array.from(choixCouleurAccent.querySelectorAll(".kadosk-pastille-couleur")) : [];
  let accentColorSelectionnee = "teal";
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

  const carteApercu = document.getElementById("carteApercu");

  function selectionnerCouleurAccent(couleur) {
    accentColorSelectionnee = couleur;
    pastillesCouleur.forEach((pastille) => {
      pastille.classList.toggle("selectionnee", pastille.dataset.couleur === couleur);
    });
    if (carteApercu) {
      carteApercu.dataset.accent = couleur;
    }
  }

  pastillesCouleur.forEach((pastille) => {
    pastille.addEventListener("click", () => selectionnerCouleurAccent(pastille.dataset.couleur));
  });

  function actualiserVisibilite() {
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
      selectionnerCouleurAccent(parametres.accentColor || "teal");
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
        accentColor: accentColorSelectionnee,
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
