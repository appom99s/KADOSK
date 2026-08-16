(function () {
  // L'authentification, la barre latérale, l'en-tête et la déconnexion sont
  // gérées par guard.js (chargé avant ce script).

  let codeCarteActuelle = null;

  const ongletScan = document.getElementById("ongletScan");
  const ongletManuel = document.getElementById("ongletManuel");
  const panneauScan = document.getElementById("panneauScan");
  const panneauManuel = document.getElementById("panneauManuel");
  const blocVideoScan = document.getElementById("blocVideoScan");
  const videoScan = document.getElementById("videoScan");
  const canvasScan = document.getElementById("canvasScan");
  const messageStatutScan = document.getElementById("messageStatutScan");
  const boutonArreterScan = document.getElementById("boutonArreterScan");
  const boutonRescanner = document.getElementById("boutonRescanner");

  const champCode = document.getElementById("champCode");
  const boutonRechercher = document.getElementById("boutonRechercher");
  const carteInfo = document.getElementById("carteInfo");
  const blocMontant = document.getElementById("blocMontant");
  const champMontant = document.getElementById("champMontant");
  const paveNumerique = document.getElementById("paveNumerique");
  const toucheEffacerPave = document.getElementById("toucheEffacerPave");
  const blocBoutonEncaisser = document.getElementById("blocBoutonEncaisser");
  const boutonEncaisser = document.getElementById("boutonEncaisser");
  const messageStatutEncaissement = document.getElementById("messageStatutEncaissement");

  if (window.KADOSK_ICONES) {
    const iconeOngletScan = document.getElementById("iconeOngletScan");
    const iconeOngletManuel = document.getElementById("iconeOngletManuel");
    if (iconeOngletScan) iconeOngletScan.innerHTML = window.KADOSK_ICONES.qr || "";
    if (iconeOngletManuel) iconeOngletManuel.innerHTML = window.KADOSK_ICONES.clavier || "";
  }

  // --- Scanner QR ---
  let fluxCamera = null;
  let idAnimationScan = null;
  let scanEnCours = false;
  // Bug trouvé : demarrerScan() n'avait aucune protection contre les appels en double.
  // Sur mobile, la fenêtre d'autorisation caméra du système fait passer la page en
  // "cachée" puis "visible" (document.hidden bascule), ce qui déclenche le listener
  // visibilitychange plus bas et relance demarrerScan() une seconde fois PENDANT que
  // le premier appel attend encore la réponse de getUserMedia. Deux négociations
  // caméra concurrentes sur le même appareil peuvent alors se sérialiser côté
  // système et prendre jusqu'à ~30 secondes avant qu'un flux utilisable arrive -
  // ce n'est donc pas le matériel qui est lent, c'est le site qui redemandait la
  // caméra une deuxième fois sans s'en rendre compte. Ces deux drapeaux empêchent
  // ce doublon et referment proprement un flux obtenu trop tard si entre-temps on a
  // demandé l'arrêt du scan.
  let demarrageEnCours = false;
  let annulationDemandee = false;
  const contexteCanvas = canvasScan.getContext("2d", { willReadFrequently: true });

  function afficherOngletScan() {
    ongletScan.classList.add("actif");
    ongletManuel.classList.remove("actif");
    panneauScan.style.display = "block";
    panneauManuel.style.display = "none";
    reinitialiserFormulaire();
    demarrerScan();
  }

  function afficherOngletManuel() {
    ongletManuel.classList.add("actif");
    ongletScan.classList.remove("actif");
    panneauManuel.style.display = "block";
    panneauScan.style.display = "none";
    arreterScan();
    reinitialiserFormulaire();
    champCode.focus();
  }

  async function demarrerScan() {
    // Empêche deux négociations caméra simultanées (voir l'explication plus haut) :
    // si un démarrage est déjà en cours, ou si la caméra tourne déjà, on ne fait rien.
    if (demarrageEnCours || fluxCamera) {
      return;
    }
    demarrageEnCours = true;
    annulationDemandee = false;

    afficherEtatCameraActive();

    if (!window.jsQR) {
      messageStatutScan.textContent = "Le scanner QR n'a pas pu se charger. Utilisez la saisie manuelle.";
      demarrageEnCours = false;
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      messageStatutScan.textContent = "La caméra n'est pas disponible sur cet appareil. Utilisez la saisie manuelle.";
      demarrageEnCours = false;
      return;
    }

    // Sur certains téléphones, l'activation peut malgré tout prendre quelques secondes
    // (matériel qui se réveille) : on affiche juste un message pour que ça ne semble
    // pas figé si ça prend du temps.
    const avertissementLenteur = setTimeout(() => {
      if (!scanEnCours) {
        messageStatutScan.textContent = "Ça prend plus de temps que prévu… (vérifiez qu'aucune autre application n'utilise la caméra)";
      }
    }, 6000);

    try {
      messageStatutScan.textContent = "Initialisation de la caméra…";
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });

      if (annulationDemandee) {
        // Le scan a été arrêté (page cachée, changement d'onglet...) pendant qu'on
        // attendait la caméra : on referme ce flux tout de suite au lieu de s'en
        // servir, pour ne jamais laisser deux flux caméra ouverts en même temps.
        flux.getTracks().forEach((piste) => piste.stop());
        return;
      }

      fluxCamera = flux;
      videoScan.srcObject = fluxCamera;
      await videoScan.play();
      messageStatutScan.textContent = "Visez le QR code de la carte cadeau.";
      scanEnCours = true;
      idAnimationScan = requestAnimationFrame(boucleScan);
    } catch (erreur) {
      messageStatutScan.textContent = "Accès à la caméra refusé ou indisponible. Utilisez la saisie manuelle.";
    } finally {
      clearTimeout(avertissementLenteur);
      demarrageEnCours = false;
    }
  }

  function arreterScan() {
    annulationDemandee = true;
    scanEnCours = false;
    if (idAnimationScan) {
      cancelAnimationFrame(idAnimationScan);
      idAnimationScan = null;
    }
    if (fluxCamera) {
      fluxCamera.getTracks().forEach((piste) => piste.stop());
      fluxCamera = null;
    }
    videoScan.srcObject = null;
  }

  // La caméra reste allumée pendant la recherche du QR code, et se coupe dès
  // qu'un code est détecté (pas de relance automatique : le marchand décide
  // quand scanner la carte suivante via le bouton "Scanner une autre carte").
  function afficherEtatCameraActive() {
    blocVideoScan.style.display = "block";
    boutonArreterScan.style.display = "inline-flex";
    boutonRescanner.style.display = "none";
  }

  function afficherEtatCameraArretee() {
    arreterScan();
    blocVideoScan.style.display = "none";
    boutonArreterScan.style.display = "none";
    boutonRescanner.style.display = "inline-flex";
  }

  function boucleScan() {
    if (!scanEnCours) return;

    if (videoScan.readyState === videoScan.HAVE_ENOUGH_DATA) {
      canvasScan.width = videoScan.videoWidth;
      canvasScan.height = videoScan.videoHeight;
      contexteCanvas.drawImage(videoScan, 0, 0, canvasScan.width, canvasScan.height);

      try {
        const imageData = contexteCanvas.getImageData(0, 0, canvasScan.width, canvasScan.height);
        const resultat = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (resultat && resultat.data) {
          const codeDetecte = resultat.data.trim();
          if (codeDetecte) {
            messageStatutScan.textContent = "Code détecté, vérification en cours…";
            afficherEtatCameraArretee();
            champCode.value = codeDetecte;
            rechercherCarte();
            return;
          }
        }
      } catch (erreur) {
        // image pas encore exploitable, on continue la boucle
      }
    }

    idAnimationScan = requestAnimationFrame(boucleScan);
  }

  ongletScan.addEventListener("click", afficherOngletScan);
  ongletManuel.addEventListener("click", afficherOngletManuel);
  boutonArreterScan.addEventListener("click", afficherOngletManuel);
  boutonRescanner.addEventListener("click", () => {
    reinitialiserFormulaire();
    demarrerScan();
  });

  window.addEventListener("beforeunload", arreterScan);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      arreterScan();
    } else if (panneauScan.style.display !== "none" && boutonRescanner.style.display === "none") {
      // On ne relance la caméra automatiquement que si elle était censée
      // être active (pas si un code vient d'être trouvé et la caméra coupée volontairement).
      demarrerScan();
    }
  });

  // --- Pavé numérique tactile (mobile uniquement) pour le montant à encaisser ---
  // Sur mobile, le champ passe en lecture seule et ce pavé prend le relais du clavier du
  // téléphone (plus rapide à utiliser à la caisse). Sur desktop, le champ reste éditable
  // normalement et le pavé reste masqué.
  const REQUETE_MOBILE_PAVE = window.matchMedia("(max-width: 520px)");
  let saisieMontantDemarree = false;

  function activerPaveNumeriqueSiMobile() {
    if (!paveNumerique) return;
    if (!REQUETE_MOBILE_PAVE.matches) {
      paveNumerique.style.display = "none";
      champMontant.readOnly = false;
      return;
    }
    paveNumerique.style.display = "grid";
    champMontant.readOnly = true;
    saisieMontantDemarree = false;
  }

  function desactiverPaveNumerique() {
    if (!paveNumerique) return;
    paveNumerique.style.display = "none";
    champMontant.readOnly = false;
    saisieMontantDemarree = false;
  }

  // Si l'écran change de taille (rotation, redimensionnement) pendant qu'un montant est
  // affiché, on réévalue si le pavé doit apparaître ou disparaître.
  REQUETE_MOBILE_PAVE.addEventListener("change", () => {
    if (blocMontant.style.display !== "none") {
      activerPaveNumeriqueSiMobile();
    }
  });

  function appuyerToucheMontant(touche) {
    // La première frappe efface le montant pré-rempli (solde de la carte) pour repartir
    // d'une saisie neuve, comme sur un terminal de caisse classique.
    let valeurActuelle = saisieMontantDemarree ? champMontant.value : "";
    saisieMontantDemarree = true;

    if (touche === ",") {
      if (valeurActuelle.includes(",")) return;
      valeurActuelle = valeurActuelle === "" ? "0," : valeurActuelle + ",";
    } else if (valeurActuelle === "0") {
      // Évite les zéros non significatifs en tête ("00", "01"...).
      valeurActuelle = touche;
    } else {
      valeurActuelle += touche;
    }

    champMontant.value = valeurActuelle;
  }

  function effacerToucheMontant() {
    const valeurActuelle = saisieMontantDemarree ? champMontant.value : "";
    champMontant.value = valeurActuelle.slice(0, -1);
    saisieMontantDemarree = true;
  }

  // Garde défensive : si cashier.html n'a pas (encore) le pavé numérique, ne pas
  // planter tout le script pour autant - un getElementById manquant ici ne doit
  // jamais empêcher les boutons "Rechercher"/"Encaisser" plus bas de fonctionner.
  if (paveNumerique) {
    paveNumerique.querySelectorAll(".kadosk-touche-pave[data-touche]").forEach((touche) => {
      touche.addEventListener("click", () => appuyerToucheMontant(touche.dataset.touche));
    });
  }
  if (toucheEffacerPave) {
    toucheEffacerPave.addEventListener("click", effacerToucheMontant);
  }

  // --- Recherche et encaissement (partagés entre scan et saisie manuelle) ---

  const LIBELLES_PORTEE = {
    UNIVERSAL: "Universelle · valable chez tous les marchands KADOSK",
    DOMAIN: "Sectorielle",
    MERCHANT_ONLY: "Réservée à un marchand spécifique"
  };

  function formaterDateCarte(valeur) {
    if (!valeur) return null;
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString("fr-FR");
  }

  function ligneInfo(label, valeur) {
    const echapper = window.KADOSK_ECHAPPER_HTML || ((v) => v);
    return (
      '<div style="display:flex; justify-content:space-between; gap:12px; padding:5px 0; font-size:13px;">' +
      '<span style="color:var(--kadosk-texte-clair);">' + echapper(label) + "</span>" +
      '<span style="font-weight:600; text-align:right;">' + echapper(valeur) + "</span>" +
      "</div>"
    );
  }

  // Sécurité : le serveur (checkGiftCardStatus) ne renvoie plus jamais une réponse
  // pour une carte qui n'appartient pas à ce marchand - il lève la même erreur que
  // pour un code inexistant (voir le catch de rechercherCarte, "Carte introuvable.").
  // afficherDetailsCarte n'est donc appelée que pour une carte autorisée.
  function afficherDetailsCarte(statut) {
    const libellePortee = statut.scope === "DOMAIN" && statut.domain
      ? LIBELLES_PORTEE.DOMAIN + " · " + statut.domain
      : (LIBELLES_PORTEE[statut.scope] || LIBELLES_PORTEE.MERCHANT_ONLY);

    const dateExpiration = formaterDateCarte(statut.expirationDate);

    let html = "";
    html += ligneInfo("Solde disponible", statut.remainingBalance + " DH");
    if (statut.initialBalance !== null && statut.initialBalance !== undefined) {
      html += ligneInfo("Montant initial", statut.initialBalance + " DH");
    }
    html += ligneInfo("Titulaire", statut.buyerName || statut.buyerEmail || "Non renseigné");
    html += ligneInfo("Expiration", dateExpiration || "Sans date d'expiration");
    html += ligneInfo("Portée", libellePortee);

    carteInfo.innerHTML = html;
  }

  function reinitialiserFormulaire() {
    champCode.value = "";
    carteInfo.style.display = "none";
    carteInfo.innerHTML = "";
    blocMontant.style.display = "none";
    blocBoutonEncaisser.style.display = "none";
    messageStatutEncaissement.textContent = "";
    codeCarteActuelle = null;
    desactiverPaveNumerique();
  }

  async function rechercherCarte() {
    const code = champCode.value.trim();
    messageStatutEncaissement.textContent = "";

    if (!code) {
      return;
    }

    carteInfo.style.display = "block";
    carteInfo.textContent = "Recherche en cours...";
    blocMontant.style.display = "none";
    blocBoutonEncaisser.style.display = "none";

    try {
      const statut = await KADOSK_API.checkGiftCard(code);

      if (statut.status === "DRAFT") {
        carteInfo.textContent = "Cette carte n'a pas encore été activée.";
        return;
      }
      if (statut.expired) {
        carteInfo.textContent = "Cette carte a expiré.";
        return;
      }
      if (statut.status !== "ACTIVE") {
        carteInfo.textContent = "Cette carte a déjà été entièrement utilisée.";
        return;
      }

      afficherDetailsCarte(statut);

      codeCarteActuelle = code;
      champMontant.value = String(statut.remainingBalance).replace(".", ",");
      blocMontant.style.display = "block";
      blocBoutonEncaisser.style.display = "flex";
      activerPaveNumeriqueSiMobile();
      if (panneauManuel.style.display !== "none" && !champMontant.readOnly) {
        champMontant.focus();
      }
    } catch (erreur) {
      codeCarteActuelle = null;
      const codeErreur = erreur && erreur.message;
      // On distingue les erreurs qui n'ont rien à voir avec "ce code n'existe pas" -
      // les confondre a déjà causé une recherche qui semblait cassée sans raison visible.
      if (codeErreur === "TROP_DE_TENTATIVES") {
        carteInfo.textContent = "Trop de tentatives de vérification. Merci de réessayer plus tard.";
      } else if (codeErreur === "MERCHANT_PLAN_NOT_ACTIVE") {
        carteInfo.textContent = "Votre abonnement KADOSK n'est pas actif. Vérifiez la section Abonnement dans Mon entreprise.";
      } else if (codeErreur === "NOT_AUTHENTICATED" || codeErreur === "MERCHANT_NOT_FOUND" || codeErreur === "MERCHANT_ROLE_NOT_ASSIGNED") {
        carteInfo.textContent = "Session expirée. Merci de vous reconnecter.";
      } else {
        carteInfo.textContent = "Carte introuvable.";
      }
    }
  }

  async function encaisser() {
    if (!codeCarteActuelle) {
      return;
    }

    const montant = Number(String(champMontant.value).replace(",", "."));
    if (!montant || montant <= 0) {
      messageStatutEncaissement.textContent = "Merci d'indiquer un montant valide.";
      return;
    }

    boutonEncaisser.disabled = true;

    try {
      const resultat = await KADOSK_API.redeemGiftCard(codeCarteActuelle, montant);

      messageStatutEncaissement.style.color = "#1faa6c";
      messageStatutEncaissement.textContent = resultat.fullyRedeemed
        ? "Encaissement de " + resultat.amountRedeemed + " DH validé. Carte entièrement utilisée."
        : "Encaissement de " + resultat.amountRedeemed + " DH validé. Solde restant : " + resultat.remainingBalance + " DH.";

      const enModeScan = panneauScan.style.display !== "none";
      reinitialiserFormulaire();
      if (enModeScan) {
        boutonRescanner.style.display = "inline-flex";
      }
    } catch (erreur) {
      messageStatutEncaissement.style.color = "";
      messageStatutEncaissement.textContent = erreur && erreur.message === "TROP_DE_TENTATIVES"
        ? "Trop de tentatives. Merci de réessayer plus tard."
        : "L'encaissement a échoué. Merci de réessayer.";
    } finally {
      boutonEncaisser.disabled = false;
    }
  }

  boutonRechercher.addEventListener("click", rechercherCarte);
  boutonEncaisser.addEventListener("click", encaisser);
  champCode.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") rechercherCarte();
  });
  champMontant.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") encaisser();
  });

  // --- Démarrage : onglet initial selon ?mode= ---
  const modeInitial = new URLSearchParams(window.location.search).get("mode");
  if (modeInitial === "manual") {
    afficherOngletManuel();
  } else {
    afficherOngletScan();
  }
})();
