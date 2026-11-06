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
    'Embedded and real-time C++ developer: computer vision, signal processing and real-time systems, proven in the field. Freelance: web apps, e-commerce, SaaS, Chrome extensions, C++ and AI.',
  'meta.ogDescription':
    'Computer vision, signal processing and real-time C++, plus web products delivered end to end. Available for a full-time role or freelance work.',

  /* --- navigation ------------------------------------------------------- */
  'nav.skip': 'Skip to content',
  'nav.skills': 'Skills',
  'nav.experience': 'Experience',
  'nav.projects': 'Projects',
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
  'hud.note': 'Simulated demo',
  'hud.track': 'Vision · target tracking',
  'hud.trackMetric': '40 frames/s',
  'hud.listen': 'Signal · ultrasonic listening',
  'hud.listenMetric': 'Filtered continuously',
  'hud.run': 'Real time · turbine running',
  'hud.runMetric': 'Risk zone monitored',
  'hud.stop': 'Real time · stop commanded',
  'hud.stopMetric': 'Rotor spinning down',

  /* --- heros ------------------------------------------------------------ */
  'hero.w1': 'See,',
  'hero.w2': 'hear,',
  'hero.w3': 'decide.',
  'hero.lead':
    'I teach machines to see, hear and decide: computer vision, signal processing, real-time C++. I also build web products, from idea to production. Full-time or freelance.',
  'hero.ctaContact': 'Get in touch',
  'hero.ctaCv': 'Download CV',

  /* --- competences ----------------------------------------------------- */
  'skills.manifesto':
    'A camera, a microphone, a radar: mostly noise. My job is to pull the signal out of it, in real time, and turn it into reliable decisions.',
  'skills.proof': 'In the field',
  'chap.verb1': 'See',
  'skills.ch1Skill': 'Computer vision',
  'skills.ch1Title': 'See.',
  'skills.ch1Body':
    'Spot a target in a video stream, follow it frame after frame and predict where it goes next. When the camera loses sight, another sensor takes over.',
  'skills.fusion': 'Sensor fusion',
  'skills.ch1Proof': 'Tracking birds in flight, with radar handover',
  'chap.verb2': 'Hear',
  'skills.ch2Title': 'Hear.',
  'skills.ch2Body':
    'Capture a faint signal, separate it from the noise, extract a signature and classify it. Continuously, on hardware with tight resources.',
  'skills.ultrasound': 'Ultrasound',
  'skills.ch2Proof': 'Detecting bats by ultrasound',
  'chap.verb3': 'Decide',
  'skills.ch3Skill': 'Real-time C++ and systems',
  'skills.ch3Title': 'Decide.',
  'skills.ch3Body':
    'C++ that meets its deadlines: threads, measured latency, tests written first. Plus what makes it usable: REST API, web supervision, field deployment.',
  'skills.ch3Proof': 'Stopping a wind turbine before impact',

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

  /* --- projets --------------------------------------------------------- */
  'prod.title': 'What I build outside of work.',
  'prod.lead':
    'My own products and sites delivered for others, from code to production, with real users on the other end.',
  'prod.adscopeTag': 'SaaS, paying customers',
  'prod.adscopeBody':
    'Chrome extension and dashboard that turn the Facebook Ad Library into an analytics tool: ad spend estimation, Shopify store detection, hook analysis, CSV export. Freemium, English-speaking audience.',
  'prod.adscopeAlt': 'AdScope home page showing analysis of a Facebook Ad Library search',
  'prod.cooklieTag': 'E-commerce, local artisan',
  'prod.cooklieBody':
    'The online shop of an artisan cookie bakery in Colombiers: product menu, build-your-own box, cart and customer accounts, local delivery or pickup, quote requests for events.',
  'prod.cooklieMeta3': 'Customer accounts',
  'prod.cooklieMeta4': 'Local delivery',
  'prod.cooklieAlt': 'Cooklie home page: a hazelnut cookie and the headline One cookie, one bite of happiness',
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
  'fl.o1Proof': 'Already in production: Adscope, Cooklie',
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
