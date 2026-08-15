(function () {
  if (!KADOSK_AUTH.estConnecte()) {
    window.location.href = "login.html";
    return;
  }

  KADOSK_NAV.rendreBarreLaterale("kadoskSidebar");

  const lienDeconnexion = document.getElementById("lienDeconnexion");
  if (lienDeconnexion) {
    lienDeconnexion.addEventListener("click", () => {
      KADOSK_AUTH.deconnecter();
    });
  }
})();
