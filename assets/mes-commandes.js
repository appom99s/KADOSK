(function () {
  const inputEmail = document.getElementById("inputEmail");
  const btnRechercher = document.getElementById("btnRechercher");
  const messageErreur = document.getElementById("messageErreur");
  const etatChargement = document.getElementById("etatChargement");
  const etatVide = document.getElementById("etatVide");
  const listeCommandes = document.getElementById("listeCommandes");

  const carteEmail = document.getElementById("carteRecherche");
  const carteCode = document.getElementById("carteCode");
  const inputCode = document.getElementById("inputCode");
  const btnValiderCode = document.getElementById("btnValiderCode");
  const btnRenvoyerCode = document.getElementById("btnRenvoyerCode");
  const btnChangerEmail = document.getElementById("btnChangerEmail");
  const texteEmailCode = document.getElementById("texteEmailCode");
  const messageErreurCode = document.getElementById("messageErreurCode");
  const carteConnecte = document.getElementById("carteConnecte");
  const texteEmailConnecte = document.getElementById("texteEmailConnecte");
  const btnDeconnecter = document.getElementById("btnDeconnecter");

  document.getElementById("k2IconeMail").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeRecherche").innerHTML = window.KADOSK_ICONE("search");

  // ---------------------------------------------------------------------------
  // Identité acheteur : "Mes commandes" ne demande pas de mot de passe, mais prouve
  // désormais la possession de l'e-mail via un code à 6 chiffres envoyé par email
  // (giftCardSecurity.web.js : demanderCodeCommandes/confirmerCodeCommandes), au lieu
  // de transmettre l'e-mail tel quel comme avant (visible dans l'URL/les logs). Le
  // jeton obtenu après vérification est conservé UNIQUEMENT sur cet appareil
  // (localStorage) - jamais de session ni de compte côté serveur.
  // ---------------------------------------------------------------------------
  const CLE_TOKEN = "kadosk_buyer_token";

  function lireSessionAcheteur() {
    try {
      const brut = localStorage.getItem(CLE_TOKEN);
      if (!brut) return null;
      const donnees = JSON.parse(brut);
      if (!donnees || !donnees.token || !donnees.email || !donnees.expiresAt) return null;
      if (Date.now() > donnees.expiresAt) {
        localStorage.removeItem(CLE_TOKEN);
        return null;
      }
      return donnees;
    } catch (erreur) {
      return null;
    }
  }

  function enregistrerSessionAcheteur(token, email, expiresInDays) {
    try {
      localStorage.setItem(
        CLE_TOKEN,
        JSON.stringify({
          token,
          email,
          expiresAt: Date.now() + (Number(expiresInDays) || 60) * 24 * 60 * 60 * 1000
        })
      );
    } catch (erreur) {
      // sans conséquence : la recherche fonctionnera quand même pour cette visite
    }
  }

  function effacerSessionAcheteur() {
    try {
      localStorage.removeItem(CLE_TOKEN);
    } catch (erreur) {
      // sans conséquence
    }
  }

  let emailEnCoursDeVerification = "";

  function afficherEtapeEmail() {
    carteEmail.style.display = "block";
    carteCode.style.display = "none";
    carteConnecte.style.display = "none";
    listeCommandes.innerHTML = "";
    etatVide.style.display = "none";
  }

  function afficherEtapeCode(email) {
    emailEnCoursDeVerification = email;
    texteEmailCode.textContent = email;
    carteEmail.style.display = "none";
    carteCode.style.display = "block";
    carteConnecte.style.display = "none";
    messageErreurCode.style.display = "none";
    inputCode.value = "";
  }

  function afficherConnecte(email) {
    carteEmail.style.display = "none";
    carteCode.style.display = "none";
    carteConnecte.style.display = "block";
    texteEmailConnecte.textContent = email;
  }

  // ---------------------------------------------------------------------------
  // QR temporaire (30s, anti-rejeu) : chaque ligne de commande déjà acceptée par le
  // marchand (identifiée par orderItemId, renvoyé par getOrderByNumber) peut afficher
  // un QR qui se renouvelle automatiquement - voir KADOSK_API.getQrTemporaire /
  // giftCardSecurity.web.js. Le code permanent n'est jamais transmis ni affiché ici.
  // ---------------------------------------------------------------------------
  const modalQr = document.getElementById("modalQr");
  const btnFermerQr = document.getElementById("btnFermerQr");
  const qrCanvasZone = document.getElementById("qrCanvasZone");
  const qrEtatTexte = document.getElementById("qrEtatTexte");

  let minuteurQr = null;
  let instanceQr = null;

  function chargerLibQRCode() {
    if (window.QRCode) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function arreterRafraichissementQr() {
    if (minuteurQr) {
      clearInterval(minuteurQr);
      minuteurQr = null;
    }
  }

  function fermerModalQr() {
    arreterRafraichissementQr();
    modalQr.style.display = "none";
  }

  btnFermerQr.addEventListener("click", fermerModalQr);
  modalQr.addEventListener("click", (evenement) => {
    if (evenement.target === modalQr) fermerModalQr();
  });

  async function rafraichirQr(orderItemId, token) {
    try {
      const resultat = await KADOSK_API.getQrTemporaire(orderItemId, token);

      if (!instanceQr) {
        qrCanvasZone.innerHTML = "";
        instanceQr = new window.QRCode(qrCanvasZone, {
          text: resultat.payload,
          width: 200,
          height: 200,
          colorDark: "#1f3a34",
          colorLight: "#ffffff"
        });
      } else {
        instanceQr.clear();
        instanceQr.makeCode(resultat.payload);
      }

      qrEtatTexte.textContent = `Renouvellement dans ${resultat.expiresInSeconds}s...`;
    } catch (erreur) {
      console.error("Erreur génération QR temporaire :", erreur);
      const message =
        erreur && erreur.message === "GIFT_CARD_EXPIRED"
          ? "Cette carte a expiré."
          : erreur && erreur.message === "GIFT_CARD_ALREADY_REDEEMED"
          ? "Cette carte a déjà été entièrement utilisée."
          : erreur && erreur.message === "GIFT_CARD_NOT_ACTIVATED"
          ? "Cette carte n'a pas encore été activée."
          : "Impossible d'afficher le QR pour le moment.";
      qrCanvasZone.innerHTML = "";
      qrEtatTexte.textContent = message;
      arreterRafraichissementQr();
    }
  }

  async function ouvrirModalQr(orderItemId, token) {
    instanceQr = null;
    qrCanvasZone.innerHTML = '<div class="k2-spinner"></div>';
    qrEtatTexte.textContent = "";
    modalQr.style.display = "flex";

    try {
      await chargerLibQRCode();
    } catch (erreur) {
      qrCanvasZone.innerHTML = "";
      qrEtatTexte.textContent = "Impossible de charger le générateur de QR.";
      return;
    }

    await rafraichirQr(orderItemId, token);
    arreterRafraichissementQr();
    // Un cran plus fréquent que les 30s du pas TOTP, pour ne jamais laisser un QR
    // expiré affiché plus de quelques secondes à l'écran.
    minuteurQr = setInterval(() => rafraichirQr(orderItemId, token), 5000);
  }

  function emailValide(valeur) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valeur || "").trim());
  }

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }

  function formaterDate(valeur) {
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    } catch (erreur) {
      return "";
    }
  }

  const LIBELLES_STATUT = {
    DRAFT: { texte: "En attente de paiement", classe: "k2-badge-draft" },
    ACTIVE: { texte: "Confirmée", classe: "k2-badge-active" },
    PARTIAL: { texte: "Partiellement confirmée", classe: "k2-badge-partial" },
    REFUSED: { texte: "Refusée", classe: "k2-badge-refused" },
    EXPIRED: { texte: "Expirée", classe: "k2-badge-expired" }
  };

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function rendreLigneCommande(commande, token) {
    const statutInfo = LIBELLES_STATUT[commande.status] || LIBELLES_STATUT.DRAFT;

    const div = document.createElement("div");
    div.className = "k2-carte";
    div.style.marginBottom = "12px";
    div.style.cursor = "pointer";
    div.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div>
          <div style="font-family:'SFMono-Regular',Consolas,monospace; font-weight:800; font-size:14px;">${echapperHtml(commande.orderNumber)}</div>
          <div style="font-size:12px; color:var(--k2-texte-clair); margin-top:2px;">${formaterDate(commande.createdAt)} — ${commande.itemsCount} carte(s)</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; font-size:15px;">${formaterMontant(commande.totalAmount)}</div>
          <span class="k2-badge ${statutInfo.classe}">${statutInfo.texte}</span>
        </div>
      </div>
      <div class="k2-detail-commande" style="display:none; margin-top:14px; padding-top:14px; border-top:1px solid var(--k2-bordure);"></div>
    `;

    const zoneDetail = div.querySelector(".k2-detail-commande");
    let detailCharge = false;

    div.addEventListener("click", async () => {
      const visible = zoneDetail.style.display !== "none";
      if (visible) {
        zoneDetail.style.display = "none";
        return;
      }
      zoneDetail.style.display = "block";
      if (detailCharge) return;

      zoneDetail.textContent = "Chargement du détail...";
      try {
        const detail = await KADOSK_API.getOrderByNumber(commande.orderNumber, token);
        zoneDetail.innerHTML =
          (detail.merchants || [])
            .map((m) => {
              const nomAffiche = m.cardName && m.cardName !== m.businessName ? `${m.cardName} (${m.businessName})` : m.businessName;
              const cartes = m.cards || [];
              const boutonsQr = cartes
                .map((carte, index) => {
                  const suffixe = cartes.length > 1 ? " (carte " + (index + 1) + ")" : "";
                  // Carte offerte à quelqu'un d'autre : jamais de bouton QR ici - l'acheteur
                  // ne doit pas pouvoir utiliser le QR du destinataire de son propre cadeau
                  // (le serveur bloque déjà l'appel, voir genererCodeQRTemporaire, mais on
                  // évite même de proposer un bouton qui échouerait silencieusement).
                  if (!carte.forSelf) {
                    return `<span class="k2-badge k2-badge-cadeau">🎁 Envoyée à ${echapperHtml(carte.recipientName || "")}${suffixe}</span>`;
                  }
                  if (carte.redeemed) {
                    // Carte entièrement utilisée : pas de QR à générer - le solde réel
                    // n'est jamais affiché ici, seulement ce badge "utilisée".
                    return `<span class="k2-badge k2-badge-utilisee">Carte utilisée${suffixe}</span>`;
                  }
                  return `<button type="button" class="k2-qr-bouton-ligne" data-orderitemid="${echapperHtml(carte.orderItemId)}">${window.KADOSK_ICONE ? window.KADOSK_ICONE("qr-code") : ""} Voir le QR${suffixe}</button>`;
                })
                .join("");
              return `
          <div class="k2-confirmation-ligne" style="align-items:flex-start;">
            <span>${echapperHtml(nomAffiche)}${m.quantity > 1 ? " × " + m.quantity : ""}<br />${boutonsQr}</span>
            <span>${formaterMontant(m.subtotal)}</span>
          </div>`;
            })
            .join("") +
          (detail.forSelf
            ? ""
            : `<div style="font-size:12px; color:var(--k2-texte-clair); margin-top:10px;">Destinataire : ${echapperHtml(detail.recipientName)} (${echapperHtml(detail.recipientEmail)})</div>`);

        zoneDetail.querySelectorAll("[data-orderitemid]").forEach((bouton) => {
          bouton.addEventListener("click", (evenement) => {
            evenement.stopPropagation();
            ouvrirModalQr(bouton.dataset.orderitemid, token);
          });
        });

        detailCharge = true;
      } catch (erreur) {
        zoneDetail.textContent = "Impossible de charger le détail de cette commande.";
      }
    });

    return div;
  }

  async function chargerCommandes(session) {
    listeCommandes.innerHTML = "";
    etatVide.style.display = "none";
    etatChargement.style.display = "block";

    try {
      const resultat = await KADOSK_API.getOrdersByEmail(session.token);
      const commandes = resultat.items || [];
      etatChargement.style.display = "none";

      if (commandes.length === 0) {
        etatVide.style.display = "block";
        return;
      }

      commandes.forEach((c) => listeCommandes.appendChild(rendreLigneCommande(c, session.token)));
    } catch (erreur) {
      etatChargement.style.display = "none";
      // Un jeton invalide/expiré ne devrait normalement pas arriver avant l'échéance
      // affichée, mais si le serveur le rejette on revient proprement à l'étape email
      // plutôt que d'afficher une erreur générique en boucle.
      if (erreur && (erreur.message === "JETON_INVALIDE" || erreur.message === "JETON_EXPIRE")) {
        effacerSessionAcheteur();
        afficherEtapeEmail();
        messageErreur.textContent = "Votre session a expiré, merci de redemander un code.";
        messageErreur.style.display = "block";
        return;
      }
      console.error("Erreur recherche commandes :", erreur);
      messageErreur.textContent = "Une erreur est survenue, merci de réessayer.";
      messageErreur.style.display = "block";
    }
  }

  // Si la page est intégrée dans un site Wix via iframe et que le visiteur est déjà
  // membre Wix connecté (voir assets/wix-bridge.js), on pré-remplit juste le champ
  // e-mail par confort - le code à 6 chiffres reste toujours exigé, ce pont ne
  // dispense jamais de la vérification (voir demanderCodeCommandes/
  // confirmerCodeCommandes côté serveur).
  function preremplirEmailSiConnuDeWix(email) {
    if (email && !inputEmail.value.trim()) {
      inputEmail.value = email;
    }
  }
  document.addEventListener("kadosk:wix-member", (evenement) => {
    if (evenement.detail) preremplirEmailSiConnuDeWix(evenement.detail.email);
  });

  async function demarrerConnexion() {
    const session = lireSessionAcheteur();
    if (session) {
      afficherConnecte(session.email);
      await chargerCommandes(session);
    } else {
      afficherEtapeEmail();
      if (window.KADOSK_WIX_MEMBER) {
        preremplirEmailSiConnuDeWix(window.KADOSK_WIX_MEMBER.email);
      }
    }
  }

  async function demanderCode() {
    const email = inputEmail.value.trim();
    messageErreur.style.display = "none";

    if (!emailValide(email)) {
      messageErreur.textContent = "Merci de saisir un e-mail valide.";
      messageErreur.style.display = "block";
      return;
    }

    btnRechercher.disabled = true;
    const libelleOriginal = btnRechercher.innerHTML;
    btnRechercher.innerHTML = "Envoi en cours...";

    try {
      await KADOSK_API.demanderCodeCommandes(email);
      afficherEtapeCode(email);
    } catch (erreur) {
      console.error("Erreur demande code :", erreur);
      messageErreur.textContent = "Une erreur est survenue, merci de réessayer.";
      messageErreur.style.display = "block";
    } finally {
      btnRechercher.disabled = false;
      btnRechercher.innerHTML = libelleOriginal;
    }
  }

  async function validerCode() {
    const code = inputCode.value.trim();
    messageErreurCode.style.display = "none";

    if (!/^\d{6}$/.test(code)) {
      messageErreurCode.textContent = "Merci de saisir le code à 6 chiffres reçu par e-mail.";
      messageErreurCode.style.display = "block";
      return;
    }

    btnValiderCode.disabled = true;
    const libelleOriginal = btnValiderCode.innerHTML;
    btnValiderCode.innerHTML = "Vérification...";

    try {
      const resultat = await KADOSK_API.confirmerCodeCommandes(emailEnCoursDeVerification, code);
      enregistrerSessionAcheteur(resultat.token, emailEnCoursDeVerification, resultat.expiresInDays);
      afficherConnecte(emailEnCoursDeVerification);
      await chargerCommandes({ token: resultat.token, email: emailEnCoursDeVerification });
    } catch (erreur) {
      const messages = {
        CODE_INVALIDE: "Code incorrect, merci de réessayer.",
        CODE_EXPIRE: "Ce code a expiré, demandez-en un nouveau.",
        TROP_DE_TENTATIVES: "Trop de tentatives, merci de réessayer dans quelques minutes."
      };
      messageErreurCode.textContent = (erreur && messages[erreur.message]) || "Une erreur est survenue, merci de réessayer.";
      messageErreurCode.style.display = "block";
    } finally {
      btnValiderCode.disabled = false;
      btnValiderCode.innerHTML = libelleOriginal;
    }
  }

  btnRechercher.addEventListener("click", demanderCode);
  inputEmail.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") demanderCode();
  });

  btnValiderCode.addEventListener("click", validerCode);
  inputCode.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") validerCode();
  });

  btnRenvoyerCode.addEventListener("click", async () => {
    messageErreurCode.style.display = "none";
    try {
      await KADOSK_API.demanderCodeCommandes(emailEnCoursDeVerification);
      messageErreurCode.style.color = "#1faa6c";
      messageErreurCode.textContent = "Un nouveau code a été envoyé.";
      messageErreurCode.style.display = "block";
    } catch (erreur) {
      messageErreurCode.style.color = "";
      messageErreurCode.textContent = "Impossible de renvoyer un code pour le moment.";
      messageErreurCode.style.display = "block";
    }
  });

  btnChangerEmail.addEventListener("click", afficherEtapeEmail);

  btnDeconnecter.addEventListener("click", () => {
    effacerSessionAcheteur();
    afficherEtapeEmail();
  });

  demarrerConnexion();
})();
