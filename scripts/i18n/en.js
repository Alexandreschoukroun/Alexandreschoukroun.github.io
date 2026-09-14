/**
 * en.js
 * Version anglaise. Le francais reste dans le HTML : c'est la langue par
 * defaut et la seule qui s'affiche si ce module ne charge pas.
 *
 * Les cles suivent l'ordre de la page. Une cle absente laisse simplement le
 * texte francais en place, ce qui evite les trous a la traduction.
 */

export const EN = {
  /* --- metadonnees ----------------------------------------------------- */
  'meta.title': 'Alexandre Schoukroun, embedded and real-time C++ developer',
  'meta.description':
    'Embedded and real-time C++ developer. Computer vision, acoustics and radar for wildlife detection on wind farms. Three SaaS products in production.',
  'meta.ogDescription':
    'Three years building the wildlife detectors that stop wind turbines before impact. C++17, computer vision, signal processing.',

  /* --- navigation ------------------------------------------------------- */
  'nav.skip': 'Skip to content',
  'nav.system': 'System',
  'nav.experience': 'Experience',
  'nav.products': 'Products',
  'nav.stack': 'Stack',
  'nav.contact': 'Contact',
  'nav.themeLight': 'Light',
  'nav.themeDark': 'Dark',
  'nav.langLabel': 'Passer le site en français',

  /* --- scene ------------------------------------------------------------ */
  'viz.fallback': '3D rendering unavailable on this device',
  'viz.alt':
    'Animated reconstruction of an embedded processing chain: a circuit board whose central processor receives three sensor streams, vision, acoustics and radar, then issues a stop command to the machine it drives.',
  'anno.vision': 'Vision sensor',
  'anno.chip': 'Compute unit',
  'anno.machine': 'Driven machine',
  'hud.note': 'Processing chain, simulation',
  'hud.acquire': 'Acquisition',
  'hud.acquireMetric': '3 sensor streams',
  'hud.track': 'Processing and tracking',
  'hud.trackMetric': '40 frames/s',
  'hud.decide': 'Decision',
  'hud.decideMetric': 'command sent',
  'hud.act': 'Machine stopped',
  'hud.actMetric': 'rotor spinning down',

  /* --- heros ------------------------------------------------------------ */
  'hero.h1a': 'See, hear,',
  'hero.h1b': 'decide',
  'hero.lead':
    'Embedded and real-time C++ developer. Vision, acoustics and radar: from sensor to decision, in milliseconds.',
  'hero.ctaContact': 'Get in touch',
  'hero.ctaCv': 'Download CV',

  /* --- le systeme ------------------------------------------------------- */
  'sys.title': 'From sensor to machine, in a single cycle.',
  'sys.lead':
    'The scene shows the chain I build: three sensor streams, an embedded compute unit, and a command going back out to the machine being driven.',
  'sys.ch1Title': 'Acquisition',
  'sys.ch1Body':
    'Camera, ultrasonic microphone and radar sweep the sector continuously and push their streams to the compute unit, without ever dropping the frame rate.',
  'sys.ch2Title': 'Processing and tracking',
  'sys.ch2Body':
    'The compute unit fuses the three sources. Each detected target is tracked by a Kalman filter, which reconstructs its trajectory.',
  'sys.fusion': 'Sensor fusion',
  'sys.realtime': 'Real time',
  'sys.ch3Title': 'Decision',
  'sys.ch3Body':
    'When a trajectory crosses the risk zone, the command goes out on the bus to the machine. At Biodiv-Wind, that means a wind turbine stops.',

  /* --- experience ------------------------------------------------------- */
  'xp.title': 'Three years on a product installed in the field.',
  'xp.lead':
    'Latency, hardware and weather constraints. A Scrum team, TDD and continuous integration. Alongside that, I design and run my own products, which taught me to hold an architecture together over time.',
  'xp.bwRole': 'Embedded software developer, apprenticeship',
  'xp.bwRail': '3 detection systems<br>Architecture through deployment',
  'xp.bwBody':
    'I carried the detection and decision software that equips wind farms, from proof of concept to the version installed on site. Sprints, code reviews, pair programming, tests first.',
  'xp.safewindBody':
    'Real-time vision: camera acquisition, bird detection and trajectory tracking with a Kalman filter, then turbine shutdown when a bird enters the risk zone.',
  'xp.audiobatBody':
    'Acoustic detection of bats: ultrasound acquisition, signal processing and classification of passes, on resource-constrained hardware.',
  'xp.radarBody':
    'Integration of a Furuno radar and use of its echoes to detect approaches beyond camera range, with fusion of the detection sources.',
  'xp.bwServices':
    'On the services side: REST servers in C++ with Drogon, Qt supervision interfaces, Docker containerisation and deployment onto field machines.',
  'xp.teoolaRole': 'Web developer, two BTS internships',
  'xp.teoolaBody':
    'Websites and applications for a range of clients, in PHP and Symfony, from front-end to production release. First contact with agency pace and delivering in front of a client.',
  'xp.auchanRole': 'Order picker and driver, Béziers',
  'xp.auchanBody':
    'Order preparation and stock management alongside my studies. Three years of paced work, reliability and direct customer contact.',

  /* --- produits --------------------------------------------------------- */
  'prod.title': 'What I run outside of work.',
  'prod.lead':
    'Three products I carry alone or with one partner, from code to production, with real users on the other end.',
  'prod.adscopeTag': 'SaaS, paying customers',
  'prod.adscopeBody':
    'Chrome extension and dashboard that turn the Facebook Ad Library into an analytics tool: ad spend estimation, Shopify store detection, hook analysis, CSV export. Freemium, English-speaking audience.',
  'prod.adscopeAlt': 'AdScope home page showing analysis of a Facebook Ad Library search',
  'prod.a2Tag': 'Web agency, co-founded',
  'prod.a2Body':
    'Websites, brand identity, local SEO and hosting for local businesses. The point is that a small outfit should exist online as well as a large one.',
  'prod.a2Alt': 'A2 Studio home page, web agency',
  'prod.a2Meta4': 'Hosting',
  'prod.immoTag': 'Chrome extension',
  'prod.immoBody':
    'Plugs straight into LeBonCoin listings and shows cash flow, net yield and market prices. Settle an investment in seconds instead of opening a spreadsheet.',
  'prod.immoAlt': 'ImmoCoin computing the cash flow of a property listing on LeBonCoin',
  'prod.shotMissing': 'Screenshot to add',

  /* --- stack ------------------------------------------------------------ */
  'stack.title': 'Stack',
  'stack.lead': 'What I actually use, in production and in the field.',
  'stack.g1': 'Real-time and embedded',
  'stack.g2': 'Vision, models and AI',
  'stack.g3': 'Web, API and data',
  'stack.g4': 'Infrastructure, tooling and method',
  'stack.signal': 'Signal processing',
  'stack.acoustics': 'Acoustics',
  'stack.embeddedLinux': 'Embedded Linux',
  'stack.tracking': 'Object tracking',
  'stack.kalman': 'Kalman filter',

  /* --- parcours --------------------------------------------------------- */
  'path.title': 'Background',
  'path.education': 'Education',
  'path.languages': 'Languages',
  'path.master': "Master's in Computer Science",
  'path.masterWhere': 'EPSI Montpellier, RNCP level 7 qualification',
  'path.bachelor': "Bachelor's in Application Design and Development",
  'path.bachelorWhere': 'EPSI Montpellier',
  'path.bts': 'BTS SIO, software solutions track',
  'path.btsWhere': 'CNED',
  'path.bac': 'French Baccalauréat',
  'path.bacWhere': 'Mathematics and engineering sciences',
  'path.french': 'French',
  'path.frenchLevel': 'Native',
  'path.english': 'English',
  'path.englishLevel': 'C1 level',
  'path.englishWhere': 'Technical reading and daily written exchanges',

  /* --- contact ---------------------------------------------------------- */
  'contact.title': 'Available for an embedded C++ role.',
  'contact.lead':
    'Real time, vision, signal processing, on a product with genuine hardware constraints. Write to me, I answer the same day.',
  'contact.email': 'Email',
  'contact.phone': 'Phone',
  'contact.location': 'Location',
  'contact.locationValue': 'Colombiers, Hérault, France. Willing to relocate.',
  'contact.cta': 'Get in touch',

  /* --- pied de page ----------------------------------------------------- */
  'foot.role': 'Alexandre Schoukroun, embedded and real-time C++ developer',
};
