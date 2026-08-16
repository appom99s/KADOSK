(function () {
  // Echappement HTML pour toute donnée saisie par un tiers non authentifié (nom/email
  // acheteur venant des commandes publiques, etc.) avant insertion via innerHTML.
  // Ne jamais concaténer une valeur non fiable dans du HTML sans passer par cette fonction.
  function echapperHtml(texte) {
    return String(texte === null || texte === undefined ? "" : texte)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  window.KADOSK_ECHAPPER_HTML = echapperHtml;

  // Icônes SVG minimalistes (trait, currentColor) réutilisées dans la sidebar,
  // les cartes KPI et les alertes pour rester cohérent visuellement.
  const ICONES = {
    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    encaisser:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
    commandes:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M12 7v5l3.3 2"/></svg>',
    transactions:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3.2-3.2"/><path d="M20 16H7l3.2 3.2"/></svg>',
    cartes:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h5"/></svg>',
    finances:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><rect x="5" y="11" width="3.4" height="10"/><rect x="10.3" y="6" width="3.4" height="15"/><rect x="15.6" y="14" width="3.4" height="7"/></svg>',
    entreprise:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="18" rx="1"/><path d="M8 7h.01M12 7h.01M8 11h.01M12 11h.01M8 15h.01M12 15h.01"/><path d="M16 10h4v11h-4"/></svg>',
    parametres:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.5 7.5 0 0 0 0-3l1.9-1.3-2-3.4-2.2.7a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.5 2a7.6 7.6 0 0 0-2.6 1.5l-2.2-.7-2 3.4L4.6 10a7.5 7.5 0 0 0 0 3l-1.9 1.3 2 3.4 2.2-.7c.76.66 1.64 1.17 2.6 1.5l.5 2h4l.5-2c.96-.33 1.84-.84 2.6-1.5l2.2.7 2-3.4-1.9-1.3z"/></svg>',
    cloche:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 14.5 18 8Z"/><path d="M10.3 20.5a1.9 1.9 0 0 0 3.4 0"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2"/></svg>',
    clavier:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6"/></svg>',
    coche:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    croix:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    portefeuille:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-4a2 2 0 1 0 0 4"/></svg>',
    banque:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 4l9 6"/><path d="M5 10v9M10 10v9M14 10v9M19 10v9"/><path d="M3 19h18"/></svg>',
    aide:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M9.5 9.3a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 1.8"/><path d="M12 17h.01"/></svg>'
  };

  const GROUPES = [
    {
      titre: null,
      items: [{ fichier: "dashboard.html", libelle: "Dashboard", icone: "dashboard" }]
    },
    {
      titre: "Encaisser",
      items: [{ fichier: "cashier.html", libelle: "Encaisser une carte", icone: "encaisser" }]
    },
    {
      titre: "Commandes",
      items: [{ fichier: "orders.html", libelle: "En attente", icone: "commandes", badge: "pendingOrdersCount" }]
    },
    {
      titre: "Transactions",
      items: [{ fichier: "transactions.html", libelle: "Toutes les transactions", icone: "transactions" }]
    },
    {
      titre: "Cartes cadeaux",
      items: [{ fichier: "gift-cards.html", libelle: "Cartes cadeaux", icone: "cartes" }]
    },
    {
      titre: "Finances",
      items: [{ fichier: "finance.html", libelle: "Finances", icone: "finances" }]
    },
    {
      titre: "Paramètres",
      items: [
        { fichier: "business.html", libelle: "Mon entreprise", icone: "entreprise" },
        { fichier: "settings.html", libelle: "Offre carte cadeau", icone: "parametres" }
      ]
    }
  ];

  function pageActuelle() {
    const segments = window.location.pathname.split("/");
    return segments[segments.length - 1] || "dashboard.html";
  }

  function rendreBarreLaterale(conteneurId) {
    const conteneur = document.getElementById(conteneurId || "kadoskSidebar");
    if (!conteneur) return;

    const actuelle = pageActuelle();

    let html =
      '<div class="kadosk-sidebar-logo"><img src="assets/logo.png" alt="KADOSK" /></div>';

    GROUPES.forEach((groupe) => {
      html += '<div class="kadosk-nav-groupe">';
      if (groupe.titre) {
        html += '<p class="kadosk-nav-titre-groupe">' + groupe.titre + "</p>";
      }
      groupe.items.forEach((page) => {
        const classe = page.fichier === actuelle ? "kadosk-nav-item actif" : "kadosk-nav-item";
        const badgeSpan = page.badge ? '<span class="kadosk-nav-badge" data-badge="' + page.badge + '" style="display:none;"></span>' : "";
        html +=
          '<a class="' + classe + '" href="' + page.fichier + '">' +
          (ICONES[page.icone] || "") +
          "<span>" + page.libelle + "</span>" +
          badgeSpan +
          "</a>";
      });
      html += "</div>";
    });

    conteneur.innerHTML = html;

    if (window.KADOSK_API) {
      window.KADOSK_API.getDashboardStats()
        .then((stats) => {
          const badges = conteneur.querySelectorAll("[data-badge]");
          badges.forEach((badgeEl) => {
            const cle = badgeEl.getAttribute("data-badge");
            const valeur = stats[cle];
            if (valeur) {
              badgeEl.textContent = valeur;
              badgeEl.style.display = "inline-block";
            }
          });
          rendreInfosMarchand(stats);
        })
        .catch(() => {});
    }

    initialiserMenuMobile(conteneur);
  }

  // ---------------------------------------------------------------------
  // Menu mobile : la sidebar (toujours présente dans le HTML de chaque page)
  // devient un tiroir hors écran sous ~860px. On ajoute un bouton hamburger
  // dans l'entête et un overlay pour fermer au clic en dehors, sans avoir à
  // toucher chaque page HTML (elles appellent déjà rendreBarreLaterale).
  // ---------------------------------------------------------------------
  function initialiserMenuMobile(sidebar) {
    if (document.getElementById("kadoskBoutonMenu")) return;

    const entete = document.querySelector(".kadosk-entete");
    if (!entete) return;

    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.id = "kadoskBoutonMenu";
    bouton.className = "kadosk-bouton-menu-mobile";
    bouton.setAttribute("aria-label", "Ouvrir le menu");
    bouton.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
    entete.insertBefore(bouton, entete.firstChild);

    const overlay = document.createElement("div");
    overlay.id = "kadoskSidebarOverlay";
    overlay.className = "kadosk-sidebar-overlay";
    document.body.appendChild(overlay);

    function ouvrirMenu() {
      sidebar.classList.add("ouverte");
      overlay.classList.add("visible");
    }

    function fermerMenu() {
      sidebar.classList.remove("ouverte");
      overlay.classList.remove("visible");
    }

    bouton.addEventListener("click", () => {
      if (sidebar.classList.contains("ouverte")) {
        fermerMenu();
      } else {
        ouvrirMenu();
      }
    });

    overlay.addEventListener("click", fermerMenu);

    sidebar.querySelectorAll("a.kadosk-nav-item").forEach((lien) => {
      lien.addEventListener("click", fermerMenu);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) fermerMenu();
    });
  }

  function initiales(nom) {
    if (!nom) return "M";
    const mots = nom.trim().split(/\s+/).slice(0, 2);
    return mots.map((mot) => mot[0].toUpperCase()).join("") || "M";
  }

  function rendreInfosMarchand(stats) {
    const nomEl = document.querySelector("[data-marchand-nom]");
    const avatarEl = document.querySelector("[data-marchand-avatar]");
    const nom = (stats && stats.merchantName) || "Marchand KADOSK";
    if (nomEl) nomEl.textContent = nom;
    if (avatarEl) avatarEl.textContent = initiales(nom);
  }

  function formaterDateNotif(valeur) {
    if (!valeur) return "";
    const date = new Date(valeur);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR") + " · " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function formaterMontantNotif(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  }

  function rendreEnteteDroite(conteneurId) {
    const conteneur = document.getElementById(conteneurId || "kadoskEnteteDroite");
    if (!conteneur) return;

    conteneur.innerHTML =
      '<div class="kadosk-cloche" id="kadoskCloche">' + ICONES.cloche +
      '<span class="kadosk-cloche-badge" data-badge="pendingOrdersCount" style="display:none;"></span>' +
      '<div class="kadosk-cloche-panneau" id="kadoskClochePanneau" style="display:none;">' +
      '<div class="kadosk-cloche-entete">Commandes en attente</div>' +
      '<div id="kadoskClocheListe"><div class="kadosk-liste-vide">Chargement…</div></div>' +
      '<a href="orders.html" class="kadosk-cloche-voir-tout">Voir toutes les commandes</a>' +
      "</div>" +
      "</div>" +
      '<div class="kadosk-utilisateur">' +
      '<div class="kadosk-utilisateur-nom">' +
      '<div class="nom" data-marchand-nom>Marchand KADOSK</div>' +
      '<div class="role">Marchand · <span id="lienDeconnexion" class="kadosk-lien-deconnexion">Déconnexion</span></div>' +
      "</div>" +
      '<div class="kadosk-avatar" data-marchand-avatar>M</div>' +
      "</div>";

    const cloche = document.getElementById("kadoskCloche");
    const panneau = document.getElementById("kadoskClochePanneau");
    const liste = document.getElementById("kadoskClocheListe");
    let commandesChargees = false;

    function chargerNotifications() {
      if (commandesChargees || !window.KADOSK_API) return;
      commandesChargees = true;
      window.KADOSK_API.getDraftOrders()
        .then((resultat) => {
          const commandes = (resultat.items || []).slice(0, 5);
          if (commandes.length === 0) {
            liste.innerHTML = '<div class="kadosk-liste-vide">Aucune commande en attente</div>';
            return;
          }
          liste.innerHTML = commandes
            .map(
              (commande) =>
                '<a class="kadosk-cloche-item" href="orders.html">' +
                '<div class="kadosk-cloche-item-titre">' + echapperHtml(commande.buyerName || commande.buyerEmail || "Client") + "</div>" +
                '<div class="kadosk-cloche-item-detail">' + formaterMontantNotif(commande.initialBalance) + " DH · " + formaterDateNotif(commande.createdAt) + "</div>" +
                "</a>"
            )
            .join("");
        })
        .catch(() => {
          commandesChargees = false;
          liste.innerHTML = '<div class="kadosk-liste-vide">Impossible de charger les commandes</div>';
        });
    }

    if (cloche) {
      cloche.addEventListener("click", (evenement) => {
        evenement.stopPropagation();
        const estOuvert = panneau.style.display !== "none";
        panneau.style.display = estOuvert ? "none" : "block";
        if (!estOuvert) chargerNotifications();
      });
      panneau.addEventListener("click", (evenement) => evenement.stopPropagation());
      document.addEventListener("click", () => {
        panneau.style.display = "none";
      });
    }

    if (window.KADOSK_API) {
      window.KADOSK_API.getDashboardStats()
        .then((stats) => {
          const badgeEl = conteneur.querySelector('[data-badge="pendingOrdersCount"]');
          if (badgeEl && stats.pendingOrdersCount) {
            badgeEl.textContent = stats.pendingOrdersCount;
            badgeEl.style.display = "flex";
          }
          rendreInfosMarchand(stats);
        })
        .catch(() => {});
    }
  }

  // Identifiant réduit affiché au marchand à la place du vrai code de la carte
  // (jamais renvoyé par le backend) : ex. "KDSK-A1B2-..." -> "A1***".
  function masquerIdentifiantCarte(giftCardId) {
    const brut = (giftCardId || "").replace(/-/g, "");
    return (brut.slice(0, 2).toUpperCase() || "00") + "***";
  }

  window.KADOSK_ICONES = ICONES;
  window.KADOSK_MASQUER_ID = masquerIdentifiantCarte;
  window.KADOSK_NAV = { rendreBarreLaterale, rendreEnteteDroite };
})();
