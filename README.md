# Site Alice Dubois — Ébénisterie / Menuiserie

Site vitrine une page, statique, sans dépendance ni étape de build.
Déployable tel quel sur Netlify, Vercel, GitHub Pages ou n'importe quel hébergeur.

---

## À compléter avant la mise en ligne

Ces points demandent des informations que je n'avais pas. Tout le reste est prêt.

| Où | Quoi |
|---|---|
| `mentions-legales.html` | **Adresse de l'atelier, forme juridique, SIRET, TVA, assurance professionnelle.** Obligatoire en France (art. 6 III de la LCEN). L'assurance décennale doit être mentionnée dès lors que des ouvrages sont fixés au bâti. |
| `index.html` — pied de page | La ligne « Atelier & rendez-vous sur prise de contact préalable » peut être remplacée par l'adresse réelle. |
| `index.html` — FAQ | Les réponses sur les **délais** et les **prix** restent volontairement sans chiffres. À préciser selon la réalité de l'atelier. |
| `index.html` — `<link rel="canonical">`, `og:image`, `sitemap.xml`, `robots.txt` | Remplacer `alicedubois.fr` par le domaine définitif. |
| Témoignages clients | Section volontairement absente : je n'invente pas d'avis. Le bloc est prêt à écrire dès que de vrais retours sont disponibles (voir « Ajouter des témoignages » plus bas). |

## Mise en ligne

Le site est un dossier statique : il fonctionne sur n'importe quel hébergeur, sans build.

**Adresse actuelle : https://alice-dubois.pages.dev** — Cloudflare Pages, sous le compte
Maison Bel Œuvre (`contact@maison-beloeuvre.com`), le même qui sert déjà maisonbeloeuvre.fr.

**Deux réglages « démo » à retirer le jour de la vraie mise en ligne :**

1. `index.html` — la balise `<meta name="robots" content="noindex, nofollow">`
2. `_headers` et `netlify.toml` — la ligne `X-Robots-Tag`

### Redéployer sur Cloudflare Pages

```bash
cd "/Users/mathisauffray/Documents/Claude code/ebeniste-dubois" && npx wrangler pages deploy . --project-name alice-dubois --branch main --commit-dirty=true
```

Les en-têtes sont dans `_headers` (équivalent Cloudflare de `netlify.toml`).
Cloudflare sert les pages sans l'extension `.html` : `mentions-legales.html` est redirigé
en 308 vers `mentions-legales`, les liens internes fonctionnent sans changement.

### Adresse définitive

