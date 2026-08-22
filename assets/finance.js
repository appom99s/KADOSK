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

  const corpsTableFinanceDetail = document.getElementById("corpsTableFinanceDetail");
  const etatVideFinanceDetail = document.getElementById("etatVideFinanceDetail");

  const LIBELLES_STATUT_VERSEMENT = {
    "À_DEFINIR_reversement_non_encore_modelise": "En attente (à définir)"
  };

  async function chargerFinanceDetail() {
    if (!corpsTableFinanceDetail) return;
    try {
      const resultat = await KADOSK_API.getFinanceDetail();
      const lignes = resultat.items || [];

      if (lignes.length === 0) {
        etatVideFinanceDetail.style.display = "block";
        corpsTableFinanceDetail.innerHTML = "";
        return;
      }
      etatVideFinanceDetail.style.display = "none";

      corpsTableFinanceDetail.innerHTML = lignes
        .map((ligne) => {
          const date = ligne.createdAt ? new Date(ligne.createdAt).toLocaleDateString("fr-FR") : "—";
          const statut = LIBELLES_STATUT_VERSEMENT[ligne.statutPaiementKadosk] || ligne.statutPaiementKadosk || "—";
          return (
            "<tr>" +
            "<td>" + (ligne.orderNumber || "—") + "</td>" +
            "<td>" + (ligne.montantTTC !== null ? formaterMontant(ligne.montantTTC) + " DH" : "—") + "</td>" +
            "<td>" + (ligne.montantCommission !== null && ligne.montantCommission !== undefined ? formaterMontant(ligne.montantCommission) + " DH" : "—") + "</td>" +
            "<td>" + (ligne.montantNet !== null ? formaterMontant(ligne.montantNet) + " DH" : "—") + "</td>" +
            "<td><span class=\"kadosk-badge-attente\">" + statut + "</span></td>" +
            "<td>" + date + "</td>" +
            "</tr>"
          );
        })
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement détail finance par commande :", erreur);
      corpsTableFinanceDetail.innerHTML = '<tr><td colspan="6">Impossible de charger le détail.</td></tr>';
    }
  }

  const corpsTableFactures = document.getElementById("corpsTableFactures");
  const etatVideFactures = document.getElementById("etatVideFactures");

  async function chargerFactures() {
    if (!corpsTableFactures) return;
    try {
      const resultat = await KADOSK_API.getMyInvoices();
      const lignes = resultat.items || [];

      if (lignes.length === 0) {
        etatVideFactures.style.display = "block";
        corpsTableFactures.innerHTML = "";
        return;
      }
      etatVideFactures.style.display = "none";

      corpsTableFactures.innerHTML = lignes
        .map((f, index) => {
          const date = f.createdAt ? new Date(f.createdAt).toLocaleDateString("fr-FR") : "—";
          return (
            "<tr>" +
            "<td>" + (f.invoiceNumber || "—") + "</td>" +
            "<td>" + (f.orderNumber || "—") + "</td>" +
            "<td>" + formaterMontant(f.montantHT) + " DH</td>" +
            "<td>" + (f.tauxTVA !== undefined && f.tauxTVA !== null ? f.tauxTVA + " %" : "—") + "</td>" +
            "<td>" + formaterMontant(f.montantTTC) + " DH</td>" +
            "<td>" + date + "</td>" +
            '<td><button class="kadosk-lien-voir-tout" style="background:none; border:none; padding:0;" data-index="' + index + '">PDF</button></td>' +
            "</tr>"
          );
        })
        .join("");

      corpsTableFactures.querySelectorAll("[data-index]").forEach((bouton) => {
        bouton.addEventListener("click", () => {
          const f = lignes[Number(bouton.dataset.index)];
          KADOSK_FACTURE_PDF.telecharger({
            invoiceNumber: f.invoiceNumber,
            orderNumber: f.orderNumber,
            createdAt: f.createdAt,
            montantHT: f.montantHT,
            tauxTVA: f.tauxTVA,
            montantTVA: f.montantTVA,
            montantTTC: f.montantTTC,
            merchantName: resultat.merchantBusinessName || ""
          });
        });
      });
    } catch (erreur) {
      console.error("Erreur chargement factures :", erreur);
      corpsTableFactures.innerHTML = '<tr><td colspan="7">Impossible de charger les factures.</td></tr>';
    }
  }

  charger();
  chargerCommissionMensuelle();
  chargerFinanceDetail();
  chargerFactures();
})();
