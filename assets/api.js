const KADOSK_API = (function () {
  // Les fonctions HTTP du site (giftCardSecurity.web.js) ont besoin du "contexte
  // d'authentification" du membre pour reconnaître qui appelle (getCurrentMember()).
  // Appeler directement https://www.kadosk.com/_functions/... ne transmet PAS ce
  // contexte (c'est documenté par Wix : c'est réservé aux appels anonymes/publics).
  // Il faut obligatoirement passer par la gateway REST de Wix, qui elle transmet
  // le contexte d'authentification lié au token d'accès fourni dans l'en-tête.
  function urlFonction(nom) {
    return "https://www.wixapis.com/velo/v1/http/invoke/" + nom;
  }

  async function executerAppel(nom, methode, corps, accessToken, dejaReessaye, estPublic) {
    const options = {
      method: methode,
      headers: {
        // Important : les API REST Wix attendent le token brut, PAS "Bearer <token>".
        Authorization: accessToken,
        "Content-Type": "application/json"
      }
    };
    if (corps !== undefined && methode !== "GET") {
      options.body = JSON.stringify(corps);
    }

    let reponse;
    try {
      reponse = await fetch(urlFonction(nom), options);
    } catch (erreurReseau) {
      console.error("KADOSK_API appel réseau échoué vers", nom, erreurReseau);
      const erreur = new Error("ERREUR_RESEAU");
      erreur.cause = erreurReseau;
      throw erreur;
    }

    if (reponse.status === 401 && !dejaReessaye && !estPublic) {
      return appeler(nom, methode, corps, true);
    }

    const texteBrut = await reponse.text();
    let donnees = {};
    try {
      donnees = texteBrut ? JSON.parse(texteBrut) : {};
    } catch (erreurParsage) {
      console.error("KADOSK_API réponse non-JSON depuis", nom, reponse.status, texteBrut.slice(0, 500));
    }

    if (!reponse.ok) {
      console.error("KADOSK_API réponse non-OK depuis", nom, reponse.status, donnees);
      const erreur = new Error(donnees.error || "ERREUR_SERVEUR");
      erreur.status = reponse.status;
      // Certains endpoints joignent un détail diagnostic temporaire (erreurReelle/debug)
      // en cas d'erreur 500 - on le garde accessible sur l'erreur pour pouvoir l'afficher
      // sans devoir rouvrir les outils de développement à chaque fois.
      erreur.detail = donnees.erreurReelle || donnees.debug || null;
      throw erreur;
    }

    return donnees;
  }

  async function appeler(nom, methode, corps, dejaReessaye) {
    const accessToken = await KADOSK_AUTH.obtenirAccessTokenValide();
    return executerAppel(nom, methode, corps, accessToken, dejaReessaye, false);
  }

  // Pour les appels avant connexion (mot de passe oublié, limite de connexion) :
  // utilise un token visiteur, pas de session membre requise.
  async function appelerPublic(nom, methode, corps) {
    const tokenVisiteur = await KADOSK_AUTH.obtenirTokenVisiteur();
    return executerAppel(nom, methode, corps, tokenVisiteur, true, true);
  }

  return {
    getDashboardStats: () => appeler("dashboardStats", "GET"),
    checkGiftCard: (code) => appeler("checkGiftCard", "POST", { code }),
    redeemGiftCard: (code, amount) => appeler("redeemGiftCard", "POST", { code, amount }),
    // QR temporaire (30s, anti-rejeu) scanné par le marchand en caisse - le payload
    // scanné (KDSKQR1:...) n'est jamais le code permanent. Authentifié comme
    // checkGiftCard/redeemGiftCard (token du marchand connecté, pas un appel public).
    checkQrTemporaire: (payload) => appeler("qrTemporaireCheck", "POST", { payload }),
    redeemQrTemporaire: (payload, amount) => appeler("qrTemporaireRedeem", "POST", { payload, amount }),
    getDraftOrders: () => appeler("draftOrders", "GET"),
    activateOrder: (giftCardId, buyerEmail, buyerName, message) =>
      appeler("activateOrder", "POST", { giftCardId, buyerEmail, buyerName, message }),
    getOfferSettings: () => appeler("offerSettings", "GET"),
    saveOfferSettings: (parametres) => appeler("offerSettings", "POST", parametres),
    getTransactionLog: (giftCardId) => appeler("transactionLog?giftCardId=" + encodeURIComponent(giftCardId), "GET"),
    getRecentTransactions: (code, limit) => {
      const parametres = [];
      if (code) parametres.push("code=" + encodeURIComponent(code));
      if (limit) parametres.push("limit=" + encodeURIComponent(limit));
      const suffixe = parametres.length ? "?" + parametres.join("&") : "";
      return appeler("recentTransactions" + suffixe, "GET");
    },
    getRevenueChart: () => appeler("revenueChart", "GET"),
    getAllGiftCards: (status) =>
      appeler("allGiftCards" + (status ? "?status=" + encodeURIComponent(status) : ""), "GET"),
    getFinanceSummary: () => appeler("financeSummary", "GET"),
    getMerchantProfile: () => appeler("merchantProfile", "GET"),
    getSubscriptionInfo: () => appeler("subscriptionInfo", "GET"),
    refuseOrder: (giftCardId, reason) => appeler("refuseOrder", "POST", { giftCardId, reason }),

    // Mot de passe (connecté) : demande de code puis confirmation.
    requestPasswordChange: (newPassword) => appeler("requestPasswordChange", "POST", { newPassword }),
    confirmPasswordChange: (code) => appeler("confirmPasswordChange", "POST", { code }),

    // Mot de passe oublié (déconnecté) : appels publics avec token visiteur.
    forgotPassword: (email, newPassword) => appelerPublic("forgotPassword", "POST", { email, newPassword }),
    confirmForgotPassword: (email, code) => appelerPublic("confirmForgotPassword", "POST", { email, code }),

    // Anti brute-force sur la connexion : appels publics avec token visiteur.
    checkLoginLimit: (email) => appelerPublic("checkLoginLimit", "POST", { email }),
    recordLoginResult: (email, success) => appelerPublic("recordLoginResult", "POST", { email, success }),

    // Réseau KADOSK : acceptation des cartes universelles / par domaine (à la caisse).
    saveNetworkPreferences: (acceptsUniversalCards, acceptsDomainCards) =>
      appeler("networkPreferences", "POST", { acceptsUniversalCards, acceptsDomainCards }),

    // Double authentification (2FA) par application TOTP (Google Authenticator, etc.).
    start2FA: () => appeler("start2FA", "POST"),
    confirm2FA: (code) => appeler("confirm2FA", "POST", { code }),
    disable2FA: (code) => appeler("disable2FA", "POST", { code }),
    need2FA: () => appeler("need2FA", "GET"),
    verify2FA: (code) => appeler("verify2FA", "POST", { code }),

    // Upload de logo : le backend ne fait que générer l'URL signée (nécessite des
    // permissions élevées) ; l'upload du fichier lui-même se fait en PUT direct sur
    // cette URL, sans repasser par la gateway Wix (voir settings.js).
    getMediaUploadUrl: (fileName, mimeType, sizeInBytes) =>
      appeler("mediaUploadUrl", "POST", { fileName, mimeType, sizeInBytes }),

    // Suivi de paiement KADOSK : commission mensuelle + détail par carte.
    getCommissionMonthly: () => appeler("commissionMonthly", "GET"),
    getCommissionDetail: (month) => appeler("commissionDetail?month=" + encodeURIComponent(month), "GET"),

    // Biométrie (WebAuthn : Face ID / Touch ID / Windows Hello) en alternative au TOTP.
    startBiometricEnrollment: () => appeler("startBiometricEnrollment", "POST"),
    confirmBiometricEnrollment: (credentialId, publicKeySpkiBase64, algorithm, clientDataJSON, deviceLabel) =>
      appeler("confirmBiometricEnrollment", "POST", { credentialId, publicKeySpkiBase64, algorithm, clientDataJSON, deviceLabel }),
    disableBiometric: (code) => appeler("disableBiometric", "POST", { code }),
    startBiometricLogin: () => appeler("startBiometricLogin", "POST"),
    verifyBiometricLogin: (clientDataJSON, authenticatorData, signature) =>
      appeler("verifyBiometricLogin", "POST", { clientDataJSON, authenticatorData, signature }),

    // Boutique publique KADOSK (order.kadosk.com... en fait servie depuis ce même
    // dossier - boutique.html/fiche-marchand.html/panier.html) : aucune connexion
    // requise, appels publics avec token visiteur, comme forgotPassword ci-dessus.
    getActiveMerchants: () => appelerPublic("activeMerchants", "GET"),
    getGiftCardOffer: (merchantId) => appelerPublic("giftCardOffer?merchantId=" + encodeURIComponent(merchantId), "GET"),
    placeOrder: (merchantId, montant, buyerEmail, buyerName, quantite, message) =>
      appelerPublic("placeOrder", "POST", { merchantId, montant, buyerEmail, buyerName, quantite, message }),

    // Parcours en 5 étapes (panier multi-marchands) : création de commande (tout est
    // revalidé côté serveur), relecture de confirmation, "Mes commandes" par email.
    createOrder: (items, buyerEmail, recipientName, recipientEmail, message) =>
      appelerPublic("createOrder", "POST", { items, buyerEmail, recipientName, recipientEmail, message }),
    getOrderByNumber: (orderNumber, buyerEmail) =>
      appelerPublic(
        "orderByNumber?orderNumber=" + encodeURIComponent(orderNumber) + "&buyerEmail=" + encodeURIComponent(buyerEmail),
        "GET"
      ),
    getOrdersByEmail: (buyerEmail) => appelerPublic("ordersByEmail?buyerEmail=" + encodeURIComponent(buyerEmail), "GET"),

    // QR temporaire (30s, anti-rejeu) d'une carte précise, affiché par
    // l'acheteur/destinataire depuis "Mes commandes" - voir mes-commandes.js et
    // giftCardSecurity.web.js/genererCodeQRTemporaire pour le détail.
    getQrTemporaire: (giftCardId, buyerEmail) =>
      appelerPublic(
        "qrTemporaire?giftCardId=" + encodeURIComponent(giftCardId) + "&buyerEmail=" + encodeURIComponent(buyerEmail),
        "GET"
      ),

    // Bannières personnalisables en haut de l'accueil (collection Pub) - voir
    // accueil.js et giftCardSecurity.web.js/getActivePubs.
    getActivePubs: () => appelerPublic("activePubs", "GET")
  };
})();
