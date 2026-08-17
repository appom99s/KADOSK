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

  // --- Explorer par domaine ---
  const grilleCategories = document.getElementById("grilleCategories");
  (window.KADOSK_CATEGORIES || []).forEach((cat) => {
    const a = document.createElement("a");
    a.className = "k2-categorie-tuile";
    a.href = "boutique.html?categorie=" + encodeURIComponent(cat.valeur);
    a.innerHTML = `<span class="k2-icone-cat">${window.KADOSK_ICONE(cat.icone)}</span><span>${echapperHtml(cat.valeur)}</span>`;
    grilleCategories.appendChild(a);
  });

  function rendreCarteMarchand(marchand, estNouveau) {
    const logo = marchand.logoUrl
      ? `<img src="${echapperHtml(marchand.logoUrl)}" alt="${echapperHtml(marchand.name)}" />`
      : `<span>${echapperHtml((marchand.name || "?").slice(0, 1).toUpperCase())}</span>`;

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
        <div class="k2-carte-select-nom">${echapperHtml(marchand.name)}</div>
        <div class="k2-carte-select-cat">${echapperHtml(marchand.activityCategory || marchand.businessName)}</div>
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

  async function charger() {
    const etatChargement = document.getElementById("etatChargementPopulaires");
    const grillePopulaires = document.getElementById("grillePopulaires");
    const grilleNouveautes = document.getElementById("grilleNouveautes");
    const sectionNouveautes = document.getElementById("sectionNouveautes");
    const grillePourVous = document.getElementById("grillePourVous");
    const sectionPourVous = document.getElementById("sectionPourVous");
    const logosPartenaires = document.getElementById("logosPartenaires");

    try {
      const resultat = await KADOSK_API.getActiveMerchants();
      const marchands = resultat.items || [];
      etatChargement.style.display = "none";

      if (marchands.length === 0) {
        document.getElementById("sectionPopulaires").style.display = "none";
        return;
      }

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
    } catch (erreur) {
      console.error("Erreur chargement accueil :", erreur);
      etatChargement.textContent = "Impossible de charger le catalogue pour le moment.";
    }
  }

  charger();
})();
