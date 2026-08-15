(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "login.html";
    return;
  }

  KADOSK_NAV.rendreBarreLaterale("kadoskSidebar");

  let codeCarteActuelle = null;

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

  async function chargerStatistiques() {
    try {
      const stats = await KADOSK_API.getDashboardStats();
      document.getElementById("kpiCA").textContent = stats.revenueToday + " DH";
      document.getElementById("kpiTransactions").textContent = String(stats.transactionsToday);
      document.getElementById("kpiEnAttente").textContent = stats.pendingOrdersTotal + " DH";
      document.getElementById("kpiEnAttenteDetail").textContent =
        stats.pendingOrdersCount + (stats.pendingOrdersCount > 1 ? " commandes" : " commande");
    } catch (erreur) {
      console.error("Erreur chargement statistiques :", erreur);
    }
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
    } catch (erreur) {
      codeCarteActuelle = null;
      carteInfo.textContent = "Carte introuvable.";
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

      champCode.value = "";
      carteInfo.style.display = "none";
      blocMontant.style.display = "none";
      blocBoutonEncaisser.style.display = "none";
      codeCarteActuelle = null;

      await chargerStatistiques();
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

  chargerStatistiques();
})();
