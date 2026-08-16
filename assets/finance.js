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

  const MOIS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  function libelleMois(cleMois) {
    const [annee, mois] = cleMois.split("-").map(Number);
    if (!annee || !mois) return cleMois;
    return MOIS_FR[mois - 1] + " " + annee;
  }

  function codeMasque(giftCardId) {
    return window.KADOSK_MASQUER_ID ? window.KADOSK_MASQUER_ID(giftCardId) : "00***";
  }

  const corpsTableCommissionMensuelle = document.getElementById("corpsTableCommissionMensuelle");
  const etatVideCommission = document.getElementById("etatVideCommission");
  const blocDetailCommissionMois = document.getElementById("blocDetailCommissionMois");
  const titreDetailCommissionMois = document.getElementById("titreDetailCommissionMois");
  const corpsTableDetailCommission = document.getElementById("corpsTableDetailCommission");
  const boutonFermerDetailCommission = document.getElementById("boutonFermerDetailCommission");

  async function afficherDetailMois(cleMois) {
    titreDetailCommissionMois.textContent = "Détail — " + libelleMois(cleMois);
    corpsTableDetailCommission.innerHTML = '<tr><td colspan="4">Chargement…</td></tr>';
    blocDetailCommissionMois.style.display = "block";
    blocDetailCommissionMois.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
      const resultat = await KADOSK_API.getCommissionDetail(cleMois);
      const lignes = resultat.items || [];

      if (lignes.length === 0) {
        corpsTableDetailCommission.innerHTML = '<tr><td colspan="4">Aucune carte pour ce mois.</td></tr>';
        return;
      }

      corpsTableDetailCommission.innerHTML = lignes
        .map((ligne) => {
          const date = ligne.createdAt ? new Date(ligne.createdAt).toLocaleDateString("fr-FR") : "—";
          const commission = ligne.commissionAmount !== null && ligne.commissionAmount !== undefined
            ? formaterMontant(ligne.commissionAmount) + " DH"
            : "—";
          return (
            "<tr>" +
            "<td>Carte " + codeMasque(ligne.giftCardId) + "</td>" +
            "<td>" + date + "</td>" +
            "<td>" + formaterMontant(ligne.amount) + " DH</td>" +
            "<td>" + commission + "</td>" +
            "</tr>"
          );
        })
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement détail commission mensuelle :", erreur);
      corpsTableDetailCommission.innerHTML = '<tr><td colspan="4">Impossible de charger le détail.</td></tr>';
    }
  }

  async function chargerCommissionMensuelle() {
    try {
      const resultat = await KADOSK_API.getCommissionMonthly();
      const mois = resultat.items || [];

      if (mois.length === 0) {
        etatVideCommission.style.display = "block";
        corpsTableCommissionMensuelle.innerHTML = "";
        return;
      }
      etatVideCommission.style.display = "none";

      corpsTableCommissionMensuelle.innerHTML = mois
        .map((ligne) => {
          const commission = ligne.commissionAmount !== null && ligne.commissionAmount !== undefined
            ? formaterMontant(ligne.commissionAmount) + " DH"
            : "Non défini";
          return (
            '<tr class="kadosk-ligne-cliquable" data-mois="' + ligne.month + '" style="cursor:pointer;">' +
            "<td>" + libelleMois(ligne.month) + "</td>" +
            "<td>" + formaterMontant(ligne.totalRevenue) + " DH</td>" +
            "<td>" + ligne.transactionCount + "</td>" +
            "<td>" + commission + "</td>" +
            "</tr>"
          );
        })
        .join("");

      corpsTableCommissionMensuelle.querySelectorAll("tr[data-mois]").forEach((ligne) => {
        ligne.addEventListener("click", () => afficherDetailMois(ligne.getAttribute("data-mois")));
      });
    } catch (erreur) {
      console.error("Erreur chargement suivi commission mensuelle :", erreur);
    }
  }

  if (boutonFermerDetailCommission) {
    boutonFermerDetailCommission.addEventListener("click", () => {
      blocDetailCommissionMois.style.display = "none";
    });
  }

  charger();
  chargerCommissionMensuelle();
})();
