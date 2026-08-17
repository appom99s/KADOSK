(function () {
  const etatChargement = document.getElementById("etatChargement");
  const etatVide = document.getElementById("etatVide");
  const etatErreur = document.getElementById("etatErreur");
  const grille = document.getElementById("grilleMarchands");

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function charger() {
    try {
      const resultat = await KADOSK_API.getActiveMerchants();
      const marchands = resultat.items || [];

      etatChargement.style.display = "none";

      if (marchands.length === 0) {
        etatVide.style.display = "block";
        return;
      }

      grille.innerHTML = marchands
        .map(
          (m) => `
        <a class="kadosk-carte-marchand" href="fiche-marchand.html?merchantId=${encodeURIComponent(m.merchantId)}" data-accent="${echapperHtml(m.accentColor)}">
          <div class="kadosk-carte-marchand-logo">
            ${m.logoUrl ? `<img src="${echapperHtml(m.logoUrl)}" alt="${echapperHtml(m.businessName)}" />` : `<span>${echapperHtml((m.businessName || "?").slice(0, 1).toUpperCase())}</span>`}
          </div>
          <div class="kadosk-carte-marchand-nom">${echapperHtml(m.name || m.businessName)}</div>
          <div class="kadosk-carte-marchand-desc">${echapperHtml(m.description || m.businessName)}</div>
        </a>
      `
        )
        .join("");
    } catch (erreur) {
      console.error("Erreur chargement boutique :", erreur);
      etatChargement.style.display = "none";
      etatErreur.style.display = "block";
      etatErreur.textContent = "Impossible de charger les commerces pour le moment.";
    }
  }

  charger();
})();
