(function () {
  const corpsTable = document.getElementById("corpsTableCartes");
  const etatVide = document.getElementById("etatVideCartes");
  const filtres = document.querySelectorAll(".kadosk-filtre");

  let toutesLesCartes = [];
  let filtreActif = "ALL";

  function formaterDate(valeur) {
    if (!valeur) return "—";
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? String(valeur) : date.toLocaleDateString("fr-FR");
  }

  function formaterMontant(valeur) {
    if (valeur === null || valeur === undefined) return "—";
    return Number(valeur).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " DH";
  }

  function codeMasque(giftCardId) {
    return window.KADOSK_MASQUER_ID ? window.KADOSK_MASQUER_ID(giftCardId) : "00***";
  }

  function statutDerive(carte) {
    if (carte.status === "EXPIRED") return "EXPIRED";
    if (carte.status === "ACTIVE" && Number(carte.remainingBalance) <= 0) return "USED";
    return carte.status;
  }

  function badgePourStatut(statutAffiche) {
    if (statutAffiche === "ACTIVE") return '<span class="kadosk-badge kadosk-badge-actif">Active</span>';
    if (statutAffiche === "USED") return '<span class="kadosk-badge kadosk-badge-neutre">Utilisée</span>';
    if (statutAffiche === "EXPIRED") return '<span class="kadosk-badge" style="background:var(--kadosk-danger-tint); color:var(--kadosk-danger);">Expirée</span>';
    return '<span class="kadosk-badge kadosk-badge-neutre">' + statutAffiche + "</span>";
  }

  function appliquerFiltreEtAfficher() {
    const listeFiltree = toutesLesCartes.filter((carte) => {
      const statutAffiche = statutDerive(carte);
      if (filtreActif === "ALL") return statutAffiche !== "DRAFT";
      return statutAffiche === filtreActif;
    });

    corpsTable.innerHTML = "";

    if (listeFiltree.length === 0) {
      etatVide.style.display = "block";
      return;
    }
    etatVide.style.display = "none";

    listeFiltree.forEach((carte) => {
      const ligne = document.createElement("tr");
      const statutAffiche = statutDerive(carte);

      const tdCarte = document.createElement("td");
      tdCarte.textContent = "Carte " + codeMasque(carte.giftCardId);

      const tdClient = document.createElement("td");
      tdClient.textContent = carte.buyerName || carte.buyerEmail || "—";

      const tdCree = document.createElement("td");
      tdCree.textContent = formaterDate(carte.activatedAt || carte.createdAt);

      const tdInitial = document.createElement("td");
      tdInitial.textContent = carte.donneesIllisibles ? "Données illisibles" : formaterMontant(carte.initialBalance);
      if (carte.donneesIllisibles) tdInitial.style.color = "var(--kadosk-danger)";

      const tdRestant = document.createElement("td");
      tdRestant.textContent = carte.donneesIllisibles ? "—" : formaterMontant(carte.remainingBalance);

      const tdStatut = document.createElement("td");
      tdStatut.innerHTML = badgePourStatut(statutAffiche);

      ligne.appendChild(tdCarte);
      ligne.appendChild(tdClient);
      ligne.appendChild(tdCree);
      ligne.appendChild(tdInitial);
      ligne.appendChild(tdRestant);
      ligne.appendChild(tdStatut);

      corpsTable.appendChild(ligne);
    });
  }

  async function chargerCartes() {
    try {
      const resultat = await KADOSK_API.getAllGiftCards();
      toutesLesCartes = resultat.items || [];
      appliquerFiltreEtAfficher();
    } catch (erreur) {
      console.error("Erreur chargement cartes cadeaux :", erreur);
      corpsTable.innerHTML = "";
      etatVide.style.display = "block";
      // DIAGNOSTIC TEMPORAIRE : affiche le détail réel de l'erreur (fourni par le
      // backend pour cet endpoint) directement dans la page, pour identifier la
      // cause sans devoir ouvrir les outils de développement à chaque fois.
      const detail = erreur && (erreur.detail || erreur.message);
      etatVide.textContent = detail
        ? "Impossible de charger les cartes cadeaux. Détail : " + (typeof detail === "string" ? detail : JSON.stringify(detail))
        : "Impossible de charger les cartes cadeaux.";
    }
  }

  filtres.forEach((bouton) => {
    bouton.addEventListener("click", () => {
      filtres.forEach((b) => b.classList.remove("actif"));
      bouton.classList.add("actif");
      filtreActif = bouton.getAttribute("data-filtre");
      appliquerFiltreEtAfficher();
    });
  });

  chargerCartes();
})();
