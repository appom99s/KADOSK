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

  (window.KADOSK_CATEGORIES || []).forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.valeur;
    option.textContent = cat.valeur;
    selectCategorie.appendChild(option);
  });

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
    const logo = marchand.logoUrl
      ? `<img src="${echapperHtml(marchand.logoUrl)}" alt="${echapperHtml(marchand.name)}" />`
      : `<span>${echapperHtml((marchand.name || "?").slice(0, 1).toUpperCase())}</span>`;

    const div = document.createElement("div");
    div.className = "k2-carte-select" + (selectionne ? " selectionnee" : "");
    div.dataset.merchantId = marchand.merchantId;
    div.innerHTML =
      `<span class="k2-carte-select-check">${window.KADOSK_ICONE("check")}</span>` +
      `<div class="k2-carte-select-logo">${logo}</div>` +
      `<div class="k2-carte-select-nom">${echapperHtml(marchand.name)}</div>` +
      `<div class="k2-carte-select-cat">${echapperHtml(marchand.activityCategory || marchand.businessName)}</div>`;

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
    listeSelectionDetail.innerHTML = lignes.map((l) => echapperHtml(l.name || l.businessName)).join(" · ");
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

  async function charger() {
    try {
      const resultat = await KADOSK_API.getActiveMerchants();
      tousLesMarchands = resultat.items || [];
      etatChargement.style.display = "none";

      // Pré-filtre optionnel (arrivée depuis "Explorer par domaine" sur l'accueil).
      const parametres = new URLSearchParams(window.location.search);
      const categorieInitiale = parametres.get("categorie");
      if (categorieInitiale) {
        selectCategorie.value = categorieInitiale;
      }
      const rechercheInitiale = parametres.get("q");
      if (rechercheInitiale) {
        inputRecherche.value = rechercheInitiale;
      }

      rendreGrille();
      majSelectionRecap();
    } catch (erreur) {
      console.error("Erreur chargement catalogue :", erreur);
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Impossible de charger les commerces pour le moment.";
    }
  }

  charger();
})();
