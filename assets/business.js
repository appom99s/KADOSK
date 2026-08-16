(function () {
  function texte(id, valeur) {
    const el = document.getElementById(id);
    if (el) el.textContent = valeur || "—";
  }

  const LIBELLES_STATUT_RIB = {
    NOT_SUBMITTED: "Non renseigné",
    PENDING_VERIFICATION: "En attente de vérification",
    CHANGE_PENDING: "Modification en attente de vérification",
    VERIFIED: "Vérifié"
  };

  async function chargerProfil() {
    try {
      const profil = await KADOSK_API.getMerchantProfile();

      texte("pBusinessName", profil.businessName);
      texte("pLegalName", profil.legalName);
      texte("pLegalForm", profil.legalForm);
      texte("pIce", profil.ice);
      texte("pRc", profil.rc);
      texte("pIf", profil.ifNumber);

      texte("pRepName", [profil.representativeFirstName, profil.representativeName].filter(Boolean).join(" "));
      texte("pRepPhone", profil.representativePhone);
      texte("pRepEmail", profil.representativeEmail);

      texte("pCategory", profil.activityCategory);
      texte("pSubCategory", profil.activitySubCategory);
      texte("pDescription", profil.activityDescription);
      texte("pProducts", profil.productsServices);

      texte("pAddress", profil.address);
      texte("pCity", [profil.city, profil.region].filter(Boolean).join(", "));
      texte("pWebsite", profil.website);

      texte("pBankName", profil.bankName);
      texte("pRib", profil.rib);
      texte("pRibHolder", profil.ribHolderName);
      texte("pRibStatus", LIBELLES_STATUT_RIB[profil.ribStatus] || profil.ribStatus || "Non renseigné");
    } catch (erreur) {
      console.error("Erreur chargement profil marchand :", erreur);
    }
  }

  const LIBELLES_PALIER = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" };
  const COULEURS_PALIER = { BRONZE: "#a5652d", SILVER: "#6b7280", GOLD: "#b8860b" };

  function formaterDateAbonnement(valeur) {
    if (!valeur) return null;
    const date = new Date(valeur);
    return isNaN(date.getTime()) ? null : date.toLocaleDateString("fr-FR");
  }

  async function chargerAbonnement() {
    const lienChanger = document.getElementById("lienChangerAbonnement");
    try {
      const infos = await KADOSK_API.getSubscriptionInfo();

      const elTier = document.getElementById("pPlanTier");
      if (infos.tier && LIBELLES_PALIER[infos.tier]) {
        elTier.textContent = LIBELLES_PALIER[infos.tier] + (infos.planName ? " (" + infos.planName + ")" : "");
        elTier.style.color = COULEURS_PALIER[infos.tier];
        elTier.style.fontWeight = "800";
      } else {
        elTier.textContent = infos.active ? (infos.planName || "Abonnement actif") : "Aucun abonnement actif";
      }

      texte(
        "pPlanCommission",
        infos.commissionRate !== null && infos.commissionRate !== undefined
          ? infos.commissionRate + " %"
          : "Non défini"
      );

      const dateExpiration = formaterDateAbonnement(infos.expirationDate);
      texte("pPlanExpiration", infos.recurring && !dateExpiration ? "Tant que non résilié" : dateExpiration);

      if (!infos.active) {
        texte("pPlanRenewal", "—");
      } else if (infos.recurring) {
        texte("pPlanRenewal", infos.autoRenew ? "Renouvellement automatique" : "Ne se renouvelle pas (résilié)");
      } else {
        texte("pPlanRenewal", "Paiement unique");
      }

      if (lienChanger && infos.changePlanUrl) {
        lienChanger.href = infos.changePlanUrl;
      }
    } catch (erreur) {
      console.error("Erreur chargement abonnement :", erreur);
      texte("pPlanTier", "Indisponible");
    }
  }

  const mdpEtape1 = document.getElementById("mdpEtape1");
  const mdpEtape2 = document.getElementById("mdpEtape2");
  const champNouveauMdp = document.getElementById("champNouveauMdp");
  const champConfirmationMdp = document.getElementById("champConfirmationMdp");
  const champCodeMdp = document.getElementById("champCodeMdp");
  const boutonDemanderCode = document.getElementById("boutonDemanderCode");
  const boutonConfirmerMdp = document.getElementById("boutonConfirmerMdp");
  const messageStatutMdp = document.getElementById("messageStatutMdp");

  async function demanderCode() {
    messageStatutMdp.style.color = "";
    messageStatutMdp.textContent = "";

    const motDePasse = champNouveauMdp.value;
    const confirmation = champConfirmationMdp.value;

    if (!motDePasse || motDePasse.length < 8) {
      messageStatutMdp.textContent = "Le mot de passe doit contenir au moins 8 caractères.";
      return;
    }
    if (motDePasse !== confirmation) {
      messageStatutMdp.textContent = "Les mots de passe ne correspondent pas.";
      return;
    }

    boutonDemanderCode.disabled = true;
    boutonDemanderCode.textContent = "Envoi en cours...";

    try {
      await KADOSK_API.requestPasswordChange(motDePasse);
      mdpEtape1.style.display = "none";
      mdpEtape2.style.display = "block";
      champCodeMdp.focus();
    } catch (erreur) {
      console.error("Erreur demande code changement mot de passe :", erreur);
      messageStatutMdp.textContent = "Une erreur est survenue. Merci de réessayer.";
    } finally {
      boutonDemanderCode.disabled = false;
      boutonDemanderCode.textContent = "Recevoir un code par email";
    }
  }

  async function confirmerCode() {
    messageStatutMdp.style.color = "";
    messageStatutMdp.textContent = "";

    const code = champCodeMdp.value.trim();
    if (!code) {
      messageStatutMdp.textContent = "Merci de saisir le code reçu par email.";
      return;
    }

    boutonConfirmerMdp.disabled = true;
    boutonConfirmerMdp.textContent = "Vérification...";

    try {
      await KADOSK_API.confirmPasswordChange(code);
      messageStatutMdp.style.color = "#1faa6c";
      messageStatutMdp.textContent = "Mot de passe mis à jour avec succès.";
      champNouveauMdp.value = "";
      champConfirmationMdp.value = "";
      champCodeMdp.value = "";
      mdpEtape2.style.display = "none";
      mdpEtape1.style.display = "block";
    } catch (erreur) {
      console.error("Erreur confirmation changement mot de passe :", erreur);
      messageStatutMdp.textContent = "Code invalide ou expiré.";
    } finally {
      boutonConfirmerMdp.disabled = false;
      boutonConfirmerMdp.textContent = "Confirmer le changement";
    }
  }

  boutonDemanderCode.addEventListener("click", demanderCode);
  boutonConfirmerMdp.addEventListener("click", confirmerCode);

  chargerProfil();
  chargerAbonnement();
})();
