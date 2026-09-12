# Portfolio, Alexandre Schoukroun

Site statique. Aucune étape de build, aucun framework. HTML, CSS natif et
modules ES. La scène 3D est en Three.js, chargée depuis un CDN via `importmap`.

## Démarrer

Le site utilise des modules ES : il doit être **servi en HTTP**. Un double-clic
sur `index.html` ne suffit pas, le navigateur bloque les imports en `file://`.

```
double-cliquez dev.cmd          le plus simple, lance le serveur et ouvre le site
npm run dev                     equivalent en ligne de commande
python -m http.server 5173      sans npm
```

Ouvert malgré tout en `file://`, le site reste lisible : un bandeau explique la
marche à suivre, le contenu s'affiche en entier, seules la scène 3D et les
animations sont désactivées.

### Dégradation

Le contenu est visible par défaut. L'état masqué des apparitions n'existe que
sous la classe `js`, posée par le script du `<head>` et **retirée après 1,8 s si
`main.js` n'a pas démarré**. Une erreur JS, un CDN injoignable ou un `file://`
laissent donc une page complète, jamais une page blanche.

## Tests

```bash
npm install            # three et puppeteer-core, pour les tests seulement
npm test               # les deux suites
npm run test:scene     # geometrie, machine a etats, cadrage (hors navigateur)
npm run test:page      # vrai Chrome : erreurs console, scene, traduction
npm run shots          # idem, plus une capture par plan dans tests/shots/
```

`test:page` pilote le Chrome deja installe via `puppeteer-core`, donc rien a
telecharger. Il attrape ce qu'aucun test hors navigateur ne voit : une scene
qui leve au montage et dont l'erreur est avalee par le repli, un canvas reste
transparent, une cle de traduction absente.

Le test monte la scène hors navigateur, avec le vrai code de production et sans
WebGL. Il vérifie ce qui casse en silence : NaN, index hors bornes, normales
dégénérées, pistes cuivre qui déborderaient du substrat, étapes du cycle jamais
atteintes.

Il vérifie surtout le **cadrage**. Pour chacun des cinq plans, les objets qui
comptent sont projetés en coordonnées écran et le test contrôle qu'ils tiennent
dans l'image, du bon côté : la scène à droite dans le héros où le texte occupe
la colonne de gauche, le sujet à gauche dans les chapitres où le texte passe à
droite. C'est ce qui remplace le fait de regarder le rendu.

`three` est épinglé à la même version dans `package.json` et dans l'`importmap`
de `index.html`. **Si vous changez l'une, changez l'autre**, sinon le test ne
valide plus le code qui part en production.

## Arborescence

```
index.html              structure et contenu
styles/
  tokens.css            couleur, type, espace, profondeur, z-index
  base.css              reset, typographie, accessibilité
  layout.css            coquille, grille, navigation, bloc scène
  components.css        boutons, reveals, puces, HUD
  sections.css          une famille de mise en page par section
scripts/
  main.js               point d'entrée
  core/loop.js          boucle rAF unique de la page
  core/theme.js         bascule clair / sombre
  core/i18n.js          bascule francais / anglais
  i18n/en.js            dictionnaire anglais
  core/reveal.js        apparitions et lien de nav actif
  fx/parallax.js        décalage au défilement
  scene/index.js        assemblage de la scène 3D
  scene/board.js        carte, SoC, pistes cuivre routées en angles droits
  scene/signals.js      capteurs vision, acoustique, radar, et impulsions
  scene/pipeline.js     machine à états du cycle temps réel
  scene/turbine.js      la machine pilotée, en bout de chaîne
  scene/terrain.js      plan de référence lointain
  scene/camera-rig.js   caméra pilotée par le défilement
  scene/palette.js      lecture des couleurs dans les tokens CSS
assets/img/             captures servies en WebP, sources PNG dans source/
tests/                  test de la scène hors navigateur
archive/                l'ancienne version en un seul fichier
```

## Choix techniques

**Une seule boucle rAF.** Aucun `addEventListener('scroll')` sur le site. La
position de défilement est lue une fois par frame dans `core/loop.js`, au moment
où l'on va de toute façon écrire dans le DOM. Les apparitions et le lien de
navigation actif passent par `IntersectionObserver`.

**Le parallax écrit dans `translate`, pas dans `transform`.** Les mêmes éléments
portent une transformation d'apparition ; utiliser les deux propriétés
indépendantes évite qu'elles s'écrasent.

**La scène 3D lit les tokens CSS.** Aucune couleur n'est codée en dur dans le
WebGL. Changer de thème déclenche `theme:change`, la scène relit les variables
et met à jour ses matériaux sans être reconstruite.

