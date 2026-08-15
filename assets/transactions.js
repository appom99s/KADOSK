(function () {
  const champRecherche = document.getElementById("champRecherche");
  const corpsTable = document.getElementById("corpsTableTransactions");
  const etatVide = document.getElementById("etatVideTransactions");
  const filtres = document.querySelectorAll(".kadosk-filtre");

  let toutesTransactions = [];
  let filtreActif = "ALL";
  let minuteurRecherche = null;

  const LIBELLES_ACTION = { REDEEMED: "Encaissement", REDEEM_FAILED: "Encaissement échoué", ACTIVATED: "Activation" };

  function formaterDate(valeur) {
    if (!valeur) return "";
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? String(valeur) : date.toLocaleString("fr-FR");
  }

  function formaterMontant(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }

  function codeMasque(giftCardId) {
    return "****" + (giftCardId || "").slice(-4).toUpperCase();
  }

  function appliquerFiltreEtAfficher() {
    const listeFiltree = toutesTransactions.filter((entree) => {
      if (filtreActif === "SUCCESS") return !!entree.success;
      if (filtreActif === "FAILED") return !entree.success;
      return true;
    });

    corpsTable.innerHTML = "";

    if (listeFiltree.length === 0) {
      etatVide.style.display = "block";
      return;
    }
    etatVide.style.display = "none";

    listeFiltree.forEach((entree) => {
      const ligne = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = formaterDate(entree.createdAt);

      const tdCarte = document.createElement("td");
      tdCarte.textContent = "Carte " + codeMasque(entree.giftCardId);

      const tdAction = document.createElement("td");
      tdAction.textContent = LIBELLES_ACTION[entree.action] || entree.action;

      const tdMontant = document.createElement("td");
      tdMontant.textContent = entree.amount ? formaterMontant(entree.amount) + " DH" : "—";

      const tdResultat = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "kadosk-badge " + (entree.success ? "kadosk-badge-actif" : "kadosk-badge-neutre");
      badge.textContent = entree.success ? "Réussie" : "Refusée";
      tdResultat.appendChild(badge);

      ligne.appendChild(tdDate);
      ligne.appendChild(tdCarte);
      ligne.appendChild(tdAction);
      ligne.appendChild(tdMontant);
      ligne.appendChild(tdResultat);

      corpsTable.appendChild(ligne);
    });
  }

  async function chargerTransactions(codeRecherche) {
    try {
      const resultat = await KADOSK_API.getRecentTransactions(codeRecherche || null, 100);
      toutesTransactions = resultat.items || [];
      appliquerFiltreEtAfficher();
    } catch (erreur) {
      console.error("Erreur chargement transactions :", erreur);
      toutesTransactions = [];
      appliquerFiltreEtAfficher();
    }
  }

  champRecherche.addEventListener("input", () => {
    clearTimeout(minuteurRecherche);
    minuteurRecherche = setTimeout(() => {
      chargerTransactions(champRecherche.value.trim());
    }, 400);
  });

  filtres.forEach((bouton) => {
    bouton.addEventListener("click", () => {
      filtres.forEach((b) => b.classList.remove("actif"));
      bouton.classList.add("actif");
      filtreActif = bouton.getAttribute("data-filtre");
      appliquerFiltreEtAfficher();
    });
  });

  chargerTransactions();
})();
