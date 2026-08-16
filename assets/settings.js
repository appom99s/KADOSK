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
  const boutonUploaderLogo = document.getElementById("boutonUploaderLogo");
  const champFichierLogo = document.getElementById("champFichierLogo");
  const apercuLogoActuelImg = document.getElementById("apercuLogoActuelImg");
  const messageStatutLogo = document.getElementById("messageStatutLogo");

  const TYPES_LOGO_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  const TAILLE_LOGO_MAX_OCTETS = 5 * 1024 * 1024;

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

  function mettreAJourApercuLogoActuel() {
    if (!apercuLogoActuelImg) return;
    const url = champLogoUrl.value.trim();
    if (url) {
      apercuLogoActuelImg.src = url;
      apercuLogoActuelImg.style.display = "block";
    } else {
      apercuLogoActuelImg.style.display = "none";
    }
  }

  async function televerserLogo(fichier) {
    messageStatutLogo.style.color = "";
    messageStatutLogo.textContent = "";

    if (!fichier) return;

    if (!TYPES_LOGO_ACCEPTES.includes(fichier.type)) {
      messageStatutLogo.textContent = "Format non supporté (PNG, JPEG, WEBP ou SVG uniquement).";
      return;
    }
    if (fichier.size > TAILLE_LOGO_MAX_OCTETS) {
      messageStatutLogo.textContent = "Fichier trop volumineux (5 Mo maximum).";
      return;
    }

    boutonUploaderLogo.disabled = true;
    boutonUploaderLogo.textContent = "Envoi en cours…";

    try {
      const { uploadUrl } = await KADOSK_API.getMediaUploadUrl(fichier.name, fichier.type, fichier.size);

      const reponse = await fetch(uploadUrl + "?filename=" + encodeURIComponent(fichier.name), {
        method: "PUT",
        headers: { "Content-Type": fichier.type },
        body: fichier
      });

      if (!reponse.ok) {
        throw new Error("ECHEC_UPLOAD");
      }

      const resultat = await reponse.json();
      const urlFinale = resultat && resultat.file && resultat.file.url;
      if (!urlFinale) {
        throw new Error("REPONSE_UPLOAD_INATTENDUE");
      }

      champLogoUrl.value = urlFinale;
      mettreAJourApercuLogoActuel();
      actualiserApercu();
      messageStatutLogo.style.color = "#1faa6c";
      messageStatutLogo.textContent = "Logo envoyé. Pensez à Enregistrer pour appliquer.";
    } catch (erreur) {
      console.error("Erreur upload logo :", erreur);
      messageStatutLogo.textContent = "Échec de l'envoi du logo. Merci de réessayer.";
    } finally {
      boutonUploaderLogo.disabled = false;
      boutonUploaderLogo.textContent = "Choisir une image…";
      champFichierLogo.value = "";
    }
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
      mettreAJourApercuLogoActuel();
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

  [champNom, champMontants, champMontantLibreMin].forEach((champ) => {
    champ.addEventListener("input", actualiserApercu);
  });

  if (boutonUploaderLogo && champFichierLogo) {
    boutonUploaderLogo.addEventListener("click", () => champFichierLogo.click());
    champFichierLogo.addEventListener("change", () => televerserLogo(champFichierLogo.files[0]));
  }

  if (lienReinitialiserLogo) {
    lienReinitialiserLogo.addEventListener("click", (evenement) => {
      evenement.preventDefault();
      champLogoUrl.value = logoEntrepriseParDefaut;
      mettreAJourApercuLogoActuel();
      actualiserApercu();
    });
  }

  chargerParametres();
})();