Le domaine `alicedubois.fr` était libre à la livraison (vérifié auprès de l'AFNIC), tout
comme `ebenisterie-dubois.fr` et `dubois-ebenisterie.fr`. C'est vers `alicedubois.fr` que
pointent déjà la balise canonique et les données structurées.

En attendant, un sous-domaine de l'agence est possible sans rien acheter :
`alice-dubois.maisonbeloeuvre.fr`, à rattacher au projet Pages depuis le tableau de bord
Cloudflare — le domaine y est déjà géré.

### Miroir GitHub Pages

Le dépôt `mathisauffray91-a11y/alice-dubois-site` reste publié sur
`https://mathisauffray91-a11y.github.io/alice-dubois-site/`. Il sert de sauvegarde et
d'historique ; l'adresse à communiquer est celle de Cloudflare.

### Netlify

Le projet `alice-dubois` y est créé mais **les déploiements sont bloqués** :
`Account credit usage exceeded`. Netlify reste le seul des trois à traiter le formulaire
de devis automatiquement ; sur Cloudflare et GitHub, le repli par e-mail prend le relais.

## Structure

```
index.html              la page (une seule)
mentions-legales.html   mentions légales + RGPD
assets/styles.css       styles, jetons de design, points de rupture
assets/app.js           interactions, sans dépendance
assets/brand/           logo extrait de la photo, favicons, motif de veines
images/                 photos optimisées (WebP 640 + 1200)
netlify.toml            en-têtes de sécurité et de cache
```

## Identité

Le site reprend l'identité existante, échantillonnée directement sur les photos fournies :

| Rôle | Valeur | Origine |
|---|---|---|
| Camel (marque) | `#B88A58` | fond du logo |
| Terracotta (accent) | `#8E463B` | carte de visite |
| Vert sauge | `#6F817A` | laques des réalisations |
| Encre | `#1B1714` | — |
| Papier | `#F7F3EB` | — |

- **Logo** : extrait de la photo du logo carré, détouré en PNG à canal alpha, utilisé en masque CSS (`assets/brand/logo-*.png`). Il se recolore donc automatiquement selon le fond — blanc sur le hero, encre sur l'en-tête collant.
- **Motif de veines** (`assets/brand/veine.svg`) : recréation vectorielle du dessin de contours des cartes de visite. Généré, donc modifiable.
- **Matière** : grain de papier en surimpression sur toute la page (`body::after`), fonds kraft et
  béton, et une trame verticale discrète aux marges sur grand écran — un rappel de plan coté.
- **Typographie** : Fraunces (titres), Archivo (textes), JetBrains Mono (étiquettes techniques).
  Les trois sont **auto-hébergées** dans `assets/fonts/` : fichiers variables réduits aux
  seuls caractères et axes utilisés — **145 Ko au total** contre 223 à 306 Ko via Google Fonts,
  et aucune requête vers un tiers.

Le terracotta descend à 2,6:1 sur fond sombre : dans les sections sombres, `--accent` bascule automatiquement sur le camel (5,6:1).

## Contenu modifiable

**Ajouter une réalisation** — deux endroits :
1. `index.html`, dans `.works` : dupliquer un `<article class="work">`, ajuster `data-cat`, `data-project`, `--ar` (ratio réel de la photo), `--ph` (couleur moyenne, pour le fond de chargement) et le texte alternatif.
2. `assets/app.js`, objet `PROJETS` : ajouter une entrée avec la même clé que `data-project`.
3. Mettre à jour les compteurs des filtres dans `.filter__n`.

**Préparer une photo** — commande utilisée pour l'existant :
```bash
python3 -c "
from PIL import Image
im = Image.open('photo.jpg').convert('RGB')
print('couleur moyenne :', '#%02X%02X%02X' % im.resize((1,1)).getpixel((0,0)))
print('ratio :', im.size)
for w in (640, 1200):
    r = im if im.width <= w else im.resize((w, round(im.height*w/im.width)), Image.LANCZOS)
    r.save('images/mon-projet-%d.webp' % w, 'WEBP', quality=80, method=5)
"
```

**Ajouter des témoignages** — insérer avant la section `#devis` :
```html
<section class="section section--kraft" aria-labelledby="avis-titre">
  <div class="wrap">
    <div class="section__head"><div data-reveal>
      <p class="label" style="margin-bottom:var(--sp-5)">Avis clients</p>
      <h2 class="h-display h-2" id="avis-titre">Ce qu'en disent les clients</h2>
    </div></div>
    <div class="objets__rail">
      <blockquote class="objet" data-reveal>
        <p class="atelier__quote" style="border-color:var(--terracotta)">Citation réelle du client.</p>
        <p style="margin-top:var(--sp-4)"><strong>Prénom N.</strong> — type de projet</p>
      </blockquote>
      <!-- répéter -->
    </div>
  </div>
</section>
```

**Matières** : les cinq entrées vivent dans l'objet `MATIERES` de `assets/app.js` et les boutons correspondants dans `index.html`.

## Photos

Les 22 visuels principaux ont été **régénérés par IA générative** (ChatGPT Image) à partir
des captures d'écran d'origine, puis intégrés tels quels — sans retouche de couleur, ces
images étant déjà étalonnées. Seul un léger renforcement est appliqué après réduction,
une réduction adoucissant toujours l'image.

Sources conservées dans `Clients/ebeniste.dubois/Photos-HD/`.

### Ce qu'il faut savoir sur ces images

**Ce ne sont pas des agrandissements : ce sont des régénérations.** Un modèle génératif
redessine l'image plutôt que de l'agrandir. Sur le test de la table en frêne, comparé à
l'original : plateau devenu une ellipse franche au lieu d'un ovale carré, incrustation
centrale de forme différente, piètement plus étroit, sol noir au lieu de bleu marine,
veinage entièrement réinventé.

Deux conséquences à garder en tête :

1. **Ce sont des représentations, pas des preuves.** Un client qui commande d'après ces
   photos peut recevoir un meuble visiblement différent. À arbitrer avec Alice.
2. **Le gain est esthétique, pas en résolution.** Ces fichiers font environ 1,5 Mpx,
   contre 1,09 Mpx pour les captures d'origine — et 8,29 Mpx pour de la vraie 4K.

Bonne surprise en revanche : le logo DUBOIS gravé et les prénoms « Claude » et « Sylvie »
sont restés parfaitement lisibles, alors que c'était le risque principal attendu.

### Deux originaux conservés

- `table-frene-detail` — deuxième photo de la fiche table
- `logo-carre` — source du favicon et du logo du site : à ne jamais régénérer

### Formats servis

`<picture>` avec AVIF en premier et WebP en repli, en deux largeurs (640 et 1200 px).
À qualité équivalente l'AVIF est 22 à 24 % plus léger ; un visiteur moderne ne
télécharge que lui.

### Le chemin qui reste ouvert

Si Alice fournit ses originaux de pellicule (probablement 12 Mpx), on obtient du détail
**réel** plutôt que recomposé — et le doute sur la fidélité disparaît. Les fichiers doivent
être transmis par AirDrop ou en « taille réelle », jamais par messagerie ni capture d'écran.

## Ce qui a été vérifié

- **Rendu** : 375×667, 390×844, 768×1024, 1280×800, 1440×700, 1440×900. Aucun débordement horizontal.
- **Contraste** : audit automatique sur 197 éléments de texte → **0 échec WCAG AA**, marge la plus juste à 4,87:1. Le texte du hero, posé sur photo, est mesuré sur les pixels réellement composités (pire cas 5,02:1 pour le sur-titre, 11:1 pour le paragraphe).
- **Polices** : les 4 fichiers se chargent, aucun repli système, **aucune requête tierce**.
- **Clavier** : piège de focus dans le menu et la visionneuse, fermeture par `Échap`, focus rendu au déclencheur, `inert` sur les couches masquées, lien d'évitement.
- **Formulaire** : validation à la sortie du champ (jamais à la frappe), focus automatique sur le premier champ invalide, messages d'erreur qui indiquent la correction, `aria-invalid`, `role="alert"`.
- **Mouvement réduit** : sous `prefers-reduced-motion`, animations et caches neutralisés ; le grain, qui est une texture statique, est conservé.
- **Sémantique** : 1 seul `h1`, 44 titres sans saut de niveau.
- **Cibles tactiles** : minimum 44 px (bouton menu mesuré à 48×48).
- **Assets** : 44 ressources servies en 200, aucune référence ni ancre cassée.
- **Images** : aucune photo d'archive ni banque d'images — les 21 visuels sont ceux de l'atelier. Deux photos issues de captures de réseaux sociaux ont été recadrées pour retirer une icône de profil et un reste de filigrane.

## Note sur les polices

Les polices sont déjà auto-hébergées : rien à faire.

Pour les régénérer après un changement de graisse ou de caractères, il faut `fonttools` et `brotli`
(`pip install fonttools brotli`), puis réduire les fichiers variables aux axes réellement pilotés
par le CSS — c'est ce qui fait passer le total de 360 Ko à 145 Ko. Les plages actuelles sont :
Fraunces `wght 400-700` + `SOFT 0-100` (`opsz` et `WONK` figés), Archivo `wght 400-700`,
JetBrains Mono `wght 400-500`.
