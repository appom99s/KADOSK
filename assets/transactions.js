(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "login.html";
    return;
  }

  KADOSK_NAV.rendreBarreLaterale("kadoskSidebar");

  const champCode = document.getElementById("champCode");
  const boutonRechercher = document.getElementById("boutonRechercher");
  const messageErreurRecherche = document.getElementById("messageErreurRecherche");
  const panneauResultats = document.getElementById("panneauResultats");
  const corpsTable = document.getElementById("corpsTableTransactions");

  document.getElementById("lienDeconnexion").addEventListener("click", () => {
    KADOSK_AUTH.deconnecter();
  });

  function libelleAction(action) {
    if (action === "REDEEMED") return "Encaissement";
    if (action === "REDEEM_FAILED") return "Encaissement échoué";
    if (action === "ACTIVATED") return "Activation";
    return action;
  }

  function formaterDate(valeur) {
    if (!valeur) return "";
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? String(valeur) : date.toLocaleString("fr-FR");
  }

  async function rechercher() {
    const code = champCode.value.trim();
    messageErreurRecherche.textContent = "";
    panneauResultats.style.display = "none";

    if (!code) {
      return;
    }

    boutonRechercher.disabled = true;

    try {
      const statut = await KADOSK_API.checkGiftCard(code);
      const entrees = await KADOSK_API.getTransactionLog(statut.giftCardId);

      corpsTable.innerHTML = "";

      (entrees.items || []).forEach((entree) => {
        const ligne = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.textContent = formaterDate(entree.createdAt);

        const tdAction = document.createElement("td");
        tdAction.textContent = libelleAction(entree.action);

        const tdResultat = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "kadosk-badge " + (entree.success ? "kadosk-badge-actif" : "kadosk-badge-neutre");
        badge.textContent = entree.success ? "Réussi" : "Échoué";
        tdResultat.appendChild(badge);

        const tdMontant = document.createElement("td");
        tdMontant.textContent = entree.amount ? entree.amount + " DH" : "—";

        const tdDetail = document.createElement("td");
        tdDetail.textContent = entree.reason || "";

        ligne.appendChild(tdDate);
        ligne.appendChild(tdAction);
        ligne.appendChild(tdResultat);
        ligne.appendChild(tdMontant);
        ligne.appendChild(tdDetail);

        corpsTable.appendChild(ligne);
      });

      panneauResultats.style.display = "block";
    } catch (erreur) {
      console.error("Erreur recherche transactions :", erreur);
      messageErreurRecherche.textContent = "Carte introuvable.";
    } finally {
      boutonRechercher.disabled = false;
    }
  }

  boutonRechercher.addEventListener("click", rechercher);
  champCode.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") rechercher();
  });
})();
