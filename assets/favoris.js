(function () {
  const etatChargement = document.getElementById("etatChargement");
  const etatVide = document.getElementById("etatVide");
  const grille = document.getElementById("grilleFavoris");
  const texteNombreFavoris = document.getElementById("texteNombreFavoris");

  document.getElementById("k2IconeCoeurVide").innerHTML = window.KADOSK_ICONE("heart");

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function rendreCarte(marchand) {
    const div = document.createElement("div");
    div.className = "k2-carte-select";
    div.style.cursor = "default";
    const nomAffiche = marchand.businessName || marchand.name || "";
    const logo = marchand.logoUrl
      ? `<img src="${echapperHtml(marchand.logoUrl)}" alt="${echapperHtml(nomAffiche)}" />`
      : `<span>${echapperHtml((nomAffiche || "?").slice(0, 1).toUpperCase())}</span>`;

    div.innerHTML = `
      <button type="button" class="k2-favori-btn actif" data-retirer>${window.KADOSK_ICONE("heart")}</button>
      <a href="fiche-marchand.html?merchantId=${encodeURIComponent(marchand.merchantId)}" style="display:contents;">
        <div class="k2-carte-select-logo">${logo}</div>
        <div class="k2-carte-select-nom">${echapperHtml(nomAffiche)}</div>
        ${marchand.name && marchand.name !== nomAffiche ? `<div class="k2-carte-select-entreprise">${echapperHtml(marchand.name)}</div>` : ""}
        <div class="k2-carte-select-cat">${echapperHtml(marchand.activityCategory || "")}</div>
      </a>
      <button type="button" class="k2-btn k2-btn-secondaire" data-ajouter-panier style="width:100%; padding:8px; font-size:12.5px; margin-top:4px;">
        Ajouter au panier
      </button>
    `;

    div.querySelector("[data-retirer]").addEventListener("click", (evenement) => {
      evenement.preventDefault();
      KADOSK_FAVORIS.retirer(marchand.merchantId);
      div.remove();
      majCompteur();
    });

    div.querySelector("[data-ajouter-panier]").addEventListener("click", (evenement) => {
      evenement.preventDefault();
      KADOSK_PANIER2.selectionner({
        merchantId: marchand.merchantId,
        businessName: marchand.businessName,
        name: marchand.name,
        logoUrl: marchand.logoUrl,
        category: marchand.activityCategory,
        accentColor: marchand.accentColor
      });
      window.location.href = "etape-2-montant.html";
    });

    return div;
  }

  function majCompteur() {
    texteNombreFavoris.textContent = String(grille.children.length);
    if (grille.children.length === 0) {
      etatVide.style.display = "block";
    }
  }

  async function charger() {
    // Fusionne d'abord les favoris enregistrés sur un autre appareil (si un email a
    // été identifié ailleurs dans le parcours) avant de lire la liste locale.
    const idsFavoris = await KADOSK_FAVORIS.synchroniser();
    etatChargement.style.display = "none";

    if (idsFavoris.length === 0) {
      etatVide.style.display = "block";
      return;
    }

    try {
      const resultat = await KADOSK_API.getActiveMerchants();
      const marchands = (resultat.items || []).filter((m) => idsFavoris.includes(m.merchantId));

      if (marchands.length === 0) {
        etatVide.style.display = "block";
        return;
      }

      marchands.forEach((m) => grille.appendChild(rendreCarte(m)));
      majCompteur();
    } catch (erreur) {
      console.error("Erreur chargement favoris :", erreur);
      etatVide.style.display = "block";
    }
  }

  charger();
})();
