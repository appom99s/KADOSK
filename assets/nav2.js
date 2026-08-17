// Barre de navigation mobile persistante (Accueil / Mes commandes / Favoris / Mon
// compte) du nouveau parcours public - voir section 23 du cahier des charges.
// Rendue en JS pour rester identique sur toutes les pages sans dupliquer le HTML.
(function () {
  const PAGES = [
    { fichier: "accueil.html", libelle: "Accueil", icone: "house" },
    { fichier: "mes-commandes.html", libelle: "Mes commandes", icone: "clipboard-list" },
    { fichier: "favoris.html", libelle: "Favoris", icone: "heart" },
    { fichier: "mon-compte.html", libelle: "Mon compte", icone: "user" }
  ];

  function pageActuelle() {
    const segments = window.location.pathname.split("/");
    return segments[segments.length - 1] || "accueil.html";
  }

  function rendreNavBas(conteneurId) {
    const conteneur = document.getElementById(conteneurId || "k2NavBas");
    if (!conteneur || !window.KADOSK_ICONE) return;

    const actuelle = pageActuelle();
    let html = "";
    PAGES.forEach((page) => {
      const classe = page.fichier === actuelle ? "actif" : "";
      html += `<a href="${page.fichier}" class="${classe}">${window.KADOSK_ICONE(page.icone)}<span>${page.libelle}</span></a>`;
    });
    conteneur.innerHTML = html;
  }

  // Catégories KADOSK (section 17 du cahier des charges), avec leur icône associée -
  // réutilisées par l'accueil (explorer par domaine) et l'étape 1 (filtre catégorie).
  const CATEGORIES = [
    { valeur: "Restaurants & Gastronomie", icone: "utensils" },
    { valeur: "Beauté & Bien-être", icone: "sparkles" },
    { valeur: "Gaming & Jeux vidéo", icone: "gamepad-2" },
    { valeur: "Mode & Accessoires", icone: "shopping-bag" },
    { valeur: "Shopping", icone: "shopping-bag" },
    { valeur: "Hôtels & Séjours", icone: "landmark" },
    { valeur: "Voyage & Loisirs", icone: "plane" },
    { valeur: "Cinéma & Divertissement", icone: "clapperboard" },
    { valeur: "Sport & Fitness", icone: "dumbbell" },
    { valeur: "Technologie", icone: "settings" },
    { valeur: "Maison & Décoration", icone: "sofa" }
  ];

  function iconePourCategorie(categorie) {
    const trouvee = CATEGORIES.find((c) => c.valeur === categorie);
    return trouvee ? trouvee.icone : "tag";
  }

  window.KADOSK_RENDRE_NAV_BAS = rendreNavBas;
  window.KADOSK_CATEGORIES = CATEGORIES;
  window.KADOSK_ICONE_CATEGORIE = iconePourCategorie;

  document.addEventListener("DOMContentLoaded", () => rendreNavBas());
})();
