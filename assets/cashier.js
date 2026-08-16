(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "login.html";
    return;
  }

  KADOSK_NAV.rendreBarreLaterale("kadoskSidebar");
  KADOSK_NAV.rendreEnteteDroite("kadoskEnteteDroite");

  let codeCarteActuelle = null;

  const ongletScan = document.getElementById("ongletScan");
  const ongletManuel = document.getElementById("ongletManuel");
  const panneauScan = document.getElementById("panneauScan");
  const panneauManuel = document.getElementById("panneauManuel");
  const videoScan = document.getElementById("videoScan");
  const canvasScan = document.getElementById("canvasScan");
  const messageStatutScan = document.getElementById("messageStatutScan");
  const boutonArreterScan = document.getElementById("boutonArreterScan");

  const champCode = document.getElementById("champCode");
  const boutonRechercher = document.getElementById("boutonRechercher");
  const carteInfo = document.getElementById("carteInfo");
  const blocMontant = document.getElementById("blocMontant");
  const champMontant = document.getElementById("champMontant");
  const blocBoutonEncaisser = document.getElementById("blocBoutonEncaisser");
  const boutonEncaisser = document.getElementById("boutonEncaisser");
  const messageStatutEncaissement = document.getElementById("messageStatutEncaissement");

  document.getElementById("lienDeconnexion").addEventListener("click", () => {
    KADOSK_AUTH.deconnecter();
  });

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
    if (!window.jsQR) {
      messageStatutScan.textContent = "Le scanner QR n'a pas pu se charger. Utilisez la saisie manuelle.";
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      messageStatutScan.textContent = "La caméra n'est pas disponible sur cet appareil. Utilisez la saisie manuelle.";
      return;
    }

    try {
      messageStatutScan.textContent = "Initialisation de la caméra…";
      fluxCamera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      videoScan.srcObject = fluxCamera;
      await videoScan.play();
      messageStatutScan.textContent = "Visez le QR code de la carte cadeau.";
      scanEnCours = true;
      idAnimationScan = requestAnimationFrame(boucleScan);
    } catch (erreur) {
      messageStatutScan.textContent = "Accès à la caméra refusé ou indisponible. Utilisez la saisie manuelle.";
    }
  }

  function arreterScan() {
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
            scanEnCours = false;
            messageStatutScan.textContent = "Code détecté, vérification en cours…";
            arreterScan();
            champCode.value = codeDetecte;
            rechercherCarte().finally(() => {
              messageStatutScan.textContent = "Visez le QR code de la carte cadeau.";
              scanEnCours = true;
              demarrerScan();
            });
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

  window.addEventListener("beforeunload", arreterScan);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      arreterScan();
    } else if (panneauScan.style.display !== "none") {
      demarrerScan();
    }
  });

  // --- Recherche et encaissement (partagés entre scan et saisie manuelle) ---

  function reinitialiserFormulaire() {
    champCode.value = "";
    carteInfo.style.display = "none";
    blocMontant.style.display = "none";
    blocBoutonEncaisser.style.display = "none";
    messageStatutEncaissement.textContent = "";
    codeCarteActuelle = null;
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

      codeCarteActuelle = code;
      carteInfo.textContent = "Solde disponible : " + statut.remainingBalance + " DH";
      champMontant.value = statut.remainingBalance;
      blocMontant.style.display = "block";
      blocBoutonEncaisser.style.display = "flex";
      if (panneauManuel.style.display !== "none") {
        champMontant.focus();
      }
    } catch (erreur) {
      codeCarteActuelle = null;
      const codeErreur = erreur && erreur.message;
      carteInfo.textContent = codeErreur === "TROP_DE_TENTATIVES"
        ? "Trop de tentatives de vérification. Merci de réessayer plus tard."
        : "Carte introuvable.";
    }
  }

  async function encaisser() {
    if (!codeCarteActuelle) {
      return;
    }

    const montant = Number(champMontant.value);
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

      reinitialiserFormulaire();
    } catch (erreur) {
      messageStatutEncaissement.style.color = "";
      messageStatutEncaissement.textContent = "L'encaissement a échoué. Merci de réessayer.";
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
