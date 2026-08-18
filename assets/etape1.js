(function () {
  const NB_INITIAL = 8;

  const etatChargement = document.getElementById("etatChargement");
  const etatErreur = document.getElementById("etatErreur");
  const etatVide = document.getElementById("etatVide");
  const grille = document.getElementById("grilleMarchands");
  const inputRecherche = document.getElementById("inputRecherche");
  const selectCategorie = document.getElementById("selectCategorie");
  const blocSelection = document.getElementById("blocSelection");
  const texteSelection = document.getElementById("texteSelection");
  const lienVoirSelection = document.getElementById("lienVoirSelection");
  const listeSelectionDetail = document.getElementById("listeSelectionDetail");
  const btnContinuer = document.getElementById("btnContinuer");

  document.getElementById("k2IconeRecherche").innerHTML = window.KADOSK_ICONE("search");
  document.getElementById("k2IconeContinuer").innerHTML = window.KADOSK_ICONE("arrow-right");
  document.getElementById("k2IconeSecurite").innerHTML = window.KADOSK_ICONE("shield-check");

  // Authentification silencieuse (voir ma-boutique.page.js) : si la page Wix hôte
  // détecte un membre déjà connecté sur www.kadosk.com, elle transmet un jeton de
  // session via postMessage pour compléter le flow PKCE sans redemander de connexion.
  window.addEventListener("message", async (event) => {
    const donnees = event && event.data;
    if (!donnees || donnees.type !== "KADOSK_SESSION_TOKEN" || !donnees.sessionToken) return;
    if (window.KADOSK_AUTH && KADOSK_AUTH.estConnecte()) return;
    try {
      await KADOSK_AUTH.demarrerAutorisationMembrePourBoutique(donnees.sessionToken);
    } catch (erreur) {
      console.error("Authentification silencieuse boutique échouée :", erreur);
    }
  });
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: "KADOSK_BOUTIQUE_READY" }, "*");
    } catch (erreur) {
      // sans conséquence : mode invité toujours disponible
    }
  }

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  let tousLesMarchands = [];
  let nombreAffiches = NB_INITIAL;

  function marchandsFiltres() {
    const recherche = (inputRecherche.value || "").trim().toLowerCase();
    const categorie = selectCategorie.value;
    return tousLesMarchands.filter((m) => {
      const correspondRecherche =
        !recherche ||
        (m.name || "").toLowerCase().includes(recherche) ||
        (m.businessName || "").toLowerCase().includes(recherche) ||
        (m.activityCategory || "").toLowerCase().includes(recherche);
      const correspondCategorie = !categorie || m.activityCategory === categorie;
      return correspondRecherche && correspondCategorie;
    });
  }

  function rendreCarte(marchand) {
    const selectionne = KADOSK_PANIER2.estSelectionne(marchand.merchantId);
    // Le nom de la BOUTIQUE (marchand.businessName) est le label principal - le nom
    // de la carte cadeau (marchand.name, éditable librement par le marchand dans
    // ses paramètres) n'est qu'une info secondaire, affichée seulement si distincte.
    const nomAffiche = marchand.businessName || marchand.name || "";
    const logo = marchand.logoUrl
      ? `<img src="${echapperHtml(marchand.logoUrl)}" alt="${echapperHtml(nomAffiche)}" />`
      : `<span>${echapperHtml((nomAffiche || "?").slice(0, 1).toUpperCase())}</span>`;

    const div = document.createElement("div");
    div.className = "k2-carte-select" + (selectionne ? " selectionnee" : "");
    div.dataset.merchantId = marchand.merchantId;
    div.innerHTML =
      `<span class="k2-carte-select-check">${window.KADOSK_ICONE("check")}</span>` +
      `<div class="k2-carte-select-logo">${logo}</div>` +
      `<div class="k2-carte-select-nom">${echapperHtml(nomAffiche)}</div>` +
      (marchand.name && marchand.name !== nomAffiche
        ? `<div class="k2-carte-select-entreprise">${echapperHtml(marchand.name)}</div>`
        : "") +
      `<div class="k2-carte-select-cat">${echapperHtml(marchand.activityCategory || "")}</div>`;

    div.addEventListener("click", () => {
      if (KADOSK_PANIER2.estSelectionne(marchand.merchantId)) {
        KADOSK_PANIER2.deselectionner(marchand.merchantId);
        div.classList.remove("selectionnee");
      } else {
        KADOSK_PANIER2.selectionner({
          merchantId: marchand.merchantId,
          businessName: marchand.businessName,
          name: marchand.name,
          logoUrl: marchand.logoUrl,
          category: marchand.activityCategory,
          accentColor: marchand.accentColor
        });
        div.classList.add("selectionnee");
      }
      majSelectionRecap();
    });

    return div;
  }

  function rendreGrille() {
    const filtres = marchandsFiltres();
    grille.innerHTML = "";
    etatVide.style.display = filtres.length === 0 ? "block" : "none";

    const aAfficher = filtres.slice(0, nombreAffiches);
    aAfficher.forEach((m) => grille.appendChild(rendreCarte(m)));

    if (filtres.length > nombreAffiches) {
      const tuile = document.createElement("div");
      tuile.className = "k2-voir-plus";
      tuile.innerHTML = `${window.KADOSK_ICONE("plus")}<span>Voir plus de marchands</span>`;
      tuile.addEventListener("click", () => {
        nombreAffiches += NB_INITIAL;
        rendreGrille();
      });
      grille.appendChild(tuile);
    }
  }

  function majSelectionRecap() {
    const lignes = KADOSK_PANIER2.lire();
    const nombre = lignes.length;
    blocSelection.style.display = nombre > 0 ? "flex" : "none";
    texteSelection.textContent = `${nombre} carte${nombre > 1 ? "s" : ""} sélectionnée${nombre > 1 ? "s" : ""}`;
    btnContinuer.disabled = nombre === 0;
    listeSelectionDetail.innerHTML = lignes.map((l) => echapperHtml(l.businessName || l.name)).join(" · ");
  }

  lienVoirSelection.addEventListener("click", (evenement) => {
    evenement.preventDefault();
    listeSelectionDetail.style.display = listeSelectionDetail.style.display === "none" ? "block" : "none";
  });

  inputRecherche.addEventListener("input", () => {
    nombreAffiches = NB_INITIAL;
    rendreGrille();
  });
  selectCategorie.addEventListener("change", () => {
    nombreAffiches = NB_INITIAL;
    rendreGrille();
  });

  btnContinuer.addEventListener("click", () => {
    if (KADOSK_PANIER2.compterArticles() === 0) return;
    window.location.href = "etape-2-montant.html";
  });

  // Pré-filtre optionnel (arrivée depuis "Explorer par domaine" sur l'accueil) -
  // la recherche texte peut s'appliquer tout de suite, mais la catégorie ne peut
  // être sélectionnée qu'une fois les options réellement disponibles connues (voir
  // remplirCategoriesDisponibles, appelée après le chargement du catalogue).
  const parametresUrl = new URLSearchParams(window.location.search);
  const categorieInitiale = parametresUrl.get("categorie");
  const rechercheInitiale = parametresUrl.get("q");
  if (rechercheInitiale) {
    inputRecherche.value = rechercheInitiale;
  }

  // Ne propose au filtrage QUE les catégories réellement présentes chez au moins un
  // marchand actif à cet instant - jamais la liste complète des catégories
  // possibles (une catégorie sans aucun marchand actif ne doit pas apparaître).
  function remplirCategoriesDisponibles() {
    const categoriesPresentes = Array.from(
      new Set(tousLesMarchands.map((m) => m.activityCategory).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "fr"));

    const valeurActuelle = selectCategorie.value;
    selectCategorie.innerHTML = '<option value="">Toutes les catégories</option>';
    categoriesPresentes.forEach((categorie) => {
      const option = document.createElement("option");
      option.value = categorie;
      option.textContent = categorie;
      selectCategorie.appendChild(option);
    });

    // Réapplique la sélection en cours (changement de page, ou pré-filtre venu de
    // l'accueil) si cette catégorie fait toujours partie de celles disponibles.
    const aReappliquer = valeurActuelle || categorieInitiale;
    if (aReappliquer && categoriesPresentes.includes(aReappliquer)) {
      selectCategorie.value = aReappliquer;
    }
  }

  function appliquerCatalogue(resultat) {
    tousLesMarchands = (resultat && resultat.items) || [];
    etatChargement.style.display = "none";
    remplirCategoriesDisponibles();
    rendreGrille();
    majSelectionRecap();
  }

  function gererEchecChargement(erreur) {
    console.error("Erreur chargement catalogue :", erreur);
    etatChargement.style.display = "none";
    etatErreur.style.display = "block";
    etatErreur.textContent = "Impossible de charger les commerces pour le moment.";
  }

  // Partagé avec accueil.js (même clé de cache "marchandsActifs") : en arrivant sur
  // cette page juste après l'accueil, le catalogue déjà connu s'affiche
  // instantanément (pas de nouvel écran de chargement), pendant qu'une requête en
  // arrière-plan vérifie s'il y a du nouveau - voir assets/cache.js.
  function charger() {
    if (window.KADOSK_CACHE) {
      KADOSK_CACHE.chargerAvecCache("marchandsActifs", KADOSK_API.getActiveMerchants, appliquerCatalogue).catch(gererEchecChargement);
    } else {
      KADOSK_API.getActiveMerchants().then(appliquerCatalogue).catch(gererEchecChargement);
    }
  }

  charger();
})();
