(function () {
  // L'authentification, la barre latérale, l'en-tête et la déconnexion sont
  // gérées par guard.js (chargé avant ce script).

  let commandes = [];
  let commandeSelectionneeId = null;
  let filtreActif = "DRAFT";

  const corpsTable = document.getElementById("corpsTableCommandes");
  const tableCommandes = document.getElementById("tableCommandes");
  const aucuneCommande = document.getElementById("aucuneCommande");
  const texteAucuneCommande = document.getElementById("texteAucuneCommande");
  const panneauValidation = document.getElementById("panneauValidation");
  const champMessage = document.getElementById("champMessage");
  const champRaisonRefus = document.getElementById("champRaisonRefus");
  const boutonValider = document.getElementById("boutonValider");
  const boutonRefuser = document.getElementById("boutonRefuser");
  const messageStatutCommande = document.getElementById("messageStatutCommande");
  const filtres = document.querySelectorAll(".kadosk-filtre");

  function libellePortee(commande) {
    if (commande.scope === "UNIVERSAL") return "Universel";
    if (commande.scope === "DOMAIN") return "Domaine : " + (commande.domain || "");
    return "Marchand uniquement";
  }

  function formaterDate(valeur) {
    if (!valeur) return "—";
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR");
  }

  function badgePourFiltre() {
    if (filtreActif === "ACTIVE") return '<span class="kadosk-badge kadosk-badge-actif">Acceptée</span>';
    if (filtreActif === "REFUSED") return '<span class="kadosk-badge" style="background:var(--kadosk-danger-tint); color:var(--kadosk-danger);">Refusée</span>';
    return '<span class="kadosk-badge kadosk-badge-attente">En attente</span>';
  }

  function selectionnerCommande(commande, ligne) {
    if (filtreActif !== "DRAFT") return;
    commandeSelectionneeId = commande.giftCardId;
    champMessage.value = commande.message || "";
    champRaisonRefus.value = "";
    panneauValidation.style.display = "block";
    messageStatutCommande.textContent = "";

    Array.from(corpsTable.querySelectorAll("tr")).forEach((tr) => tr.classList.remove("kadosk-ligne-selectionnee"));
    ligne.classList.add("kadosk-ligne-selectionnee");
  }

  function rendreTable() {
    corpsTable.innerHTML = "";
    panneauValidation.style.display = "none";
    commandeSelectionneeId = null;

    if (commandes.length === 0) {
      tableCommandes.style.display = "none";
      aucuneCommande.style.display = "block";
      texteAucuneCommande.textContent =
        filtreActif === "DRAFT"
          ? "Les nouvelles commandes de vos clients apparaîtront ici pour approbation."
          : "Aucune commande dans cette catégorie pour le moment.";
      return;
    }

    tableCommandes.style.display = "table";
    aucuneCommande.style.display = "none";

    commandes.forEach((commande) => {
      const ligne = document.createElement("tr");

      const tdMontant = document.createElement("td");
      tdMontant.textContent = (commande.initialBalance != null ? commande.initialBalance : "—") + " DH";

      const tdPortee = document.createElement("td");
      tdPortee.textContent = libellePortee(commande);

      const tdClient = document.createElement("td");
      tdClient.textContent = (commande.buyerName || "") + (commande.buyerEmail ? " (" + commande.buyerEmail + ")" : "");

      const tdDate = document.createElement("td");
      tdDate.textContent = formaterDate(commande.activatedAt || commande.createdAt);

      const tdStatut = document.createElement("td");
      tdStatut.innerHTML = badgePourFiltre();

      ligne.appendChild(tdMontant);
      ligne.appendChild(tdPortee);
      ligne.appendChild(tdClient);
      ligne.appendChild(tdDate);
      ligne.appendChild(tdStatut);

      if (filtreActif === "DRAFT") {
        ligne.style.cursor = "pointer";
        ligne.addEventListener("click", () => selectionnerCommande(commande, ligne));
      }

      corpsTable.appendChild(ligne);
    });
  }

  async function chargerCommandes() {
    try {
      const reponse = await KADOSK_API.getAllGiftCards(filtreActif);
      commandes = (reponse.items || []).filter((c) => c.status === filtreActif);
      rendreTable();
    } catch (erreur) {
      console.error("Erreur chargement commandes :", erreur);
    }
  }

  async function validerCommande() {
    if (!commandeSelectionneeId) return;
    const commande = commandes.find((c) => c.giftCardId === commandeSelectionneeId);
    if (!commande) return;

    boutonValider.disabled = true;
    boutonRefuser.disabled = true;
    messageStatutCommande.textContent = "";

    try {
      await KADOSK_API.activateOrder(commande.giftCardId, commande.buyerEmail, commande.buyerName, champMessage.value);

      messageStatutCommande.style.color = "#1faa6c";
      messageStatutCommande.textContent = "Carte activée et envoyée à " + commande.buyerEmail;
      panneauValidation.style.display = "none";

      await chargerCommandes();
    } catch (erreur) {
      messageStatutCommande.style.color = "";
      messageStatutCommande.textContent = "Échec de la validation. Merci de réessayer.";
    } finally {
      boutonValider.disabled = false;
      boutonRefuser.disabled = false;
    }
  }

  async function refuserCommande() {
    if (!commandeSelectionneeId) return;
    const commande = commandes.find((c) => c.giftCardId === commandeSelectionneeId);
    if (!commande) return;

    if (!window.confirm("Confirmer le refus de cette commande ?")) return;

    boutonValider.disabled = true;
    boutonRefuser.disabled = true;
    messageStatutCommande.textContent = "";

    try {
      await KADOSK_API.refuseOrder(commande.giftCardId, champRaisonRefus.value);

      messageStatutCommande.style.color = "#1faa6c";
      messageStatutCommande.textContent = "Commande refusée.";
      panneauValidation.style.display = "none";

      await chargerCommandes();
    } catch (erreur) {
      messageStatutCommande.style.color = "";
      messageStatutCommande.textContent = "Échec du refus. Merci de réessayer.";
    } finally {
      boutonValider.disabled = false;
      boutonRefuser.disabled = false;
    }
  }

  filtres.forEach((bouton) => {
    bouton.addEventListener("click", () => {
      filtres.forEach((b) => b.classList.remove("actif"));
      bouton.classList.add("actif");
      filtreActif = bouton.getAttribute("data-filtre");
      chargerCommandes();
    });
  });

  boutonValider.addEventListener("click", validerCommande);
  boutonRefuser.addEventListener("click", refuserCommande);

  chargerCommandes();
})();
