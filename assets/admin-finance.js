(function () {
  KADOSK_ADMIN_NAV.rendre("finance");

  const kpiCommissions = document.getElementById("kpiCommissions");
  const kpiFactureTTC = document.getElementById("kpiFactureTTC");
  const kpiNombreFactures = document.getElementById("kpiNombreFactures");
  const kpiRemboursementsAttente = document.getElementById("kpiRemboursementsAttente");
  const conteneurAnomalies = document.getElementById("conteneurAnomalies");
  const conteneurCommissions = document.getElementById("conteneurCommissions");
  const conteneurFactures = document.getElementById("conteneurFactures");
  const champMerchantIdCommissions = document.getElementById("champMerchantIdCommissions");
  const champMerchantIdFactures = document.getElementById("champMerchantIdFactures");
  const boutonFiltrerCommissions = document.getElementById("boutonFiltrerCommissions");
  const boutonFiltrerFactures = document.getElementById("boutonFiltrerFactures");
  const boutonRelancerReconciliation = document.getElementById("boutonRelancerReconciliation");

  function echapperHtml(valeur) {
    return String(valeur || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function formaterMontant(valeur) {
    if (valeur === undefined || valeur === null) return "—";
    return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }
  function formaterDate(valeur) {
    if (!valeur) return "—";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "—";
    }
  }

  async function chargerResume() {
    try {
      const resume = await KADOSK_API.getAdminFinanceSummary();
      kpiCommissions.textContent = formaterMontant(resume.totalCommissions);
      kpiFactureTTC.textContent = formaterMontant(resume.totalFactureTTC);
      kpiNombreFactures.textContent = resume.nombreFactures ?? "0";
      kpiRemboursementsAttente.textContent = resume.remboursementsEnAttente ?? "0";
    } catch (erreur) {
      console.error("Echec chargement résumé finance Admin :", erreur);
    }
  }

  const LIBELLES_ANOMALIE = {
    COMMISSION_MANQUANTE: "Commission manquante",
    FACTURE_MANQUANTE: "Facture manquante"
  };

  async function chargerReconciliation() {
    conteneurAnomalies.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminReconciliation();
      const anomalies = resultat.anomalies || [];
      if (!anomalies.length) {
        conteneurAnomalies.innerHTML = '<div class="adm-vide">Aucune anomalie détectée.</div>';
        return;
      }
      const lignes = anomalies
        .map(
          (a) => `
        <tr>
          <td><span class="adm-statut attente">${echapperHtml(LIBELLES_ANOMALIE[a.type] || a.type)}</span></td>
          <td><a class="adm-lien-action" href="admin-transaction-360.html?ref=${encodeURIComponent(a.orderNumber)}">${echapperHtml(a.orderNumber)}</a></td>
          <td>${echapperHtml(a.detail)}</td>
        </tr>`
        )
        .join("");
      conteneurAnomalies.innerHTML = `
        <table class="adm-table">
          <thead><tr><th>Type</th><th>REF CMD</th><th>Détail</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>`;
    } catch (erreur) {
      console.error("Echec réconciliation financière Admin :", erreur);
      conteneurAnomalies.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  async function chargerCommissions() {
    conteneurCommissions.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminCommissions(champMerchantIdCommissions.value.trim(), 1);
      const items = resultat.items || [];
      if (!items.length) {
        conteneurCommissions.innerHTML = '<div class="adm-vide">Aucune commission trouvée.</div>';
        return;
      }
      const lignes = items
        .map(
          (c) => `
        <tr>
          <td>${echapperHtml(c.merchantName || c.merchantId)}</td>
          <td>${c.taux ? c.taux + " %" : "—"}</td>
          <td>${formaterMontant(c.montant)}</td>
          <td>${formaterDate(c.createdAt)}</td>
        </tr>`
        )
        .join("");
      conteneurCommissions.innerHTML = `
        <table class="adm-table">
          <thead><tr><th>Marchand</th><th>Taux</th><th>Montant</th><th>Date</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>`;
    } catch (erreur) {
      console.error("Echec chargement commissions Admin :", erreur);
      conteneurCommissions.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  async function chargerFactures() {
    conteneurFactures.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminInvoices(champMerchantIdFactures.value.trim(), 1);
      const items = resultat.items || [];
      if (!items.length) {
        conteneurFactures.innerHTML = '<div class="adm-vide">Aucune facture trouvée.</div>';
        return;
      }
      const lignes = items
        .map(
          (f, index) => `
        <tr>
          <td>${echapperHtml(f.invoiceNumber)}</td>
          <td><a class="adm-lien-action" href="admin-transaction-360.html?ref=${encodeURIComponent(f.orderNumber)}">${echapperHtml(f.orderNumber)}</a></td>
          <td>${echapperHtml(f.merchantName || f.merchantId)}</td>
          <td>${formaterMontant(f.montantHT)}</td>
          <td>${f.tauxTVA !== undefined && f.tauxTVA !== null ? f.tauxTVA + " %" : "—"}</td>
          <td>${formaterMontant(f.montantTTC)}</td>
          <td><a class="adm-lien-action" data-index="${index}">PDF</a></td>
          <td>${formaterDate(f.createdAt)}</td>
        </tr>`
        )
        .join("");
      conteneurFactures.innerHTML = `
        <table class="adm-table">
          <thead><tr><th>N° Facture</th><th>REF CMD</th><th>Marchand</th><th>HT</th><th>TVA</th><th>TTC</th><th>PDF</th><th>Date</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>`;
      conteneurFactures.querySelectorAll("[data-index]").forEach((lien) => {
        lien.addEventListener("click", () => {
          const f = items[Number(lien.dataset.index)];
          KADOSK_FACTURE_PDF.telecharger({
            invoiceNumber: f.invoiceNumber,
            orderNumber: f.orderNumber,
            createdAt: f.createdAt,
            montantHT: f.montantHT,
            tauxTVA: f.tauxTVA,
            montantTVA: f.montantTVA,
            montantTTC: f.montantTTC,
            merchantName: f.merchantName || f.merchantId || ""
          });
        });
      });
    } catch (erreur) {
      console.error("Echec chargement factures Admin :", erreur);
      conteneurFactures.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  boutonFiltrerCommissions.addEventListener("click", chargerCommissions);
  boutonFiltrerFactures.addEventListener("click", chargerFactures);
  boutonRelancerReconciliation.addEventListener("click", chargerReconciliation);

  document.addEventListener("kadosk:admin-ready", (evenement) => {
    document.getElementById("admBadgeRole").textContent = (evenement.detail && evenement.detail.subRole) || "Admin";
    chargerResume();
    chargerReconciliation();
    chargerCommissions();
    chargerFactures();
  });
})();
