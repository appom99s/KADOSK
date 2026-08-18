(function () {
  const inputNomDestinataire = document.getElementById("inputNomDestinataire");
  const inputEmailDestinataire = document.getElementById("inputEmailDestinataire");
  const inputMessage = document.getElementById("inputMessage");
  const compteurMessage = document.getElementById("compteurMessage");
  const inputEmailAcheteur = document.getElementById("inputEmailAcheteur");
  const listeRecap = document.getElementById("listeRecap");
  const texteTotal = document.getElementById("texteTotal");
  const messageErreur = document.getElementById("messageErreur");
  const btnRetour = document.getElementById("btnRetour");
  const btnValider = document.getElementById("btnValider");

  document.getElementById("k2IconeUser").innerHTML = window.KADOSK_ICONE("user");
  document.getElementById("k2IconeMailDest").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeMessage").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeMailAcheteur").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeRetour").innerHTML = window.KADOSK_ICONE("arrow-left");
  document.getElementById("k2IconeCadenas").innerHTML = window.KADOSK_ICONE("shield-check");
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

  function emailValide(valeur) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valeur || "").trim());
  }

  function rendreRecap() {
    const lignes = KADOSK_PANIER2.lire();
    listeRecap.innerHTML = lignes
      .map(
        (l) => `
      <div class="k2-confirmation-ligne">
        <span>${echapperHtml(l.name || l.businessName)}</span>
        <span>${formaterMontant((Number(l.montant) || 0) * (Number(l.quantite) || 1))}</span>
      </div>`
      )
      .join("");
    texteTotal.textContent = formaterMontant(KADOSK_PANIER2.totalGeneral());
  }

  function restaurerDestinataire() {
    const sauvegarde = KADOSK_PANIER2.lireDestinataire();
    inputNomDestinataire.value = sauvegarde.recipientName || "";
    inputEmailDestinataire.value = sauvegarde.recipientEmail || "";
    inputMessage.value = sauvegarde.message || "";
    inputEmailAcheteur.value = sauvegarde.buyerEmail || "";
    compteurMessage.textContent = String(inputMessage.value.length);
  }

  inputMessage.addEventListener("input", () => {
    compteurMessage.textContent = String(inputMessage.value.length);
  });

  btnRetour.addEventListener("click", () => {
    window.location.href = "etape-3-recap.html";
  });

  btnValider.addEventListener("click", async () => {
    messageErreur.style.display = "none";

    const recipientName = inputNomDestinataire.value.trim();
    const recipientEmail = inputEmailDestinataire.value.trim();
    const message = inputMessage.value.trim();
    const buyerEmail = inputEmailAcheteur.value.trim();

    if (!recipientName) {
      messageErreur.textContent = "Merci d'indiquer le nom du destinataire.";
      messageErreur.style.display = "block";
      return;
    }
    if (!emailValide(recipientEmail)) {
      messageErreur.textContent = "L'e-mail du destinataire n'est pas valide.";
      messageErreur.style.display = "block";
      return;
    }
    if (!emailValide(buyerEmail)) {
      messageErreur.textContent = "Merci d'indiquer votre e-mail pour recevoir la confirmation.";
      messageErreur.style.display = "block";
      return;
    }
    if (KADOSK_PANIER2.compterArticles() === 0) {
      window.location.href = "boutique.html";
      return;
    }

    KADOSK_PANIER2.enregistrerDestinataire({ buyerEmail, recipientName, recipientEmail, message });

    btnValider.disabled = true;
    const libelleOriginal = btnValider.innerHTML;
    btnValider.innerHTML = "Envoi en cours...";

    try {
      const resultat = await KADOSK_API.createOrder(
        KADOSK_PANIER2.articlesPourCommande(),
        buyerEmail,
        recipientName,
        recipientEmail,
        message
      );
      resultat.recipientEmail = recipientEmail;
      resultat.recipientName = recipientName;
      sessionStorage.setItem("kadosk_derniere_commande", JSON.stringify(resultat));
      KADOSK_PANIER2.vider();
      window.location.href = "etape-5-confirmation.html";
    } catch (erreur) {
      console.error("Echec de la commande :", erreur);
      const messages = {
        INVALID_AMOUNT_FOR_OFFER: "Un des montants choisis n'est plus valide pour ce marchand. Retournez à l'étape 2.",
        MERCHANT_NOT_FOUND: "Un des marchands sélectionnés n'est plus disponible.",
        TROP_DE_COMMANDES: "Trop de commandes ont été passées récemment, merci de réessayer dans quelques minutes.",
        ERREUR_RESEAU: "Problème de connexion, merci de réessayer."
      };
      messageErreur.textContent = messages[erreur.message] || "Une erreur est survenue, merci de réessayer.";
      messageErreur.style.display = "block";
      btnValider.disabled = false;
      btnValider.innerHTML = libelleOriginal;
      document.getElementById("k2IconeCadenas").innerHTML = window.KADOSK_ICONE("shield-check");
    }
  });

  if (KADOSK_PANIER2.compterArticles() === 0) {
    window.location.href = "boutique.html";
    return;
  }
  if (!KADOSK_PANIER2.toutesLignesOntUnMontant()) {
    window.location.href = "etape-2-montant.html";
    return;
  }

  restaurerDestinataire();
  rendreRecap();
})();
