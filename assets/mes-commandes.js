(function () {
  const inputEmail = document.getElementById("inputEmail");
  const btnRechercher = document.getElementById("btnRechercher");
  const messageErreur = document.getElementById("messageErreur");
  const etatChargement = document.getElementById("etatChargement");
  const etatVide = document.getElementById("etatVide");
  const listeCommandes = document.getElementById("listeCommandes");

  document.getElementById("k2IconeMail").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeRecherche").innerHTML = window.KADOSK_ICONE("search");

  // ---------------------------------------------------------------------------
  // QR temporaire (30s, anti-rejeu) : chaque carte réellement émise (giftCardId,
  // renvoyé par getOrderByNumber) peut afficher un QR qui se renouvelle
  // automatiquement - voir KADOSK_API.getQrTemporaire / giftCardSecurity.web.js.
  // Le code permanent n'est jamais transmis ni affiché ici.
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

  async function rafraichirQr(giftCardId, email) {
    try {
      const resultat = await KADOSK_API.getQrTemporaire(giftCardId, email);

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

  async function ouvrirModalQr(giftCardId, email) {
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

    await rafraichirQr(giftCardId, email);
    arreterRafraichissementQr();
    // Un cran plus fréquent que les 30s du pas TOTP, pour ne jamais laisser un QR
    // expiré affiché plus de quelques secondes à l'écran.
    minuteurQr = setInterval(() => rafraichirQr(giftCardId, email), 5000);
  }

  const CLE_SESSION_EMAIL = "kadosk_mes_commandes_email";

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

  function rendreLigneCommande(commande, email) {
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
        const detail = await KADOSK_API.getOrderByNumber(commande.orderNumber, email);
        zoneDetail.innerHTML =
          (detail.merchants || [])
            .map((m) => {
              const nomAffiche = m.cardName && m.cardName !== m.businessName ? `${m.cardName} (${m.businessName})` : m.businessName;
              const boutonsQr = (m.giftCardIds || [])
                .map(
                  (id, index) =>
                    `<button type="button" class="k2-qr-bouton-ligne" data-giftcardid="${echapperHtml(id)}">${window.KADOSK_ICONE ? window.KADOSK_ICONE("qr-code") : ""} Voir le QR${m.giftCardIds.length > 1 ? " (carte " + (index + 1) + ")" : ""}</button>`
                )
                .join("");
              return `
          <div class="k2-confirmation-ligne" style="align-items:flex-start;">
            <span>${echapperHtml(nomAffiche)}${m.quantity > 1 ? " × " + m.quantity : ""}<br />${boutonsQr}</span>
            <span>${formaterMontant(m.subtotal)}</span>
          </div>`;
            })
            .join("") +
          `<div style="font-size:12px; color:var(--k2-texte-clair); margin-top:10px;">Destinataire : ${echapperHtml(detail.recipientName)} (${echapperHtml(detail.recipientEmail)})</div>`;

        zoneDetail.querySelectorAll("[data-giftcardid]").forEach((bouton) => {
          bouton.addEventListener("click", (evenement) => {
            evenement.stopPropagation();
            ouvrirModalQr(bouton.dataset.giftcardid, email);
          });
        });

        detailCharge = true;
      } catch (erreur) {
        zoneDetail.textContent = "Impossible de charger le détail de cette commande.";
      }
    });

    return div;
  }

  async function rechercher() {
    const email = inputEmail.value.trim();
    messageErreur.style.display = "none";

    if (!emailValide(email)) {
      messageErreur.textContent = "Merci de saisir un e-mail valide.";
      messageErreur.style.display = "block";
      return;
    }

    try {
      sessionStorage.setItem(CLE_SESSION_EMAIL, email);
    } catch (erreur) {
      // sans conséquence
    }
    // Identifie l'acheteur pour la synchro serveur des favoris (voir favoris-data.js).
    if (window.KADOSK_FAVORIS) {
      KADOSK_FAVORIS.enregistrerEmailIdentifie(email);
    }

    listeCommandes.innerHTML = "";
    etatVide.style.display = "none";
    etatChargement.style.display = "block";
    btnRechercher.disabled = true;

    try {
      const resultat = await KADOSK_API.getOrdersByEmail(email);
      const commandes = resultat.items || [];
      etatChargement.style.display = "none";
      btnRechercher.disabled = false;

      if (commandes.length === 0) {
        etatVide.style.display = "block";
        return;
      }

      commandes.forEach((c) => listeCommandes.appendChild(rendreLigneCommande(c, email)));
    } catch (erreur) {
      console.error("Erreur recherche commandes :", erreur);
      etatChargement.style.display = "none";
      btnRechercher.disabled = false;
      messageErreur.textContent = "Une erreur est survenue, merci de réessayer.";
      messageErreur.style.display = "block";
    }
  }

  btnRechercher.addEventListener("click", rechercher);
  inputEmail.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") rechercher();
  });

  try {
    const emailSauvegarde = sessionStorage.getItem(CLE_SESSION_EMAIL);
    if (emailSauvegarde) {
      inputEmail.value = emailSauvegarde;
      rechercher();
    }
  } catch (erreur) {
    // sans conséquence
  }
})();
