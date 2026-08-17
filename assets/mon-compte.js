(function () {
  const CLE_STOCKAGE_EMAIL = "kadosk_compte_email_v2";

  document.getElementById("k2IconeUser").innerHTML = window.KADOSK_ICONE("user");
  document.getElementById("k2IconeMail").innerHTML = window.KADOSK_ICONE("mail");
  document.getElementById("k2IconeCommandes").innerHTML = window.KADOSK_ICONE("clipboard-list");
  document.getElementById("k2IconeCoeur").innerHTML = window.KADOSK_ICONE("heart");
  document.getElementById("k2IconeFleche1").innerHTML = window.KADOSK_ICONE("arrow-right");
  document.getElementById("k2IconeFleche2").innerHTML = window.KADOSK_ICONE("arrow-right");
  document.getElementById("k2IconeDeconnexion").innerHTML = window.KADOSK_ICONE("x");

  const inputEmail = document.getElementById("inputEmail");
  const btnEnregistrer = document.getElementById("btnEnregistrer");
  const btnOublier = document.getElementById("btnOublier");
  const texteEmailCompte = document.getElementById("texteEmailCompte");

  function emailValide(valeur) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valeur || "").trim());
  }

  function majAffichage() {
    const email = localStorage.getItem(CLE_STOCKAGE_EMAIL) || "";
    inputEmail.value = email;
    texteEmailCompte.textContent = email || "Non identifié";
  }

  btnEnregistrer.addEventListener("click", () => {
    const email = inputEmail.value.trim();
    if (!emailValide(email)) return;
    localStorage.setItem(CLE_STOCKAGE_EMAIL, email);
    try {
      sessionStorage.setItem("kadosk_mes_commandes_email", email);
    } catch (erreur) {
      // sans conséquence
    }
    majAffichage();
  });

  btnOublier.addEventListener("click", () => {
    localStorage.removeItem(CLE_STOCKAGE_EMAIL);
    try {
      sessionStorage.removeItem("kadosk_mes_commandes_email");
    } catch (erreur) {
      // sans conséquence
    }
    majAffichage();
  });

  majAffichage();
})();
