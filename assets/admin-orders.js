(function () {
  KADOSK_ADMIN_NAV.rendre("orders");

  const conteneurListe = document.getElementById("conteneurListe");
  const selectStatut = document.getElementById("selectStatut");
  const boutonFiltrer = document.getElementById("boutonFiltrer");

  function echapperHtml(valeur) {
    return String(valeur || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }
  function formaterDate(valeur) {
    if (!valeur) return "—";
    try {
      return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (erreur) {
      return "—";
    }
  }
  function classeStatut(statut) {
    if (statut === "ACTIVE") return "ok";
    if (statut === "REFUSED" || statut === "EXPIRED") return "refuse";
    return "attente";
  }

  function rendreListe(items) {
    if (!items.length) {
      conteneurListe.innerHTML = '<div class="adm-vide">Aucune commande trouvée.</div>';
      return;
    }
    const lignes = items
      .map(
        (c) => `
        <tr>
          <td><a class="adm-lien-action" href="admin-transaction-360.html?ref=${encodeURIComponent(c.orderNumber)}">${echapperHtml(c.orderNumber)}</a></td>
          <td>${echapperHtml(c.buyerEmail)}</td>
          <td>${formaterMontant(c.totalAmount)}</td>
          <td><span class="adm-statut ${classeStatut(c.status)}">${echapperHtml(c.status)}</span></td>
          <td>${formaterDate(c.createdAt)}</td>
        </tr>`
      )
      .join("");
    conteneurListe.innerHTML = `
      <table class="adm-table">
        <thead><tr><th>REF CMD</th><th>Acheteur</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
        <tbody>${lignes}</tbody>
      </table>`;
  }

  async function chargerListe() {
    conteneurListe.innerHTML = '<div class="adm-vide">Chargement…</div>';
    try {
      const resultat = await KADOSK_API.getAdminOrders(selectStatut.value, 1);
      rendreListe(resultat.items || []);
    } catch (erreur) {
      console.error("Echec chargement commandes Admin :", erreur);
      conteneurListe.innerHTML = '<div class="adm-vide">Erreur de chargement. Merci de réessayer.</div>';
    }
  }

  boutonFiltrer.addEventListener("click", chargerListe);
  document.addEventListener("kadosk:admin-ready", (evenement) => {
    document.getElementById("admBadgeRole").textContent = (evenement.detail && evenement.detail.subRole) || "Admin";
    chargerListe();
  });
})();
