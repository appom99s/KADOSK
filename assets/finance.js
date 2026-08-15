(function () {
  function poserIcone(id, nomIcone) {
    const el = document.getElementById(id);
    if (el && window.KADOSK_ICONES && window.KADOSK_ICONES[nomIcone]) {
      el.innerHTML = window.KADOSK_ICONES[nomIcone];
    }
  }

  poserIcone("iconeCA", "finances");
  poserIcone("iconeEncours", "cartes");
  poserIcone("iconeAttente", "commandes");

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }

  async function charger() {
    try {
      const resume = await KADOSK_API.getFinanceSummary();

      document.getElementById("valCA").textContent = formaterMontant(resume.totalRevenueEncaisse);
      document.getElementById("valTransactions").textContent =
        resume.totalTransactionsReussies +
        (resume.totalTransactionsReussies > 1 ? " transactions réussies" : " transaction réussie") +
        (resume.totalTransactionsEchouees ? " · " + resume.totalTransactionsEchouees + " refusée(s)" : "");

      document.getElementById("valEncours").textContent = formaterMontant(resume.activeCardsBalance);
      document.getElementById("valCartesActives").textContent =
        resume.activeCardsCount + (resume.activeCardsCount > 1 ? " cartes actives" : " carte active");

      document.getElementById("valAttente").textContent = formaterMontant(resume.pendingOrdersTotal);
      document.getElementById("valCommandesAttente").textContent =
        resume.pendingOrdersCount + (resume.pendingOrdersCount > 1 ? " commandes en attente" : " commande en attente");
    } catch (erreur) {
      console.error("Erreur chargement résumé financier :", erreur);
    }
  }

  charger();
})();
