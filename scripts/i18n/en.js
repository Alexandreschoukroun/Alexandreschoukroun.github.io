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
  'meta.title': 'Alexandre Schoukroun, embedded C++ developer and freelancer',
  'meta.description':
    'Embedded and real-time C++ developer: vision, acoustics and radar for wildlife detection on wind farms. Freelance: web apps, SaaS, Chrome extensions, C++ and AI.',
  'meta.ogDescription':
    'Three years building the wildlife detectors that stop wind turbines before impact. Available for a full-time role or freelance work.',

  /* --- navigation ------------------------------------------------------- */
  'nav.skip': 'Skip to content',
  'nav.system': 'System',
  'nav.experience': 'Experience',
  'nav.products': 'Products',
  'nav.contact': 'Contact',
  'nav.availLong': 'Available for freelance',
  'nav.availShort': 'Freelance',
  'nav.themeLight': 'Light',
  'nav.themeDark': 'Dark',
  'nav.langLabel': 'Passer le site en français',

  /* --- scene ------------------------------------------------------------ */
  'viz.alt':
    'Background animation: a cloud of particles that turns into a sensor, then a bird tracked above a radar, a spectrogram of bat calls, and finally a wind turbine that stops.',
  'track.bird': 'Bird detected',
  'track.path': 'Predicted path',
  'hud.note': 'Detection chain, simulated',
  'hud.track': 'Tracking',
  'hud.trackMetric': '40 frames/s',
  'hud.listen': 'Ultrasonic listening',
  'hud.listenMetric': 'Signal filtered continuously',
  'hud.run': 'Turbine running',
  'hud.runMetric': 'Risk zone monitored',
  'hud.stop': 'Stop commanded',
  'hud.stopMetric': 'Rotor spinning down',

  /* --- heros ------------------------------------------------------------ */
  'hero.w1': 'See,',
  'hero.w2': 'hear,',
  'hero.w3': 'decide.',
  'hero.lead':
    'Embedded and real-time C++ developer who also builds web products. Available for a full-time role or freelance work.',
  'hero.ctaContact': 'Get in touch',
  'hero.ctaCv': 'Download CV',

  /* --- le systeme ------------------------------------------------------- */
  'sys.manifesto':
    'At Biodiv-Wind, sensors watch over wildlife around wind turbines. My code listens to them, tracks every target and stops the machine before impact.',
  'chap.verb1': 'See',
  'sys.ch1Title': 'See.',
  'sys.ch1Body':
    'A camera spots the bird, a Kalman filter tracks its path and predicts the next one. Beyond camera range, the Furuno radar takes over.',
  'chap.verb2': 'Hear',
  'sys.ch2Title': 'Hear.',
  'sys.ch2Body':
    'Bats hunt with ultrasound. AudioBat captures their calls, separates them from noise and classifies every pass, on hardware with tight resources.',
  'chap.verb3': 'Decide',
  'sys.ch3Title': 'Decide.',
  'sys.ch3Body':
    'When a path crosses the risk zone, the command goes out to the turbine, which slows down and stops. Around it, a C++ REST API and a web supervision interface.',
  'sys.webUi': 'Web supervision',

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
    'On the services side: REST servers in C++ with Drogon, web supervision interfaces and deployment onto field machines.',
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

  /* --- bande ------------------------------------------------------------ */
  'band.1': 'Available for freelance',
  'band.2': 'Web apps',
  'band.3': 'Chrome extensions',
  'band.4': 'Real-time C++',
  'band.5': 'Computer vision',
  'band.6': 'Local AI',

  /* --- freelance -------------------------------------------------------- */
  'fl.title': 'Your product, built end to end.',
  'fl.lead':
    'As a freelancer, I take a project from the first call to production. You deal with one person: the one writing the code.',
  'fl.o1Title': 'Web apps and SaaS',
  'fl.o1Body':
    'Accounts, Stripe payments, dashboards, APIs. Built with Next.js and Node.js, then deployed and monitored in production.',
  'fl.o1Proof': 'Already in production: Adscope',
  'fl.o2Title': 'Chrome extensions',
  'fl.o2Body':
    'A tool that plugs into the site your team already uses: reading the page, computing, exporting.',
  'fl.o2Proof': 'Like ImmoCoin on LeBonCoin',
  'fl.o3Title': 'C++, vision and real time',
  'fl.o3Body':
    'Detection prototypes, signal processing, speeding up an existing pipeline, or a REST service in C++.',
  'fl.o3Proof': 'Three years in the field at Biodiv-Wind',
  'fl.o4Title': 'AI in your tools',
  'fl.o4Body':
    'A language model connected to your documents or workflows, running locally with Ollama when the data must stay in-house.',
  'fl.processTitle': 'How we work',
  'fl.s1': 'Scope',
  'fl.s1Body': 'A call to understand the need, then a written quote: scope, timeline, price.',
  'fl.s2': 'Prototype',
  'fl.s2Body': 'An early first version you can actually use, rather than a mockup that promises.',
  'fl.s3': 'Ship',
  'fl.s3Body': 'Tests, production deployment and documentation. You get the source code.',
  'fl.s4': 'Evolve',
  'fl.s4Body': 'Fixes, maintenance and new features, whenever you need them.',
  'fl.f1': 'Reply within the day',
  'fl.f2': 'French or English',
  'fl.f3': 'In Hérault, France, or remote',
  'fl.cta': 'Start a project',

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
  'contact.intentLabel': 'Your request',
  'contact.intentProject': 'I have a project',
  'contact.intentHire': "I'm hiring",
  'contact.subjectProject': 'Freelance project',
  'contact.subjectHire': 'C++ developer role',
  'contact.titleProject': "Let's talk about your project.",
  'contact.titleHire': "Let's talk about the role.",
  'contact.leadProject':
    'A few lines are enough to start: the need, the deadline, and what already exists.',
  'contact.leadHire':
    "I'm looking for an embedded C++ role: real time, vision or signal processing, on a product with real hardware constraints.",
  'contact.msgLabel': 'Your message',
  'contact.msgHelp': 'It opens in your email app, ready to send.',
  'contact.send': 'Write the email',
  'contact.waysLabel': 'Contact details',
  'contact.email': 'Email',
  'contact.copy': 'Copy',
  'contact.copied': 'Copied',
  'contact.copiedStatus': 'Address copied to the clipboard',
  'contact.phone': 'Phone',
  'contact.location': 'Location',
  'contact.locationValue': 'Colombiers, Hérault, France. Willing to relocate.',

  /* --- pied de page ----------------------------------------------------- */
  'foot.role': 'Alexandre Schoukroun, embedded C++ developer and freelancer',
  'foot.top': 'Back to top',
};
