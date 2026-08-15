const KADOSK_API = (function () {
  function urlFonction(nom) {
    return window.KADOSK_CONFIG.siteBaseUrl + "/_functions/" + nom;
  }

  async function appeler(nom, methode, corps, dejaReessaye) {
    const accessToken = await KADOSK_AUTH.obtenirAccessTokenValide();

    const options = {
      method: methode,
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json"
      }
    };
    if (corps !== undefined) {
      options.body = JSON.stringify(corps);
    }

    const reponse = await fetch(urlFonction(nom), options);

    if (reponse.status === 401 && !dejaReessaye) {
      return appeler(nom, methode, corps, true);
    }

    const donnees = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
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
    getTransactionLog: (giftCardId) => appeler("transactionLog?giftCardId=" + encodeURIComponent(giftCardId), "GET")
  };
})();
