(function () {
  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  document.getElementById("k2IconeRechercheHero").innerHTML = window.KADOSK_ICONE("search");
  document.getElementById("iconeComment1").innerHTML = window.KADOSK_ICONE("shopping-bag");
  document.getElementById("iconeComment2").innerHTML = window.KADOSK_ICONE("landmark");
  document.getElementById("iconeComment3").innerHTML = window.KADOSK_ICONE("check-circle");
  document.getElementById("iconeComment4").innerHTML = window.KADOSK_ICONE("gift");
  document.getElementById("iconePourquoi1").innerHTML = window.KADOSK_ICONE("shield-check");
  document.getElementById("iconePourquoi2").innerHTML = window.KADOSK_ICONE("user");
  document.getElementById("iconePourquoi3").innerHTML = window.KADOSK_ICONE("gift");

  const inputRechercheHero = document.getElementById("inputRechercheHero");
  inputRechercheHero.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter" && inputRechercheHero.value.trim()) {
      window.location.href = "boutique.html?q=" + encodeURIComponent(inputRechercheHero.value.trim());
    }
  });

  // --- Bannières personnalisables (collection Pub, gérée depuis le Content Manager
  // Wix) : section en haut de l'accueil, ne s'affiche que s'il y a au moins une
  // bannière active à la date du jour (filtrage déjà fait côté serveur, voir
  // getActivePubs). Silencieuse en cas d'échec : l'accueil reste utilisable sans.
  async function chargerPub() {
    const section = document.getElementById("sectionPub");
    const piste = document.getElementById("pistePub");
    if (!section || !piste || !window.KADOSK_API || !KADOSK_API.getActivePubs) return;

    try {
      const resultat = await KADOSK_API.getActivePubs();
      const pubs = ((resultat && resultat.items) || []).filter((pub) => pub.imageUrl);
      if (pubs.length === 0) return;

      piste.innerHTML = pubs
        .map((pub) => {
          const image = `<img src="${echapperHtml(pub.imageUrl)}" alt="${echapperHtml(pub.title || "")}" />`;
          return pub.linkUrl
            ? `<a class="k2-pub-carte" href="${echapperHtml(pub.linkUrl)}">${image}</a>`
            : `<div class="k2-pub-carte">${image}</div>`;
        })
        .join("");
      section.style.display = "block";
    } catch (erreur) {
      console.error("Erreur chargement bannières :", erreur);
    }
  }
  chargerPub();

  // --- Explorer par domaine ---
  // Ne montre QUE les catégories réellement présentes chez au moins un marchand
  // actif à cet instant (jamais la liste complète des catégories possibles) -
  // appelée après le chargement du catalogue, voir appliquerCatalogue plus bas.
  const grilleCategories = document.getElementById("grilleCategories");
  function afficherCategoriesDisponibles(marchands) {
    const categoriesPresentes = Array.from(
      new Set(marchands.map((m) => m.activityCategory).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "fr"));

    grilleCategories.innerHTML = "";
    categoriesPresentes.forEach((categorie) => {
      const icone = window.KADOSK_ICONE_CATEGORIE ? window.KADOSK_ICONE_CATEGORIE(categorie) : "tag";
      const a = document.createElement("a");
      a.className = "k2-categorie-tuile";
      a.href = "boutique.html?categorie=" + encodeURIComponent(categorie);
      a.innerHTML = `<span class="k2-icone-cat">${window.KADOSK_ICONE(icone)}</span><span>${echapperHtml(categorie)}</span>`;
      grilleCategories.appendChild(a);
    });
  }

  function rendreCarteMarchand(marchand, estNouveau) {
    // Le nom de la BOUTIQUE (businessName) est le label principal - voir même
    // correction dans assets/etape1.js.
    const nomAffiche = marchand.businessName || marchand.name || "";
    const logo = marchand.logoUrl
      ? `<img src="${echapperHtml(marchand.logoUrl)}" alt="${echapperHtml(nomAffiche)}" />`
      : `<span>${echapperHtml((nomAffiche || "?").slice(0, 1).toUpperCase())}</span>`;

    const favori = window.KADOSK_FAVORIS ? window.KADOSK_FAVORIS.estFavori(marchand.merchantId) : false;

    const div = document.createElement("div");
    div.className = "k2-carte-select";
    div.style.position = "relative";
    div.style.cursor = "default";
    div.innerHTML = `
      ${estNouveau ? '<span class="k2-badge-nouveau">Nouveau</span>' : ""}
      <button type="button" class="k2-favori-btn ${favori ? "actif" : ""}" data-favori>${window.KADOSK_ICONE("heart")}</button>
      <a href="fiche-marchand.html?merchantId=${encodeURIComponent(marchand.merchantId)}" style="display:contents;">
        <div class="k2-carte-select-logo">${logo}</div>
        <div class="k2-carte-select-nom">${echapperHtml(nomAffiche)}</div>
        ${marchand.name && marchand.name !== nomAffiche ? `<div class="k2-carte-select-entreprise">${echapperHtml(marchand.name)}</div>` : ""}
        <div class="k2-carte-select-cat">${echapperHtml(marchand.activityCategory || "")}</div>
      </a>
    `;

    div.querySelector("[data-favori]").addEventListener("click", (evenement) => {
      evenement.preventDefault();
      const bouton = evenement.currentTarget;
      const actif = window.KADOSK_FAVORIS.basculer(marchand.merchantId);
      bouton.classList.toggle("actif", actif);
    });

    return div;
  }

  // Reconstruit entièrement les sections à partir d'un catalogue donné - conçue
  // pour pouvoir être appelée deux fois de suite sans dupliquer les cartes
  // (d'abord avec la version en cache pour un affichage instantané, puis avec la
  // version fraîche renvoyée par le serveur en arrière-plan - voir charger()
  // ci-dessous et assets/cache.js).
  async function appliquerCatalogue(resultat) {
    const etatChargement = document.getElementById("etatChargementPopulaires");
    const grillePopulaires = document.getElementById("grillePopulaires");
    const grilleNouveautes = document.getElementById("grilleNouveautes");
    const sectionNouveautes = document.getElementById("sectionNouveautes");
    const grillePourVous = document.getElementById("grillePourVous");
    const sectionPourVous = document.getElementById("sectionPourVous");
    const logosPartenaires = document.getElementById("logosPartenaires");

    const marchands = (resultat && resultat.items) || [];
    etatChargement.style.display = "none";

    afficherCategoriesDisponibles(marchands);

    grillePopulaires.innerHTML = "";
    grilleNouveautes.innerHTML = "";
    grillePourVous.innerHTML = "";
    logosPartenaires.innerHTML = "";
    sectionNouveautes.style.display = "none";
    sectionPourVous.style.display = "none";

    if (marchands.length === 0) {
      document.getElementById("sectionPopulaires").style.display = "none";
      return;
    }
    document.getElementById("sectionPopulaires").style.display = "block";

    // Cartes populaires : ordre renvoyé par le catalogue (pas de vraie mesure de
    // popularité disponible côté public - honnêtement, c'est l'ordre du catalogue).
    marchands.slice(0, 10).forEach((m) => grillePopulaires.appendChild(rendreCarteMarchand(m, false)));

    // Nouveautés : réellement basé sur la date de création de la fiche marchand
    // (createdDate), pas fabriqué - seulement les enseignes des 60 derniers jours.
    const seuilNouveaute = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const recents = marchands
      .filter((m) => m.createdDate && new Date(m.createdDate).getTime() >= seuilNouveaute)
      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    if (recents.length > 0) {
      sectionNouveautes.style.display = "block";
      recents.slice(0, 5).forEach((m) => grilleNouveautes.appendChild(rendreCarteMarchand(m, true)));
    }

    // Pour vous : basé sur les favoris déjà enregistrés localement (aucune
    // recommandation inventée - KADOSK ne suit pas la navigation des visiteurs).
    if (window.KADOSK_FAVORIS) {
      const idsFavoris = window.KADOSK_FAVORIS.lire();
      const favoris = marchands.filter((m) => idsFavoris.includes(m.merchantId));
      if (favoris.length > 0) {
        sectionPourVous.style.display = "block";
        favoris.slice(0, 5).forEach((m) => grillePourVous.appendChild(rendreCarteMarchand(m, false)));
      }
    }

    // Marchands partenaires : simple bandeau de logos.
    marchands.forEach((m) => {
      const div = document.createElement("div");
      div.className = "k2-logo-partenaire";
      div.title = m.businessName;
      div.innerHTML = m.logoUrl
        ? `<img src="${echapperHtml(m.logoUrl)}" alt="${echapperHtml(m.businessName)}" />`
        : `<span>${echapperHtml((m.businessName || "?").slice(0, 1).toUpperCase())}</span>`;
      logosPartenaires.appendChild(div);
    });
  }

  function gererEchecChargement(erreur) {
    console.error("Erreur chargement accueil :", erreur);
    const etatChargement = document.getElementById("etatChargementPopulaires");
    etatChargement.textContent = "Impossible de charger le catalogue pour le moment.";
  }

  // Partagé avec etape1.js (même clé de cache "marchandsActifs") : en revenant sur
  // l'accueil après avoir déjà consulté boutique.html, le catalogue s'affiche
  // instantanément depuis le cache pendant qu'une requête en arrière-plan vérifie
  // s'il y a du nouveau - voir assets/cache.js.
  function charger() {
    if (window.KADOSK_CACHE) {
      KADOSK_CACHE.chargerAvecCache("marchandsActifs", KADOSK_API.getActiveMerchants, appliquerCatalogue).catch(gererEchecChargement);
    } else {
      KADOSK_API.getActiveMerchants().then(appliquerCatalogue).catch(gererEchecChargement);
    }
  }

  charger();
})();
