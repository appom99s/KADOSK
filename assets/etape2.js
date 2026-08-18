(function () {
  const etatVide = document.getElementById("etatVide");
  const listeLignes = document.getElementById("listeLignes");
  const btnAjouterCarte = document.getElementById("btnAjouterCarte");
  const texteNombreCartes = document.getElementById("texteNombreCartes");
  const texteTotal = document.getElementById("texteTotal");
  const btnRetour = document.getElementById("btnRetour");
  const btnContinuer = document.getElementById("btnContinuer");

  document.getElementById("k2IconePlus").innerHTML = window.KADOSK_ICONE("plus");
  document.getElementById("k2IconeRetour").innerHTML = window.KADOSK_ICONE("arrow-left");
  document.getElementById("k2IconeContinuer").innerHTML = window.KADOSK_ICONE("arrow-right");
  document.getElementById("k2IconeSecurite").innerHTML = window.KADOSK_ICONE("shield-check");

  const PAS_MONTANT_DEFAUT = 50;

  function echapperHtml(valeur) {
    return String(valeur || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
  }

  // Bornes/offre par marchand, chargées une fois (utilisées pour proposer un montant
  // par défaut cohérent et pour le contrôle +/- ; le backend revalide de toute façon
  // tout au moment de la commande - ceci n'est qu'un confort côté client).
  const offresParMarchand = new Map();

  async function chargerOffre(merchantId) {
    if (offresParMarchand.has(merchantId)) return offresParMarchand.get(merchantId);
    try {
      const offre = await KADOSK_API.getGiftCardOffer(merchantId);
      offresParMarchand.set(merchantId, offre);
      return offre;
    } catch (erreur) {
      offresParMarchand.set(merchantId, null);
      return null;
    }
  }

  function bornesPour(offre) {
    const presets = (offre && offre.presetAmounts) || [];
    const min = offre && offre.freeAmountEnabled && offre.freeAmountMin ? offre.freeAmountMin : presets.length ? Math.min(...presets) : PAS_MONTANT_DEFAUT;
    const max = offre && offre.freeAmountEnabled && offre.freeAmountMax ? offre.freeAmountMax : presets.length ? Math.max(...presets) : Infinity;
    const defaut = presets.length ? Math.min(...presets) : min;
    return { min, max, defaut };
  }

  // Bug corrigé : le champ numérique libre (+/- 50 DH, saisie manuelle) était affiché
  // pour TOUS les marchands, y compris ceux n'ayant configuré QUE des montants fixes
  // (freeAmountEnabled = false) - un acheteur pouvait alors taper n'importe quelle
  // valeur entre le plus petit et le plus grand montant proposé (ex: 150 DH alors que
  // seuls 100/200/500 DH sont réellement vendus par ce marchand). Quand le marchand
  // n'autorise pas le montant libre, on affiche désormais uniquement les montants
  // fixes qu'il a réellement configurés (presetAmounts), sous forme de choix discrets.
  function rendreChoixMontant(offre, montantActuel, onChoix) {
    const conteneur = document.createElement("div");

    if (offre && offre.freeAmountEnabled) {
      const { min, max } = bornesPour(offre);
      conteneur.className = "k2-ligne-montant-bloc";
      conteneur.innerHTML = `
        <button type="button" class="k2-btn-rond" data-action="moins">${window.KADOSK_ICONE("minus")}</button>
        <input type="number" class="k2-montant-input" data-role="montant" value="${montantActuel}" min="${min}" ${max !== Infinity ? 'max="' + max + '"' : ""} />
        <span style="font-size:12px;color:var(--k2-texte-clair);">DH</span>
        <button type="button" class="k2-btn-rond" data-action="plus">${window.KADOSK_ICONE("plus")}</button>
      `;
      const input = conteneur.querySelector('[data-role="montant"]');
      const majMontant = (valeur) => {
        const bornee = Math.max(min, max !== Infinity ? Math.min(max, valeur) : valeur);
        input.value = bornee;
        onChoix(bornee);
      };
      conteneur.querySelector('[data-action="moins"]').addEventListener("click", () => majMontant(Number(input.value) - PAS_MONTANT_DEFAUT));
      conteneur.querySelector('[data-action="plus"]').addEventListener("click", () => majMontant(Number(input.value) + PAS_MONTANT_DEFAUT));
      input.addEventListener("change", () => majMontant(Number(input.value) || min));
      return conteneur;
    }

    const presets = (offre && offre.presetAmounts) || [];
    conteneur.className = "k2-ligne-montant-choix";
    conteneur.style.display = "flex";
    conteneur.style.flexWrap = "wrap";
    conteneur.style.gap = "8px";
    conteneur.innerHTML = presets
      .map(
        (montant) =>
          `<button type="button" class="k2-montant-choix-bouton${Number(montant) === Number(montantActuel) ? " actif" : ""}" data-montant="${montant}">${montant} DH</button>`
      )
      .join("");
    conteneur.querySelectorAll("[data-montant]").forEach((bouton) => {
      bouton.addEventListener("click", () => {
        conteneur.querySelectorAll("[data-montant]").forEach((b) => b.classList.remove("actif"));
        bouton.classList.add("actif");
        onChoix(Number(bouton.dataset.montant));
      });
    });
    return conteneur;
  }

  function rendreLogo(logoUrl, nom) {
    return logoUrl
      ? `<img src="${echapperHtml(logoUrl)}" alt="${echapperHtml(nom)}" />`
      : `<span>${echapperHtml((nom || "?").slice(0, 1).toUpperCase())}</span>`;
  }

  async function rendreLigne(ligne) {
    const offre = await chargerOffre(ligne.merchantId);
    const { min, max, defaut } = bornesPour(offre);

    if (!ligne.montant || ligne.montant <= 0) {
      KADOSK_PANIER2.definirMontant(ligne.merchantId, defaut);
      ligne.montant = defaut;
    }

    const div = document.createElement("div");
    div.className = "k2-ligne-carte";
    div.style.flexWrap = "wrap";
    div.style.alignItems = "flex-start";
    div.innerHTML = `
      <div class="k2-ligne-logo">${rendreLogo(ligne.logoUrl, ligne.name)}</div>
      <div class="k2-ligne-info" style="flex-basis:100%;">
        <div class="k2-ligne-nom">${echapperHtml(ligne.name || ligne.businessName)}</div>
        <div class="k2-ligne-cat">${echapperHtml(ligne.category || ligne.businessName)}</div>
        <div style="margin-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--k2-texte-clair);margin-bottom:6px;">Montant</div>
          <div data-zone-montant></div>
        </div>
      </div>
      <button type="button" class="k2-btn-supprimer" data-action="supprimer" title="Supprimer">${window.KADOSK_ICONE("trash-2")}</button>
    `;

    const zoneMontant = div.querySelector("[data-zone-montant]");
    zoneMontant.appendChild(
      rendreChoixMontant(offre, ligne.montant, (bornee) => {
        KADOSK_PANIER2.definirMontant(ligne.merchantId, bornee);
        majTotaux();
      })
    );

    div.querySelector('[data-action="supprimer"]').addEventListener("click", () => {
      KADOSK_PANIER2.retirer(ligne.merchantId);
      rendreTout();
    });

    return div;
  }

  function majTotaux() {
    const lignes = KADOSK_PANIER2.lire();
    texteNombreCartes.textContent = `${lignes.length} carte${lignes.length > 1 ? "s" : ""}`;
    texteTotal.textContent = formaterMontant(KADOSK_PANIER2.totalGeneral());
    btnContinuer.disabled = !KADOSK_PANIER2.toutesLignesOntUnMontant();
  }

  async function rendreTout() {
    const lignes = KADOSK_PANIER2.lire();
    etatVide.style.display = lignes.length === 0 ? "block" : "none";
    listeLignes.innerHTML = "";
    for (const ligne of lignes) {
      listeLignes.appendChild(await rendreLigne(ligne));
    }
    majTotaux();
  }

  btnAjouterCarte.addEventListener("click", () => {
    window.location.href = "boutique.html";
  });
  btnRetour.addEventListener("click", () => {
    window.location.href = "boutique.html";
  });
  btnContinuer.addEventListener("click", () => {
    if (!KADOSK_PANIER2.toutesLignesOntUnMontant()) return;
    window.location.href = "etape-3-recap.html";
  });

  rendreTout();
})();