**Le cadrage est déclaratif.** Chaque repère de caméra vise un point et applique
un décalage latéral en unités monde le long de son vecteur droit. Positif pousse
le sujet à gauche de l'image, négatif à droite. Viser un point fixe ne suffirait
pas : le décalage voulu dépend de l'orientation de la caméra, qui change à
chaque plan.

**Trois niveaux de repli.** Pas de WebGL, ou Three.js injoignable : le bloc
affiche une composition typographique et le reste de la page fonctionne.
`prefers-reduced-motion` : la scène rend une seule image fixe, le canvas cesse
d'être collant, parallax et apparitions sont désactivés.

**Chargement.** Three.js pèse lourd ; il n'est demandé qu'après le premier
rendu, via `requestIdleCallback`, pour ne pas peser sur le LCP.

## Langues

Le francais vit dans le HTML : c'est la langue par defaut, la seule qui
s'affiche si le JavaScript ne charge pas. L'anglais est un dictionnaire charge
a la demande et applique aux elements portant `data-i18n`, ou `data-i18n-attr`
pour les attributs. Une cle absente laisse le texte francais en place.

`?lang=en` force la langue a l'ouverture, ce qui rend un lien anglais
partageable. Le choix est ensuite retenu dans `localStorage`.

Le HUD de la scene fait exception : son texte est produit par le pipeline et
non par le HTML, il ecoute donc l'evenement `lang:change`.

Le test de page verifie que **toute cle posee dans le HTML existe dans le
dictionnaire**, et qu'aucune entree du dictionnaire ne sert a rien. Chercher
des accents residuels ne marche pas : Beziers et Baccalaureat en gardent.

## Contraste

Les deux thèmes tiennent WCAG AA sur tout le texte. Le jaune haute-visibilité
étant trop clair pour servir de couleur de texte sur fond clair (1,29:1), il
reste toujours un aplat (`--accent`, avec `--accent-ink` par-dessus) et un
second jeton porte l'accent quand il faut écrire (`--accent-text`).

| | sombre | clair |
|---|---|---|
| texte principal | 16,55:1 | 16,69:1 |
| texte secondaire | 7,87:1 | 7,15:1 |
| méta mono | 4,56:1 | 4,61:1 |
| accent en texte | 13,66:1 | 5,58:1 |
| texte sur aplat accent | 13,58:1 | 13,58:1 |

## Images

Les trois captures produit sont servies en WebP, redimensionnées à la largeur
réellement affichée. Les PNG d'origine restent dans `assets/img/source/` et ne
sont pas servis. Pour régénérer après avoir remplacé une source :

```bash
python - <<'EOF'
from PIL import Image
for name, w in {'adscope':1400, 'a2studio':900, 'immocoin':1100}.items():
    im = Image.open(f'assets/img/source/{name}.png').convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height*w/im.width)), Image.LANCZOS)
    im.save(f'assets/img/{name}.webp', 'WEBP', quality=82, method=6)
EOF
```

## À compléter

Ces fichiers sont référencés mais absents. Tant qu'ils manquent, les cartes
affichent un état vide propre plutôt qu'une image cassée.

| Fichier | Format |
|---|---|
| `assets/cv-alexandre-schoukroun.pdf` | le CV, lié depuis le héros |
| `assets/img/og.png` | vignette de partage, 1200x630 |

Les liens GitHub et LinkedIn du pied de page pointent vers les pages d'accueil :
remplacez-les par les profils réels.

## Mise en ligne

En production sur **GitHub Pages** : <https://alexandreschoukroun.github.io>

Le dépôt s'appelle `Alexandreschoukroun.github.io`, ce qui est la seule forme
servie à la racine du domaine plutôt que dans un sous-chemin. Pages est
configuré sur la branche `main`, dossier racine. Un `git push` suffit à
déployer, la reconstruction prend une vingtaine de secondes.

`.nojekyll` désactive le traitement Jekyll, actif par défaut sur Pages, pour
que les fichiers soient servis tels quels.

```bash
git push               # deploie
npm run test:live      # controle le site en ligne dans un vrai navigateur
```

`npm run test:live` lance exactement la même suite que `test:page`, mais contre
l'URL publique. C'est ce qui distingue « le serveur répond » de « la page
fonctionne » : il charge la scène, lit la console et teste la traduction.

Tout autre hébergeur statique conviendrait aussi (Netlify, Vercel, ou nginx sur
le VPS) : il suffit de servir la racine du dépôt.

Optimisation suivante, si le site doit tenir sans réseau tiers : héberger les
deux familles de caractères et `three.module.js` en local plutôt que par CDN.
