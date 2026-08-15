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

  async function appeler(nom, methode, corps, dejaReessaye) {
    const accessToken = await KADOSK_AUTH.obtenirAccessTokenValide();

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

    if (reponse.status === 401 && !dejaReessaye) {
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
      throw erreur;
    }

    return donnees;
  }

  return {
    getDashboardStats: () => appeler("dashboardStats", "GET"),
    checkGiftCard: (code) => appeler("checkGiftCard", "POST", { code }),
    redeemGiftCard: (code, amount) => appeler("redeemGiftCard", "POST", { code, amount }),
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
    getFinanceSummary: () => appeler("financeSummary", "GET")
  };
})();
