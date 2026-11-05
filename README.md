# Portfolio, Alexandre Schoukroun

Site statique. Aucune étape de build, aucun framework. HTML, CSS natif et
modules ES. La scène 3D est en Three.js, chargée depuis un CDN via `importmap`.

## Le concept

Une seule scène WebGL, fixe derrière toute la page : un nuage d'environ
42 000 particules (16 000 sur petit appareil) qui change de forme au fil des
sections. L'histoire va du bruit au signal.

| Section | Forme | Ce qui bouge |
|---|---|---|
| Héros | un capteur sphérique | naît d'un nuage de bruit au chargement, une ligne de scan le parcourt, la souris écarte les particules |
| Manifeste | poussière | la phrase s'allume mot à mot au défilement |
| Voir | un oiseau au-dessus d'un radar | battement d'ailes, balayage radar, cadre de suivi HTML et trajectoire prédite |
| Entendre | un spectrogramme 3D | des cris de chauve-souris (balayages en fréquence) défilent |
| Décider | une éolienne et son parc | au premier tiers du chapitre la consigne part, une onde se propage, le rotor s'arrête |
| Expérience, produits, stack, parcours | poussière | parallax au défilement, les points proches vont plus vite |
| Freelance | des blocs empilés | une vague de lumière monte dans la structure |
| Contact | le prénom, écrit en points | un reflet le traverse |

Le titre « Voir, entendre, décider. » sert de sommaire : au défilement, les
trois mots s'écartent, puis chaque verbe a son chapitre, avec le verbe en
contour géant qui traverse l'écran en parallax.

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

Sans WebGL 2, ou si Three.js ne charge pas, la racine reçoit `no-gl` : chaque
emplacement de la scène affiche un motif radar en CSS, et les chapitres cessent
d'être collés (sinon la page offrirait six écrans de vide).

## Tests

```bash
npm install              # three et puppeteer-core, pour les tests seulement
npm test                 # les trois suites
npm run test:scene       # geometrie, enchainement, cadrage (hors navigateur)
npm run test:page        # vrai Chrome : console, scene, traduction, contact
npm run test:responsive  # 7 largeurs, de 375 a 1440
npm run shots            # captures des plans dans tests/shots/
```

**`test:scene`** construit les sept nuages de points avec le vrai code de
production, sans WebGL. Il vérifie ce qui casse en silence : NaN, plages
d'index qui ne correspondent plus à la géométrie (une pale doit rester dans le
disque du rotor, l'oiseau au-dessus du radar), rotations de vue inversibles.
Il pose ensuite chaque forme dans une boîte comme le fait la page, la projette
avec une vraie caméra three.js et contrôle qu'elle tient dans sa boîte,
perspective comprise, au bureau comme sur téléphone.

**`test:page`** pilote le Chrome déjà installé via `puppeteer-core`. Il attrape
ce qu'aucun test hors navigateur ne voit : une scène qui lève au montage, une
clé de traduction absente, et surtout **le récit** : pour chaque section, la
forme affichée doit être la bonne (la scène l'expose dans `data-shape` sur le
canvas). Il vérifie aussi que la consigne d'arrêt part dans le chapitre
Décider, et que le sélecteur du contact change titre et objet du mail.

**`test:responsive`** vérifie à chaque largeur : aucun débordement horizontal,
navigation sur une ligne, titre en trois lignes maximum, bouton d'appel visible
sans défiler, zones tactiles de 24 px, et pour chaque chapitre que la forme a
sa place à l'écran sans passer sous le texte.

`three` est épinglé à la même version dans `package.json` et dans l'`importmap`
de `index.html`. **Si vous changez l'une, changez l'autre**, sinon le test ne
valide plus le code qui part en production.

## Arborescence

```
index.html              structure et contenu
styles/
  tokens.css            couleur, type, espace, couches z
  base.css              reset, typographie, accessibilité
  layout.css            coquille, navigation, couches fixes, emplacements
  components.css        boutons, releve, cadre de suivi, formulaire
  sections.css          une famille de mise en page par section
scripts/
  main.js               point d'entrée
  core/loop.js          boucle rAF unique, phases lecture puis ecriture
  core/theme.js         bascule clair / sombre
  core/i18n.js          bascule francais / anglais
  i18n/en.js            dictionnaire anglais
  core/reveal.js        apparitions et lien de nav actif
  fx/progress.js        variable --p de defilement, lue par le CSS
  fx/parallax.js        decalage des en-tetes de section
  fx/words.js           decoupe du manifeste en mots
  fx/stack-cards.js     pile collee des cartes produit
  fx/marquee.js         bande freelance, pilotee par la vitesse
  fx/magnetic.js        boutons d'appel attires par le pointeur
  ui/contact.js         selecteur projet / recrutement, mail compose
  scene/index.js        rendu, cadrage, suivi de l'oiseau, releve
  scene/shapes.js       les sept nuages de points (fonctions pures)
  scene/shaders.js      morphing, animations par forme, pointeur
  scene/story.js        emplacements HTML vers formes et cadrage
  scene/text-points.js  echantillonnage du prenom dans un canvas 2D
  scene/palette.js      lecture des couleurs dans les tokens CSS
assets/img/             captures servies en WebP, sources PNG dans source/
tests/                  tests hors navigateur, page, responsive
```

## Choix techniques

