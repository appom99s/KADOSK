(function () {
  KADOSK_ADMIN_NAV.rendre("dashboard");

  const LABELS_SOUS_ROLE = {
    SUPER_ADMIN: "Super Admin",
    FINANCE_ADMIN: "Finance Admin",
    SUPPORT_ADMIN: "Support Admin",
    OPERATIONS_ADMIN: "Operations Admin",
    SECURITY_ADMIN: "Security Admin"
  };

  document.addEventListener("kadosk:admin-ready", (evenement) => {
    const donnees = evenement.detail || {};
    document.getElementById("admBadgeRole").textContent = LABELS_SOUS_ROLE[donnees.subRole] || donnees.subRole || "Admin";
    document.getElementById("kpiMerchants").textContent = donnees.merchantsActifs ?? "—";
    document.getElementById("kpiDisponibles").textContent = (donnees.giftCards && donnees.giftCards.disponibles) ?? "—";
    document.getElementById("kpiUtilisees").textContent = (donnees.giftCards && donnees.giftCards.utilisees) ?? "—";
    document.getElementById("kpiExpirees").textContent = (donnees.giftCards && donnees.giftCards.expirees) ?? "—";
    document.getElementById("kpiTickets").textContent = donnees.ticketsOuverts ?? "—";
    document.getElementById("kpiRemboursements").textContent = donnees.remboursementsEnAttente ?? "—";
  });

  document.addEventListener("kadosk:admin-error", () => {
    document.querySelector(".adm-main").innerHTML =
      '<div class="adm-vide">Impossible de charger le dashboard. Merci de réessayer.</div>';
  });
})();
