(function () {
  const PAGES = [
    { fichier: "dashboard.html", libelle: "Tableau de bord" },
    { fichier: "cashier.html", libelle: "Encaisser" },
    { fichier: "orders.html", libelle: "Commandes" },
    { fichier: "transactions.html", libelle: "Transactions" },
    { fichier: "gift-cards.html", libelle: "Cartes cadeaux" },
    { fichier: "finance.html", libelle: "Finances" },
    { fichier: "business.html", libelle: "Mon entreprise" },
    { fichier: "settings.html", libelle: "Paramètres" }
  ];

  function pageActuelle() {
    const segments = window.location.pathname.split("/");
    return segments[segments.length - 1] || "dashboard.html";
  }

  function rendreBarreLaterale(conteneurId) {
    const conteneur = document.getElementById(conteneurId || "kadoskSidebar");
    if (!conteneur) return;

    const actuelle = pageActuelle();

    let html =
      '<div class="kadosk-logo">KADOSK</div>' +
      '<div class="kadosk-slogan">LE CADEAU, SIMPLEMENT</div>' +
      "<nav>";

    PAGES.forEach((page) => {
      const classe = page.fichier === actuelle ? "kadosk-nav-item actif" : "kadosk-nav-item";
      html += '<a class="' + classe + '" href="' + page.fichier + '">' + page.libelle + "</a>";
    });

    html += "</nav>";
    conteneur.innerHTML = html;
  }

  window.KADOSK_NAV = { rendreBarreLaterale };
})();
