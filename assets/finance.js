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

      const blocConfiguree = document.getElementById("blocCommissionConfiguree");
      const blocNonConfiguree = document.getElementById("blocCommissionNonConfiguree");
      if (resume.commissionSystemConfigured) {
        blocConfiguree.style.display = "block";
        blocNonConfiguree.style.display = "none";
        document.getElementById("valTauxCommission").textContent = resume.commissionRate + " %";
        document.getElementById("valCommission").textContent = formaterMontant(resume.commissionAmount) + " DH";
        document.getElementById("valNet").textContent = formaterMontant(resume.netAmount) + " DH";
      } else {
        blocConfiguree.style.display = "none";
        blocNonConfiguree.style.display = "block";
      }
    } catch (erreur) {
      console.error("Erreur chargement résumé financier :", erreur);
    }
  }

  charger();
})();
