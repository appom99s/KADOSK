(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "login.html";
    return;
  }

  KADOSK_NAV.rendreBarreLaterale("kadoskSidebar");
  KADOSK_NAV.rendreEnteteDroite("kadoskEnteteDroite");

  let commandes = [];
  let commandeSelectionneeId = null;

  const corpsTable = document.getElementById("corpsTableCommandes");
  const tableCommandes = document.getElementById("tableCommandes");
  const aucuneCommande = document.getElementById("aucuneCommande");
  const panneauValidation = document.getElementById("panneauValidation");
  const champMessage = document.getElementById("champMessage");
  const boutonValider = document.getElementById("boutonValider");
  const messageStatutCommande = document.getElementById("messageStatutCommande");

  document.getElementById("lienDeconnexion").addEventListener("click", () => {
    KADOSK_AUTH.deconnecter();
  });

  function libellePortee(commande) {
    if (commande.scope === "UNIVERSAL") return "Universel";
    if (commande.scope === "DOMAIN") return "Domaine : " + (commande.domain || "");
    return "Marchand uniquement";
  }

  function selectionnerCommande(commande, ligne) {
    commandeSelectionneeId = commande.giftCardId;
    champMessage.value = commande.message || "";
    panneauValidation.style.display = "block";
    messageStatutCommande.textContent = "";

    Array.from(corpsTable.querySelectorAll("tr")).forEach((tr) => tr.classList.remove("kadosk-ligne-selectionnee"));
    ligne.classList.add("kadosk-ligne-selectionnee");
  }

  function rendreTable() {
    corpsTable.innerHTML = "";

    if (commandes.length === 0) {
      tableCommandes.style.display = "none";
      aucuneCommande.style.display = "block";
      panneauValidation.style.display = "none";
      return;
    }

    tableCommandes.style.display = "table";
    aucuneCommande.style.display = "none";

    commandes.forEach((commande) => {
      const ligne = document.createElement("tr");

      const tdMontant = document.createElement("td");
      tdMontant.textContent = commande.initialBalance + " MAD";

      const tdPortee = document.createElement("td");
      tdPortee.textContent = libellePortee(commande);

      const tdClient = document.createElement("td");
      tdClient.textContent = (commande.buyerName || "") + " (" + commande.buyerEmail + ")";

      const tdStatut = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "kadosk-badge kadosk-badge-attente";
      badge.textContent = "En attente";
      tdStatut.appendChild(badge);

      ligne.appendChild(tdMontant);
      ligne.appendChild(tdPortee);
      ligne.appendChild(tdClient);
      ligne.appendChild(tdStatut);
      ligne.style.cursor = "pointer";

      ligne.addEventListener("click", () => selectionnerCommande(commande, ligne));

      corpsTable.appendChild(ligne);
    });
  }

  async function chargerCommandes() {
    try {
      const reponse = await KADOSK_API.getDraftOrders();
      commandes = reponse.items || [];
      rendreTable();
    } catch (erreur) {
      console.error("Erreur chargement commandes :", erreur);
    }
  }

  async function validerCommande() {
    if (!commandeSelectionneeId) {
      return;
    }

    const commande = commandes.find((c) => c.giftCardId === commandeSelectionneeId);
    if (!commande) {
      return;
    }

    boutonValider.disabled = true;
    messageStatutCommande.textContent = "";

    try {
      await KADOSK_API.activateOrder(commande.giftCardId, commande.buyerEmail, commande.buyerName, champMessage.value);

      messageStatutCommande.style.color = "#1faa6c";
      messageStatutCommande.textContent = "Carte activée et envoyée à " + commande.buyerEmail;
      commandeSelectionneeId = null;
      panneauValidation.style.display = "none";

      await chargerCommandes();
    } catch (erreur) {
      messageStatutCommande.style.color = "";
      messageStatutCommande.textContent = "Échec de la validation. Merci de réessayer.";
    } finally {
      boutonValider.disabled = false;
    }
  }

  boutonValider.addEventListener("click", validerCommande);

  chargerCommandes();
})();