**Le cadrage 3D est décidé par le CSS.** Chaque forme est rattachée à un
élément vide de la page qui porte `data-shape` (`.slot`). La scène lit sa
boîte à chaque image et y pose la forme. Le responsive se règle donc comme le
reste de la page, avec des media queries, et la 3D suit. Un emplacement
`data-slot="screen"` couvre l'écran (la poussière) : l'élément ne dit alors que
*quand* la forme apparaît.

**La ligne de lecture est le milieu de l'écran.** On cherche les deux
emplacements qui l'encadrent et la transition avance de l'un à l'autre, avec un
palier pour que la forme tienne près de chaque emplacement. Un emplacement
collé (chapitres) reste au milieu de l'écran tant qu'il est épinglé : la forme
y tient sans code de plus.

**Tout le mouvement est sur le GPU.** Chaque particule porte ses positions dans
les sept formes. Le CPU ne pousse que quelques uniformes par image : les deux
formes en cours, l'avancée, le temps, le pointeur. Chaque particule part avec
un léger décalage propre et traverse une turbulence à mi-trajet, ce qui donne
un flux plutôt qu'un fondu. Les plages d'index (`PART`) et les rotations de vue
sont injectées dans le shader depuis `shapes.js` : un seul endroit fait foi.

**Une seule boucle rAF, en deux phases.** Aucun `addEventListener('scroll')`.
Les abonnés `read` mesurent (positions des emplacements, des blocs collés),
puis les abonnés `write` écrivent (styles, rendu). Une lecture après une
écriture forcerait un recalcul de mise en page à chaque image.

**Les effets de défilement passent par `--p`.** `fx/progress.js` pose sur
chaque élément `data-progress` une variable CSS de 0 à 1 ; le CSS en fait une
translation (verbes géants, mots du héros), une opacité (manifeste, étapes) ou
le tracé d'une ligne (méthode freelance). Un seul mécanisme, pas de code par
effet.

**Le parallax écrit dans `translate`, pas dans `transform`.** Les mêmes éléments
portent une transformation d'apparition ; les deux propriétés indépendantes ne
s'écrasent pas.

**La scène lit les tokens CSS.** `--scene-particle` et `--scene-accent`.
Changer de thème déclenche `theme:change` ; en sombre les points s'additionnent
et brillent, en clair ils se superposent normalement (l'addition tendrait vers
le blanc et ferait disparaître la forme).

**Mouvement réduit.** Les formes changent par coupe franche, sans turbulence ni
animation continue, et la scène ne redessine que si quelque chose a changé. Les
mots, le manifeste, la bande et les cartes restent immobiles.

**Chargement.** Three.js n'est demandé qu'après le premier rendu, via
`requestIdleCallback`, pour ne pas peser sur le LCP. Le canvas fait `100lvh` :
sur téléphone, la barre d'adresse qui se replie ne le redimensionne pas.

## Le contact

Le site est statique : le formulaire n'envoie rien à un serveur. Il compose un
mail dans la messagerie du visiteur, objet et message pré-remplis, selon le
public choisi (« J'ai un projet » ou « Je recrute »). Sans JavaScript, le
formulaire fonctionne encore en GET vers `mailto:`, de façon plus brute. Le
bouton « Démarrer un projet » de la section freelance ouvre le contact en mode
projet.

## Langues

Le francais vit dans le HTML : c'est la langue par defaut, la seule qui
s'affiche si le JavaScript ne charge pas. L'anglais est un dictionnaire charge
a la demande et applique aux elements portant `data-i18n`, ou `data-i18n-attr`
pour les attributs. Une cle absente laisse le texte francais en place.

`?lang=en` force la langue a l'ouverture, ce qui rend un lien anglais
partageable. Le choix est ensuite retenu dans `localStorage`.

Trois exceptions écoutent `lang:change` : le relevé de la scène (écrit par le
code), le manifeste (redécoupé en mots après traduction) et l'objet du mail
(relu dans `data-subject`).

Le test de page verifie que **toute cle posee dans le HTML existe dans le
dictionnaire**, et qu'aucune entree du dictionnaire ne sert a rien.

## Responsive

`test:responsive` ouvre la page a sept largeurs, de l'iPhone SE au bureau.

**La barre se degarnit par paliers.** A 1180 le badge freelance passe a sa
forme courte, a 960 les liens secondaires disparaissent, a 620 tous les liens,
a 440 le nom passe aux initiales.

**En portrait, la forme passe au-dessus du texte.** Héros et chapitres
deviennent une colonne : l'emplacement de la scène prend la place libre, le
texte se pose en bas. Attention : dans une colonne flex, un emplacement vide
centré se réduit à une largeur nulle, d'où `align-items: stretch`.

**Les zones tactiles sont etendues par un pseudo-element**, pas par une marge
interieure. Le test POINTE les quatre coins d'un carre de 24 px, ce qui mesure
la zone reellement cliquable.

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

## Mise en ligne

En production sur **GitHub Pages** : <https://alexandreschoukroun.github.io>

Le dépôt s'appelle `Alexandreschoukroun.github.io`, ce qui est la seule forme
servie à la racine du domaine plutôt que dans un sous-chemin. Pages est
configuré sur la branche `main`, dossier racine. Un `git push` de `main` suffit
à déployer, la reconstruction prend une vingtaine de secondes.

`.nojekyll` désactive le traitement Jekyll, actif par défaut sur Pages, pour
que les fichiers soient servis tels quels.

```bash
git push               # deploie
npm run test:live      # controle le site en ligne dans un vrai navigateur
```

Optimisation suivante, si le site doit tenir sans réseau tiers : héberger les
deux familles de caractères et `three.module.js` en local plutôt que par CDN.
