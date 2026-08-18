/* ==========================================================================
   DUBOIS — Ébénisterie / Menuiserie
   Interactions : navigation, révélations, filtres, visionneuse, formulaire.
   Sans dépendance. Tout est désactivable via prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------- Année */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ------------------------------------------------- Fondu des images ---- */
  function watchImage(img) {
    if (img.dataset.watched) return;
    img.dataset.watched = '1';
    if (img.complete && img.naturalWidth > 0) { img.classList.add('is-loaded'); return; }
    img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
    img.addEventListener('error', function () { img.classList.add('is-loaded'); }, { once: true });
  }
  $$('.media img').forEach(watchImage);

  /* --------------------------------------------------- En-tête collant --- */
  var header = $('#entete');
  var stuck = false;
  function onScrollHeader() {
    var should = window.scrollY > window.innerHeight * 0.72;
    if (should !== stuck) { stuck = should; header.classList.toggle('is-stuck', should); }
  }
  onScrollHeader();

  /* ----------------------------------------------------- Menu mobile ----- */
  var menu = $('#menu');
  var burger = $('#burger');
  var menuClose = $('#menu-close');
  var lastFocus = null;

  function focusables(root) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', root)
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }

  function trap(e, root) {
    if (e.key !== 'Tab') return;
    var f = focusables(root);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openMenu() {
    lastFocus = document.activeElement;
    menu.removeAttribute('inert');
    menu.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fermer le menu');
    document.body.classList.add('is-locked');
    var f = focusables(menu);
    if (f.length) f[0].focus();
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('inert', '');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Ouvrir le menu');
    document.body.classList.remove('is-locked');
    // le focus revient au déclencheur, ou à défaut au bouton du menu
    var back = (lastFocus && lastFocus !== document.body) ? lastFocus : burger;
    if (back) back.focus();
  }

  if (menu && burger) {
    menu.setAttribute('inert', '');
    burger.addEventListener('click', function () {
      menu.classList.contains('is-open') ? closeMenu() : openMenu();
    });
    if (menuClose) menuClose.addEventListener('click', closeMenu);
    $$('.menu__link', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
      trap(e, menu);
    });
    // Le menu plein écran n'a plus de raison d'être en vue large
    window.matchMedia('(min-width: 62rem)').addEventListener('change', function (e) {
      if (e.matches && menu.classList.contains('is-open')) closeMenu();
    });
  }

  /* ------------------------------------------- Révélation au défilement -- */
  /* Les éléments « mask » et « media » démarrent avec un clip-path qui les
     rend entièrement invisibles ; Chrome en déduit une zone d'intersection
     nulle et l'observateur ne se déclenche jamais. On observe donc leur
     parent (non découpé) et on révèle le groupe entier. */
  if ('IntersectionObserver' in window && !reduced.matches) {
    var cibles = [];   // [élément observé, [éléments à révéler]]
    function groupeDe(target) {
      for (var i = 0; i < cibles.length; i++) {
        if (cibles[i][0] === target) return cibles[i][1];
      }
      var g = []; cibles.push([target, g]); return g;
    }
    $$('[data-reveal]').forEach(function (el) {
      var type = el.getAttribute('data-reveal');
      var clippe = type === 'mask' || type === 'media';
      var target = clippe && el.parentElement ? el.parentElement : el;
      groupeDe(target).push(el);
    });

    /* Les animations rejouent à chaque passage. Deux observateurs :
       — le premier révèle quand l'élément entre dans la zone de lecture ;
       — le second réarme quand il est ressorti entièrement de l'écran,
         jamais avant, pour éviter tout clignotement en cours de lecture. */
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        groupeDe(entry.target).forEach(function (el) {
          el.classList.add('is-in');
          /* Le chargement paresseux natif repose sur la même mesure
             d'intersection que l'observateur : dans un conteneur découpé,
             Chrome ne télécharge jamais l'image. On force le chargement
             au moment précis où le média se révèle. */
          if (el.getAttribute('data-reveal') === 'media') {
            $$('img[loading="lazy"]', el).forEach(function (img) {
              img.loading = 'eager';
            });
          }
        });
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    var rearmer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) return;
        groupeDe(entry.target).forEach(function (el) { el.classList.remove('is-in'); });
      });
    }, { threshold: 0 });

    cibles.forEach(function (c) { revealer.observe(c[0]); rearmer.observe(c[0]); });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ----------------------------------------------- Navigation active ----- */
  var navLinks = $$('.nav__link');
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = navLinks.filter(function (a) {
          return a.getAttribute('href') === '#' + entry.target.id;
        })[0];
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ----------------------------------------------- Filtres réalisations -- */
  var filters = $$('.filter');
  var works = $$('.work');
  var emptyMsg = $('#works-empty');

  function applyFilter(cat) {
    var shown = 0;
    works.forEach(function (w) {
      var match = cat === 'tout' || w.dataset.cat === cat;
      if (match) shown++;
      if (reduced.matches) {
        w.classList.toggle('is-hidden', !match);
        return;
      }
      w.classList.add('is-filtering');
      window.setTimeout(function () {
        w.classList.toggle('is-hidden', !match);
        // laisse le navigateur appliquer display avant de retirer l'opacité
        window.requestAnimationFrame(function () { w.classList.remove('is-filtering'); });
      }, 180);
    });
    if (emptyMsg) emptyMsg.hidden = shown !== 0;
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      applyFilter(btn.dataset.filter);
      window.setTimeout(mosaique, 220);   // après la transition de filtrage
    });
  });

  /* ------------------------------------------------------- Mosaïque ------ */
  /* Chaque carte rejoint la colonne la plus courte. L'équilibrage natif de
     CSS columns dépend du navigateur — Safari laissait une colonne bien plus
     courte que Chrome — alors qu'ici le résultat est identique partout. */
  var grille = $('#works');

  function nbColonnes() {
    var l = window.innerWidth;
    if (l >= 1200) return 3;      // 75rem
    if (l >= 640)  return 2;      // 40rem
    return 1;
  }

  /* Meilleure répartition possible de `hs` sur `n` colonnes, l'ordre du
     document étant conservé à l'intérieur de chaque colonne. Les n premières
     cartes ouvrent chacune une colonne, pour que le haut reste naturel. */
  function repartir(hs, n) {
    var i, j;
    if (n === 1) return { affect: hs.map(function () { return 0; }), ecart: 0 };
    function ecartDe(a) {
      var col = [];
      for (j = 0; j < n; j++) col.push(0);
      for (j = 0; j < a.length; j++) col[a[j]] += hs[j];
      return Math.max.apply(null, col) - Math.min.apply(null, col);
    }
    if (hs.length <= 14) {
      var fixe = Math.min(n, hs.length);
      var libres = hs.length - fixe;
      var meilleur = null, mini = Infinity;
      var total = Math.pow(n, libres);
      for (var essai = 0; essai < total; essai++) {
        var a = [];
        for (i = 0; i < fixe; i++) a.push(i);
        var reste = essai;
        for (i = 0; i < libres; i++) { a.push(reste % n); reste = Math.floor(reste / n); }
        var e = ecartDe(a);
        if (e < mini) { mini = e; meilleur = a; }
      }
      return { affect: meilleur, ecart: mini };
    }
    // au-delà de 14 cartes : remplissage de la colonne la plus courte
    var col = [], affect = [];
    for (i = 0; i < n; i++) col.push(0);
    for (i = 0; i < hs.length; i++) {
      var k = 0;
      for (j = 1; j < n; j++) if (col[j] < col[k]) k = j;
      affect.push(k); col[k] += hs[i];
    }
    return { affect: affect, ecart: Math.max.apply(null, col) - Math.min.apply(null, col) };
  }

  function mosaique() {
    if (!grille) return;
    var n = nbColonnes();
    var cartes = works.filter(function (w) { return !w.classList.contains('is-hidden'); });

    if (n === 1) {                       // une seule colonne : flux naturel
      grille.classList.remove('is-mosaique');
      grille.style.height = '';
      cartes.forEach(function (c) { c.style.width = c.style.left = c.style.top = ''; });
      return;
    }

    var ecart = parseFloat(getComputedStyle(grille).columnGap) || 0;
    grille.classList.add('is-mosaique');

    /* On retient le plus grand nombre de colonnes qui reste équilibré : quatre
       réalisations sur trois colonnes laissent forcément une colonne courte,
       on redescend alors à deux. Jamais en dessous de deux tant que l'écran le
       permet — une colonne unique donnerait des photos démesurées. */
    var plancher = nbColonnes() >= 2 ? 2 : 1;
    var choix = null;
    for (var essai = n; essai >= plancher; essai--) {
      var larg = (grille.clientWidth - ecart * (essai - 1)) / essai;
      var hauteurs = cartes.map(function (c) {
        c.style.width = larg + 'px';
        return c.offsetHeight + ecart;
      });
      var r = repartir(hauteurs, essai);
      if (!choix || r.ecart < choix.ecart) {
        choix = { n: essai, largeur: larg, hs: hauteurs, affect: r.affect, ecart: r.ecart };
      }
      if (r.ecart <= 220) break;   // assez équilibré : on garde le plus de colonnes
    }

    var i;
    cartes.forEach(function (c) { c.style.width = choix.largeur + 'px'; });

    var curseurs = [];
    for (i = 0; i < choix.n; i++) curseurs.push(0);
    cartes.forEach(function (c, idx) {
      var k = choix.affect[idx];
      c.style.left = (k * (choix.largeur + ecart)) + 'px';
      c.style.top  = curseurs[k] + 'px';
      curseurs[k] += choix.hs[idx];
    });

    grille.style.height = (Math.max.apply(null, curseurs) - ecart) + 'px';
  }

  if (grille) {
    mosaique();
    // les hauteurs changent quand une photo ou une police arrive
    $$('.work img').forEach(function (img) {
      img.addEventListener('load', mosaique, { once: true });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(mosaique);
    window.addEventListener('load', mosaique);

    var minuteur = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(mosaique, 120);
    }, { passive: true });
  }

  /* ------------------------------------------------ Fiches projets ------- */
  var PROJETS = {
    'table-frene': {
      cat: 'Mobilier',
      titre: 'Table ronde en frêne massif',
      desc: "Un plateau ovale galbé posé sur un fût octogonal taillé dans la masse. Le trait de refend au centre du plateau et la petite goupille apparente signent l'assemblage plutôt que de le cacher.",
      specs: [['Essence', 'Frêne massif'], ['Type', 'Table de repas'], ['Finition', 'Naturelle, chants adoucis'], ['Particularité', 'Piètement octogonal monobloc']],
      images: [
        ['table-frene-massif', 'Table ronde en frêne massif vue de trois quarts, devant un mur gris foncé.', 1566, 1005]
      ]
    },
    'dressing-chene': {
      cat: 'Rangements',
      titre: "Dressing & bibliothèque d'angle",
      desc: "Un dressing toute hauteur qui file jusqu'au plafond, avec une niche horizontale en chêne qui casse la masse des façades et une colonne de casiers ouverts pour récupérer l'angle.",
      specs: [['Matériaux', 'Panneaux laqués & chêne'], ['Type', 'Dressing toute hauteur'], ['Finition', 'Laque mate, chêne huilé'], ['Détail', 'Poignées bâton en chêne massif']],
      images: [
        ['dressing-chene-ensemble', 'Vue d’ensemble du dressing laqué crème avec bibliothèque latérale en chêne.', 1179, 1334],
        ['dressing-chene-detail', 'Détail de la niche en chêne et des longues poignées bâton.', 1183, 1330]
      ]
    },
    'entree-kaki': {
      cat: 'Agencement',
      titre: "Meuble d'entrée & étagères arrondies",
      desc: "Un volume qui sépare l'entrée du séjour sans fermer l'espace : façades pleines côté entrée, étagères en demi-lune côté pièce à vivre. Le vert kaki assume le meuble comme un élément d'architecture.",
      specs: [['Matériaux', 'Chêne & laque vert kaki'], ['Type', 'Meuble séparateur'], ['Finition', 'Laque mate'], ['Détail', 'Tablettes à chants rayonnés']],
      images: [['entree-claustra-kaki', 'Meuble d’entrée en chêne et laque vert kaki avec étagères arrondies latérales.', 1180, 1333]]
    },
    'cuisine': {
      cat: 'Cuisines',
      titre: 'Cuisine chêne & laque',
      desc: "Meubles hauts en chêne au fil vertical, caissons bas laqués clairs, aucune poignée : la cuisine se lit comme une surface continue. L'éclairage est intégré sous les meubles hauts.",
      specs: [['Matériaux', 'Chêne & panneaux laqués'], ['Type', 'Cuisine linéaire'], ['Finition', 'Laque mate, chêne verni'], ['Détail', 'Ouverture sans poignée']],
      images: [['cuisine-chene-blanc', 'Cuisine linéaire aux meubles hauts en chêne et caissons bas laqués clairs.', 1174, 1339]]
    },
    'claustra': {
      cat: 'Agencement',
      titre: "Claustra & banc d'entrée",
      desc: "Des tasseaux de chêne montés en claustra pour filtrer la vue vers l'escalier sans couper la lumière. Le banc bas prolonge le même vocabulaire et cache les chaussures.",
      specs: [['Essence', 'Chêne massif'], ['Type', 'Claustra & banc'], ['Finition', 'Huilée'], ['Détail', 'Tasseaux au pas régulier']],
      images: [
        ['claustra-chene-escalier', 'Claustra en tasseaux de chêne devant un escalier, avec banc-rangement bas.', 1191, 1321],
        ['claustra-chene-sejour', 'Le même principe de claustra vu depuis le séjour, à contre-jour.', 1186, 1326]
      ]
    },
    'biblio-sauge': {
      cat: 'Rangements',
      titre: 'Bibliothèque & meuble TV sauge',
      desc: "Des tablettes décalées qui montent en escalier autour de l'écran, ponctuées de caissons en chêne. Le meuble bas ferme la composition et absorbe le désordre.",
      specs: [['Matériaux', 'Panneaux laqués & chêne'], ['Type', 'Bibliothèque + meuble TV'], ['Finition', 'Laque vert sauge'], ['Détail', 'Niches chêne en contrepoint']],
      images: [['bibliotheque-tv-sauge', 'Bibliothèque murale vert sauge à tablettes décalées avec niches en chêne.', 1183, 1329]]
    },
    'biblio-bouleau': {
      cat: 'Rangements',
      titre: 'Bibliothèque bouleau & noir',
      desc: "Un damier de casiers de tailles inégales en contreplaqué de bouleau, fonds laqués noirs. Le chant apparent du contreplaqué devient le motif — la matière n'est pas maquillée.",
      specs: [['Matériaux', 'Contreplaqué de bouleau'], ['Type', 'Bibliothèque + meuble TV'], ['Finition', 'Vernis mat, fonds noirs'], ['Détail', 'Chants de contreplaqué apparents']],
      images: [['bibliotheque-bouleau-noir', 'Bibliothèque à casiers irréguliers en contreplaqué de bouleau à fonds noirs.', 1234, 1275]]
    },
    'biblio-blanche': {
      cat: 'Rangements',
      titre: 'Bibliothèque pleine paroi',
      desc: "Toute la longueur du mur, du sol au plafond. Le bandeau bas est calibré au format des vinyles, les casiers hauts alternent les proportions pour éviter l'effet de grille, et quelques niches sont éclairées.",
      specs: [['Matériaux', 'Panneaux laqués'], ['Type', 'Bibliothèque murale'], ['Finition', 'Laque blanche'], ['Détail', 'Modules vinyles & éclairage intégré']],
      images: [['bibliotheque-blanche', 'Bibliothèque blanche occupant tout un mur, avec bandeau bas pour les vinyles.', 1129, 1393]]
    },
    'studio': {
      cat: 'Agencement',
      titre: 'Studio : alcôve, rangements & cuisine',
      desc: "Sur un seul mur : une alcôve de lit encadrée de chêne, des rangements hauts laqués qui filent au plafond et une cuisine complète. Un même volume pour dormir, ranger et cuisiner.",
      specs: [['Matériaux', 'Chêne & panneaux laqués'], ['Type', 'Agencement complet'], ['Finition', 'Laque mate & chêne'], ['Détail', 'Alcôve encadrée toute hauteur']],
      images: [['studio-lit-cuisine', 'Studio agencé : alcôve de lit en chêne, rangements hauts et cuisine intégrée.', 1188, 1324]]
    },
    'bureau-vert': {
      cat: 'Mobilier',
      titre: "Bureau & meuble TV vert d'eau",
      desc: "Un plan de travail en chêne greffé sur une colonne d'étagères, tenu par un piètement acier noir. Le meuble TV suspendu reprend la même teinte et libère le sol.",
      specs: [['Matériaux', 'Panneaux laqués, chêne, acier'], ['Type', 'Bureau + meuble TV'], ['Finition', "Laque vert d'eau"], ['Détail', 'Piètement acier noir']],
      images: [['bureau-tv-vert-eau', "Bureau en chêne sur colonne vert d'eau et meuble TV suspendu assorti.", 1131, 1391]]
    },
    'planche': {
      cat: 'Objets',
      titre: 'Planche à découper en chêne',
      desc: "Taillée dans une pièce de chêne à nœuds qu'on aurait pu écarter : les défauts font le dessin. Manche intégré, chants adoucis, finition alimentaire, gravure au fer.",
      specs: [['Essence', 'Chêne à nœuds'], ['Type', 'Planche à découper'], ['Finition', 'Huile alimentaire'], ['Détail', 'Marquage au fer']],
      images: [['planche-chene-gravee', 'Planche à découper en chêne à nœuds apparents, gravée du nom Dubois.', 1254, 1254]]
    },
    'coquetiers': {
      cat: 'Objets',
      titre: 'Coquetiers gravés',
      desc: "De petites pièces tournées et gravées au prénom, taillées dans les chutes des grands chantiers. Rien ne se jette : la plus belle veine finit souvent sur la table du petit-déjeuner.",
      specs: [['Essence', 'Chêne massif'], ['Type', 'Objets de table'], ['Finition', 'Huile alimentaire'], ['Détail', 'Gravure personnalisée']],
      images: [['coquetiers-graves', 'Trois coquetiers en chêne gravés de prénoms, posés sur un plateau en frêne.', 1129, 1393]]
    }
  };

  var viewer = $('#viewer');
  var viewerPanel = $('.viewer__panel', viewer);
  var lastTrigger = null;

  function openViewer(key, trigger) {
    var p = PROJETS[key];
    if (!p) return;
    lastTrigger = trigger;

    $('#viewer-cat').textContent = p.cat;
    $('#viewer-title').textContent = p.titre;
    $('#viewer-desc').textContent = p.desc;

    $('#viewer-specs').innerHTML = p.specs.map(function (s) {
      return '<div class="viewer__spec"><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>';
    }).join('');

    $('#viewer-gallery').innerHTML = p.images.map(function (im) {
      var tailles = 'sizes="(min-width:48rem) 32rem, 92vw"';
      function jeu(ext) {
        return 'images/' + im[0] + '-640.' + ext + ' 640w, images/' + im[0] + '-1200.' + ext + ' 1200w';
      }
      return '<span class="media" style="--ar:' + im[2] + '/' + im[3] + '">' +
        '<picture>' +
          '<source type="image/avif" srcset="' + jeu('avif') + '" ' + tailles + '>' +
          '<source type="image/webp" srcset="' + jeu('webp') + '" ' + tailles + '>' +
          '<img src="images/' + im[0] + '-640.webp" alt="' + im[1] + '" ' +
          'width="' + im[2] + '" height="' + im[3] + '" decoding="async">' +
        '</picture></span>';
    }).join('');
    $$('#viewer-gallery img').forEach(watchImage);

    viewer.removeAttribute('inert');
    viewer.classList.add('is-open');
    document.body.classList.add('is-locked');
    viewerPanel.scrollTop = 0;
    $('#viewer-close').focus();
  }

  function closeViewer() {
    viewer.classList.remove('is-open');
    viewer.setAttribute('inert', '');
    document.body.classList.remove('is-locked');
    if (lastTrigger) lastTrigger.focus();
  }

  if (viewer) {
    viewer.setAttribute('inert', '');
    $('#viewer-close').addEventListener('click', closeViewer);
    $$('[data-close]', viewer).forEach(function (el) { el.addEventListener('click', closeViewer); });
    viewer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
      trap(e, viewer);
    });
    $$('.work__btn').forEach(function (btn) {
      btn.addEventListener('click', function () { openViewer(btn.dataset.project, btn); });
    });
  }

  /* ----------------------------------------------------- Matières -------- */
  var MATIERES = {
    chene: {
      titre: 'Chêne',
      texte: "Dur, stable, au fil marqué. Il encaisse l'usage quotidien et se patine sans s'abîmer. C'est le bois des pièces qu'on touche : poignées, plans, tasseaux de claustra, chants apparents.",
      img: 'claustra-chene-sejour', alt: 'Claustra en tasseaux de chêne massif filtrant la lumière d’un séjour.', w: 1186, h: 1326
    },
    frene: {
      titre: 'Frêne',
      texte: "Clair, nerveux, très résistant à la flexion. Son fil dessiné supporte les formes galbées et les fortes épaisseurs : c'est l'essence des plateaux massifs et des piètements taillés dans la masse.",
      img: 'table-frene-massif', alt: 'Plateau et piètement en frêne massif d’une table ronde.', w: 1566, h: 1005
    },
    bouleau: {
      titre: 'Contreplaqué de bouleau',
      texte: "Léger, très stable, et surtout beau sur la tranche : ses plis apparents deviennent un motif. Idéal pour les bibliothèques aux longues portées et les caissons dont on assume la structure.",
      img: 'bibliotheque-bouleau-noir', alt: 'Casiers en contreplaqué de bouleau aux chants apparents.', w: 1234, h: 1275
    },
    laque: {
      titre: 'Laque mate',
      texte: "Pour les grandes façades planes où le bois massif travaillerait trop. La laque mate absorbe la lumière, ne renvoie pas de reflets et permet des surfaces continues du sol au plafond.",
      img: 'dressing-chene-ensemble', alt: 'Grandes façades laquées mates d’un dressing toute hauteur.', w: 1179, h: 1334
    },
    couleur: {
      titre: 'Teintes colorées',
      texte: "Vert sauge, kaki, vert d'eau : des couleurs sourdes qui posent le meuble comme un élément d'architecture plutôt que comme un objet rapporté. Elles s'accordent au chêne sans lutter avec lui.",
      img: 'bibliotheque-tv-sauge', alt: 'Bibliothèque laquée vert sauge avec niches en chêne.', w: 1183, h: 1329
    }
  };

  var matImg = $('#mat-img'), matTitle = $('#mat-title'), matText = $('#mat-text');
  $$('.swatch').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var m = MATIERES[btn.dataset.mat];
      if (!m) return;
      $$('.swatch').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      matTitle.textContent = m.titre;
      matText.textContent = m.texte;
      matImg.classList.remove('is-loaded');
      matImg.width = m.w; matImg.height = m.h;
      matImg.alt = m.alt;
      /* Les <source> priment sur le src : sans cette mise à jour, la photo
         ne changerait jamais dans les navigateurs qui lisent l'AVIF. */
      $$('source', matImg.parentElement).forEach(function (s) {
        var ext = s.type === 'image/avif' ? 'avif' : 'webp';
        s.srcset = 'images/' + m.img + '-640.' + ext + ' 640w, ' +
                   'images/' + m.img + '-1200.' + ext + ' 1200w';
      });
      matImg.src = 'images/' + m.img + '-1200.webp';
      matImg.dataset.watched = '';
      watchImage(matImg);
    });
  });

  /* -------------------------------------------------------- FAQ ---------- */
  $$('.faq__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(q.getAttribute('aria-controls'));
      q.setAttribute('aria-expanded', String(!open));
      panel.classList.toggle('is-open', !open);
    });
  });

  /* ---------------------------------------------------- Formulaire ------- */
  var form = $('#devis-form');
  if (form) {
    var submitBtn = $('#devis-submit');
    var okBox = $('#form-ok');
    var errBox = $('#form-err');

    function fieldOf(input) { return input.closest('.field'); }

    function validate(input) {
      var valid = input.checkValidity();
      if (valid && input.id === 'f-message' && input.value.trim().length < 20) valid = false;
      var f = fieldOf(input);
      if (f) f.classList.toggle('has-error', !valid);
      input.setAttribute('aria-invalid', String(!valid));
      return valid;
    }

    var controls = $$('[required]', form);
    controls.forEach(function (input) {
      // Validation à la sortie du champ, jamais à la frappe
      input.addEventListener('blur', function () { validate(input); });
      input.addEventListener('change', function () {
        if (fieldOf(input) && fieldOf(input).classList.contains('has-error')) validate(input);
      });
      input.addEventListener('input', function () {
        if (fieldOf(input) && fieldOf(input).classList.contains('has-error')) validate(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      okBox.classList.remove('is-shown');
      errBox.classList.remove('is-shown');

      var firstBad = null;
      controls.forEach(function (input) {
        if (!validate(input) && !firstBad) firstBad = input;
      });
      if (firstBad) {
        firstBad.focus();
        firstBad.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' });
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Envoi en cours…</span>';

      var data = new FormData(form);
      fetch(form.getAttribute('action') || '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          okBox.classList.add('is-shown');
          form.reset();
          $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
          okBox.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' });
        })
        .catch(function () {
          // Hébergement sans traitement de formulaire (GitHub Pages, ouverture
          // en local…) : on propose un envoi par le client mail, pré-rempli.
          var lien = errBox.querySelector('.form__mailto');
          if (!lien) {
            lien = document.createElement('a');
            lien.className = 'btn form__mailto';
            lien.style.marginTop = 'var(--sp-4)';
            errBox.querySelector('span').appendChild(lien);
          }
          var corps = [
            'Nom : ' + (data.get('nom') || ''),
            'E-mail : ' + (data.get('email') || ''),
            'Téléphone : ' + (data.get('telephone') || '—'),
            'Ville : ' + (data.get('ville') || '—'),
            'Type de projet : ' + (data.get('type') || '—'),
            'Échéance : ' + (data.get('delai') || '—'),
            '',
            data.get('message') || ''
          ].join('\n');
          lien.href = 'mailto:alice.dubois77@yahoo.fr'
            + '?subject=' + encodeURIComponent('Demande de devis — ' + (data.get('type') || 'projet sur mesure'))
            + '&body=' + encodeURIComponent(corps);
          lien.textContent = 'Envoyer par e-mail';
          errBox.classList.add('is-shown');
          errBox.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'auto' : 'smooth' });
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="btn__text">Envoyer ma demande</span>';
        });
    });
  }

  /* --------------------------------------------------- Défilement ------- */
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScrollHeader();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
})();
