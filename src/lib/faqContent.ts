/**
 * Structured content for the "Wetenschap"-FAQ. Every source below was
 * checked against the actual publication before being included here — one
 * prompt-provided source (PMC11679080) turned out to be about a different
 * topic (polarized cardio training, not supercompensation) than it was
 * originally cited for, and has been moved to the question it actually
 * supports. See PROJECT.md for the full verification notes.
 *
 * Category taxonomy: the original three categories ('Kracht'/'Herstel'/
 * 'Cardio') were replaced by a broader six-category set when the FAQ grew
 * past pure training-engine topics (nutrition, technique, timelines,
 * lifestyle). All eight original entries — including 'supercompensatie'
 * and 'deload', both about training/recovery programming rather than
 * lifestyle recovery — moved to 'Training & progressie', the category
 * that groups "how does the app's training logic work" questions.
 */

export type FaqCategory = 'Training & progressie' | 'Voeding' | 'Uitvoering & techniek' | 'Resultaten & tijdlijn' | 'Herstel & leefstijl' | 'Overig';

export interface FaqSource {
  titel: string;
  auteurs: string;
  jaar: number;
  url: string;
}

export interface FaqEntry {
  id: string;
  category: FaqCategory;
  vraag: string;
  antwoord: string;
  watBetekentDitInDeApp: string;
  bronnen: FaqSource[];
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'progressive-overload',
    category: 'Training & progressie',
    vraag: 'Waarom moet ik steeds zwaarder tillen (progressive overload)?',
    antwoord:
      'Je lichaam past zich aan de belasting aan die je erop legt. Blijft die belasting precies gelijk, dan is je lichaam er op den duur klaar voor — de relatieve intensiteit daalt en de groeiprikkel verdwijnt. Geleidelijk meer belasting (gewicht, herhalingen of totaal volume) houdt de mechanische spanning op je spieren hoog genoeg om spiergroei en krachttoename te blijven stimuleren. Dit werkt onder andere via mechanische spanning die celsignalen (zoals mTOR-signalering) aanzet die spiereiwitsynthese verhogen.',
    watBetekentDitInDeApp:
      'Dit is waarom het gewichtsadvies omhooggaat zodra je de bovenkant van je rep-range haalt met genoeg reserve (RIR) — de app wacht tot je hebt aangetoond dat je klaar bent voor de volgende stap.',
    bronnen: [
      {
        titel: 'Mechanisms of mechanical overload-induced skeletal muscle hypertrophy: current understanding and future directions',
        auteurs: 'Roberts et al.',
        jaar: 2023,
        url: 'https://journals.physiology.org/doi/abs/10.1152/physrev.00039.2022',
      },
      {
        titel: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass',
        auteurs: 'Schoenfeld, Ogborn & Krieger',
        jaar: 2017,
        url: 'https://doi.org/10.1080/02640414.2016.1210197',
      },
    ],
  },
  {
    id: 'supercompensatie',
    category: 'Training & progressie',
    vraag: 'Waarom is de timing van mijn training belangrijk (supercompensatie)?',
    antwoord:
      'Na een trainingsprikkel daalt je prestatievermogen eerst tijdelijk (vermoeidheid), waarna je lichaam niet alleen herstelt maar tijdelijk bóven het oude niveau uitstijgt — de "supercompensatie"-fase. Train je precies in dat venster, dan bouw je door op een hoger niveau. Train je te vroeg (nog moe) of te laat (venster voorbij, terug naar je basisniveau), dan is de sessie minder effectief. Belangrijk om eerlijk te zijn: dit is een conceptueel model, geen exacte klok. Je zenuwstelsel, spieren en energiesystemen herstellen allemaal in een ander tempo, dus het venster is een indicatie, geen harde belofte.',
    watBetekentDitInDeApp:
      'Dit is de basis van de herstelindicator die je op "Vandaag" ziet: een schatting per spiergroep van waar je zit in dit venster, afgeleid uit hoe lang geleden en hoe zwaar je die spiergroep laatst hebt getraind.',
    bronnen: [
      {
        titel: 'Periodization: Theory and Methodology of Training (6e editie)',
        auteurs: 'Bompa & Buzzichelli',
        jaar: 2019,
        url: 'https://us.humankinetics.com/products/periodization-6th-edition',
      },
    ],
  },
  {
    id: 'geen-automatische-verhoging',
    category: 'Training & progressie',
    vraag: 'Waarom gaat het gewichtsadvies NIET automatisch omhoog als ik mijn reps niet haal?',
    antwoord:
      'Progressie moet verdiend zijn. Verhoog je het gewicht terwijl je de doel-reps nog niet haalt, dan stapelt vermoeidheid op zonder een voldoende kwalitatieve prikkel — dat leidt tot stagnatie of zelfs overbelasting in plaats van vooruitgang. "Double progression" (eerst binnen je rep-range naar het maximum werken, dán pas het gewicht verhogen) borgt dat je daadwerkelijk sterk genoeg bent voor de volgende stap voordat je die zet.',
    watBetekentDitInDeApp:
      'Dit is precies waarom de progressie-engine bij een gemiste rep-target hetzelfde gewicht aanhoudt in plaats van toch te verhogen: eerst de reps, dan het gewicht.',
    bronnen: [
      {
        titel: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass',
        auteurs: 'Schoenfeld, Ogborn & Krieger',
        jaar: 2017,
        url: 'https://doi.org/10.1080/02640414.2016.1210197',
      },
      {
        titel: 'Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions',
        auteurs: 'Robinson, Pelland, Remmert et al.',
        jaar: 2024,
        url: 'https://link.springer.com/article/10.1007/s40279-024-02069-2',
      },
    ],
  },
  {
    id: 'trainingsvolume',
    category: 'Training & progressie',
    vraag: 'Hoeveel sets per week heb ik nodig (trainingsvolume)?',
    antwoord:
      'Er bestaat een dosis-responsrelatie tussen je wekelijkse trainingsvolume (aantal sets per spiergroep) en spiergroei — maar met afnemende meeropbrengst. Meer sets is tot op zekere hoogte beter, daarna vlakt de winst af of kan te veel volume zelfs averechts werken doordat herstel het niet meer bijbeent. Er is geen vast getal dat voor iedereen klopt: het optimale volume hangt af van ervaring, herstelvermogen en de spiergroep zelf.',
    watBetekentDitInDeApp:
      'Dit is waarom de wekelijkse adaptatieplanner sets geleidelijk toevoegt in plaats van meteen een hoog volume voor te schrijven, en stopt of terugschakelt (deload) zodra je herstel of prestatie stagneert.',
    bronnen: [
      {
        titel: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass',
        auteurs: 'Schoenfeld, Ogborn & Krieger',
        jaar: 2017,
        url: 'https://doi.org/10.1080/02640414.2016.1210197',
      },
      {
        titel: 'The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains',
        auteurs: 'Pelland, Remmert, Robinson, Hinson & Zourdos',
        jaar: 2025,
        url: 'https://link.springer.com/article/10.1007/s40279-025-02344-w',
      },
    ],
  },
  {
    id: 'deload',
    category: 'Training & progressie',
    vraag: 'Waarom moet ik soms rust nemen of een deload doen?',
    antwoord:
      'Herstel is niet "verloren tijd" — het is waar de eigenlijke aanpassing plaatsvindt. Zonder voldoende herstel stapelt vermoeidheid zich op en daalt je prestatie geleidelijk (overreaching), wat bij aanhoudende opeenstapeling kan doorschieten naar overtraining. Een geplande, tijdelijke volumevermindering (een deload) elke paar weken laat opgebouwde vermoeidheid wegzakken terwijl de fitheid die je hebt opgebouwd grotendeels behouden blijft — zodat je daarna weer fris en met effect verder kunt.',
    watBetekentDitInDeApp:
      'Dit is waarom de app automatisch deload-weken voorstelt zodra de signalen (bijvoorbeeld herhaald onder je rep-doelen blijven) daarom vragen, in plaats van je schema eindeloos zwaarder te blijven maken.',
    bronnen: [
      {
        titel: 'A Practical Approach to Deloading: Recommendations and Considerations for Strength and Physique Sports',
        auteurs: 'Bell, Darragh, Travis, Rogerson & Nolan',
        jaar: 2025,
        url: 'https://journals.lww.com/nsca-scj/abstract/9900/a_practical_approach_to_deloading__recommendations.203.aspx',
      },
      {
        titel: 'Prevention, diagnosis and treatment of the overtraining syndrome: joint consensus statement of the ECSS and ACSM',
        auteurs: 'Meeusen et al.',
        jaar: 2013,
        url: 'https://pubmed.ncbi.nlm.nih.gov/23247672/',
      },
    ],
  },
  {
    id: 'polarized-cardio',
    category: 'Training & progressie',
    vraag: 'Waarom traint de app cardio grotendeels rustig (80/20 / polarized training)?',
    antwoord:
      'Onderzoek bij duursporters laat zien dat een verdeling van ongeveer 80% van de cardiotijd op lage intensiteit en 20% echt intensief (polarized training) betere aerobe aanpassingen geeft — zoals een hogere VO2max en meer uithoudingsvermogen — dan veel tijd doorbrengen in het "grijze midden": een gematigd tempo dat voelt alsof je traint, maar vooral vermoeidheid oplevert zonder evenredige winst.',
    watBetekentDitInDeApp:
      'Dit is waarom de cardio-engine je verdeling over de afgelopen periode bijhoudt en soms bewust een rustige zone 2-sessie adviseert, ook als je zelf zin had in iets zwaarders.',
    bronnen: [
      {
        titel: "Comparison of Polarized Versus Other Types of Endurance Training Intensity Distribution on Athletes' Endurance Performance: A Systematic Review with Meta-analysis",
        auteurs: 'Oliveira, Boppre & Fonseca',
        jaar: 2024,
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11329428/',
      },
      {
        titel: 'The Effect of Polarized Training Intensity Distribution on Maximal Oxygen Uptake and Work Economy Among Endurance Athletes: A Systematic Review',
        auteurs: 'Nøst, Aune & van den Tillaar',
        jaar: 2024,
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11679080/',
      },
    ],
  },
  {
    id: 'rir-rpe',
    category: 'Training & progressie',
    vraag: 'Wat is RIR/RPE en waarom vraagt de app ernaar?',
    antwoord:
      'RIR (reps in reserve) en RPE (ervaren inspanning) meten hoe dicht je bij spierfalen zat op een set. Dat maakt advies veel preciezer: "10 reps met nog 4 in de tank" vraagt om een heel andere volgende stap dan "10 reps met 0 in de tank", ook al is het aantal reps identiek. Zo kan de app je belasting nauwkeurig sturen zonder dat je elke set tot volledig falen hoeft te trainen — wat onnodig veel vermoeidheid zou geven voor relatief weinig extra effect.',
    watBetekentDitInDeApp:
      'RIR voedt zowel het gewichtsadvies (samen met je reps) als de herstelinschatting: een sessie met lage RIR (dicht bij falen) wordt door de app als zwaarder meegewogen en krijgt een langer geschat hersteltraject.',
    bronnen: [
      {
        titel: 'Mechanisms of mechanical overload-induced skeletal muscle hypertrophy: current understanding and future directions',
        auteurs: 'Roberts et al.',
        jaar: 2023,
        url: 'https://journals.physiology.org/doi/abs/10.1152/physrev.00039.2022',
      },
      {
        titel: 'Exploring the Dose–Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions',
        auteurs: 'Robinson, Pelland, Remmert et al.',
        jaar: 2024,
        url: 'https://link.springer.com/article/10.1007/s40279-024-02069-2',
      },
    ],
  },
  {
    id: 'doel-specifiek-schema',
    category: 'Training & progressie',
    vraag: 'Waarom werkt mijn schema anders voor spiermassa dan voor kracht of afvallen?',
    antwoord:
      'Verschillende doelen vragen om andere rep-ranges, intensiteiten, volumes en rusttijden. Voor kracht: zwaardere gewichten, minder herhalingen, meer rust tussen sets. Voor spiermassa: matige gewichten met meer volume, vooral in de 6-15 herhalingen-range. Voor afvallen: behoud van kracht en spiermassa terwijl je meer energie verbruikt, vaak met meer cardio erbij. De app zet je gekozen streeffysiek om naar precies deze parameters.',
    watBetekentDitInDeApp:
      'Dit is waarom je keuze van streeffysiek in de onboarding (of bij het wisselen van doel) je hele schema vormgeeft: welke rep-ranges, hoeveel sets en welke rol cardio krijgt, volgt allemaal uit dat ene doel.',
    bronnen: [
      {
        titel: 'Resistance Training Recommendations to Maximize Muscle Hypertrophy in an Athletic Population: Position Stand of the IUSCA',
        auteurs: 'Schoenfeld, Fisher, Grgic, Haun, Helms, Phillips, Steele & Vigotsky',
        jaar: 2021,
        url: 'https://journal.iusca.org/index.php/Journal/article/view/81',
      },
      {
        titel: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass',
        auteurs: 'Schoenfeld, Ogborn & Krieger',
        jaar: 2017,
        url: 'https://doi.org/10.1080/02640414.2016.1210197',
      },
    ],
  },
  // --- Voeding ---
  {
    id: 'eiwit-behoefte',
    category: 'Voeding',
    vraag: 'Hoeveel eiwit heb ik per dag echt nodig?',
    antwoord:
      'De algemene voedingsnorm van 0,8 g eiwit per kg lichaamsgewicht per dag is bedoeld voor sedentaire mensen, niet voor wie krachttraint. Voor krachttrainende mensen ligt de optimale inname aanzienlijk hoger: ruwweg 1,4-2,0 g/kg/dag ondersteunt spieropbouw en -behoud beter dan de algemene norm. Boven ongeveer 1,5-1,6 g/kg is de extra winst per gram beperkt — meer eten dan dat levert dus weinig extra spiergroei op, alleen extra calorieën.',
    watBetekentDitInDeApp:
      'Dit onderbouwt het eiwitdoel dat de app berekent op basis van je streeffysiek en lichaamsgewicht.',
    bronnen: [
      {
        titel: 'International Society of Sports Nutrition Position Stand: protein and exercise',
        auteurs: 'Jäger et al.',
        jaar: 2017,
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/',
      },
      {
        titel: 'Synergistic Effect of Increased Total Protein Intake and Strength Training on Muscle Strength: A Dose-Response Meta-analysis',
        auteurs: 'Tagawa et al.',
        jaar: 2022,
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9441410/',
      },
    ],
  },
  {
    id: 'anaboolvenster',
    category: 'Voeding',
    vraag: 'Moet ik voor of na de training eten? Bestaat het "anabole venster"?',
    antwoord:
      'Het idee dat je binnen 30-60 minuten na de training eiwit moet eten om spiergroei mis te lopen, is grotendeels een mythe. Onderzoek laat zien dat je totale eiwitinname over de hele dag veel zwaarder weegt dan het precieze tijdstip rond je training — het "venster" is eerder uren breed dan minuten. Zolang je dagtotaal klopt, maakt het dus weinig uit of je vlak voor, vlak na of pas later op de dag eet.',
    watBetekentDitInDeApp:
      'Daarom stuurt de app op je dagtotaal eiwit, niet op een strak tijdstip rond je training.',
    bronnen: [
      {
        titel: 'Nutrient timing revisited: is there a post-exercise anabolic window?',
        auteurs: 'Aragon & Schoenfeld',
        jaar: 2013,
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3577439/',
      },
    ],
  },
  {
    id: 'supplementen',
    category: 'Voeding',
    vraag: 'Heb ik supplementen nodig, en welke zijn onderbouwd (creatine, whey)?',
    antwoord:
      'De meeste supplementen zijn overbodig als je voeding al op orde is. Creatine monohydraat is een uitzondering: het is een van de best onderzochte supplementen die er zijn, aantoonbaar effectief voor kracht en spieropbouw, en veilig gebleken in langetermijnonderzoek bij gezonde mensen. Whey-eiwit is vooral een praktisch hulpmiddel om je eiwitdoel te halen — geen "magisch" supplement, maar simpelweg een makkelijke eiwitbron.',
    watBetekentDitInDeApp:
      'De voedingsfeature richt zich daarom op je totale inname (calorieën/eiwit), niet op supplement-aanbevelingen.',
    bronnen: [
      {
        titel: 'International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation',
        auteurs: 'Kreider et al.',
        jaar: 2017,
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/',
      },
    ],
  },
  {
    id: 'calorietekort-overschot',
    category: 'Voeding',
    vraag: 'Wat is een gezond calorietekort/-overschot om aan te houden?',
    antwoord:
      'Voor afvallen geldt 0,5-1% van je lichaamsgewicht per week (ruwweg 500-750 kcal tekort per dag) als een breed erkend, veilig tempo dat het risico op spierverlies beperkt — sneller afvallen verhoogt de kans dat je naast vet ook spiermassa kwijtraakt. Voor spieropbouw is een klein overschot (in dezelfde orde van grootte, maar dan positief) voldoende: een groot overschot geeft vooral extra vetopslag, geen extra spiergroei.',
    watBetekentDitInDeApp:
      'Dit onderbouwt waarom het voedingsdoel per streeffysiek een gematigd tekort of overschot aanhoudt in plaats van een extreme waarde.',
    bronnen: [
      {
        titel: 'What does a healthy, realistic rate of weight loss look like — and why does it matter?',
        auteurs: 'Harvard Health Publishing',
        jaar: 2026,
        url: 'https://www.health.harvard.edu/weight-loss/what-does-a-healthy-realistic-rate-of-weight-loss-look-like-and-why-does-it-matter',
      },
    ],
  },
  {
    id: 'alcohol-herstel',
    category: 'Voeding',
    vraag: 'Kan alcohol mijn herstel en resultaten beïnvloeden?',
    antwoord:
      'Ja — onderzoek laat zien dat alcohol na het trainen de spiereiwitsynthese (het proces waarmee spieren herstellen en groeien) meetbaar remt, zelfs als je tegelijk genoeg eiwit binnenkrijgt. Kracht en spierpijn lijken op korte termijn minder beïnvloed, maar het herstelproces op celniveau wordt aantoonbaar vertraagd.',
    watBetekentDitInDeApp:
      'Geen directe koppeling in de app-logica, maar wel relevant voor wie serieus aan zijn herstel-venster werkt.',
    bronnen: [
      {
        titel: 'Alcohol Ingestion Impairs Maximal Post-Exercise Rates of Myofibrillar Protein Synthesis',
        auteurs: 'Parr et al.',
        jaar: 2014,
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3922864/',
      },
      {
        titel: 'The Effects of Alcohol Consumption on Recovery Following Resistance Exercise: A Systematic Review',
        auteurs: 'Lakicevic et al.',
        jaar: 2019,
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7739274/',
      },
    ],
  },
  // --- Uitvoering & techniek ---
  {
    id: 'startgewicht-nieuwe-oefening',
    category: 'Uitvoering & techniek',
    vraag: 'Hoe kies ik mijn startgewicht bij een nieuwe oefening?',
    antwoord:
      'Begin met een gewicht waarbij je de onderkant van je rep-range haalt met nadrukkelijk nog reserve (RIR 3-4). Liever te licht beginnen en de eerste sessie gebruiken om te kalibreren, dan te zwaar beginnen en de techniek verliezen. Vanaf dat startpunt pakt double progression het vanzelf over.',
    watBetekentDitInDeApp:
      'Dit is waarom de eerste sessie van een nieuwe oefening in de app als "invullen wat je deed" werkt in plaats van een blind advies te geven — er is nog geen historie om op te bouwen.',
    bronnen: [
      {
        titel: 'Mechanisms of mechanical overload-induced skeletal muscle hypertrophy: current understanding and future directions',
        auteurs: 'Roberts et al.',
        jaar: 2023,
        url: 'https://journals.physiology.org/doi/abs/10.1152/physrev.00039.2022',
      },
    ],
  },
  {
    id: 'volledige-bewegingsuitslag',
    category: 'Uitvoering & techniek',
    vraag: 'Waarom is volledige bewegingsuitslag (range of motion) belangrijker dan veel gewicht?',
    antwoord:
      'Meta-analyses laten een klein maar consistent voordeel zien van volledige bewegingsuitslag ten opzichte van gedeeltelijke bewegingen voor spiergroei — vooral trainen in de uitgerekte positie van een spier blijkt effectief. Zwaarder tillen met een halve beweging geeft dus niet per se meer resultaat dan lichter tillen door de volledige range.',
    watBetekentDitInDeApp:
      'Dit is waarom de app volledige, correcte uitvoering benadrukt boven kaal het cijfer op de balk.',
    bronnen: [
      {
        titel: 'Partial Vs Full Range of Motion Resistance Training: A Systematic Review and Meta-Analysis',
        auteurs: 'Wolf et al.',
        jaar: 2023,
        url: 'https://journal.iusca.org/index.php/Journal/article/view/182',
      },
    ],
  },
  {
    id: 'opwarmen',
    category: 'Uitvoering & techniek',
    vraag: 'Moet ik altijd opwarmen, en hoe?',
    antwoord:
      'Opwarmen verhoogt spier- en gewrichtstemperatuur, verbetert kracht bij de eerste zware sets, en hangt samen met minder blessures — vooral bij plotselinge belastingspieken. Een paar lichtere opbouwsets richting je werkgewicht is meestal voldoende; een lange cardio-warming-up is niet per se nodig voor krachttraining.',
    watBetekentDitInDeApp:
      'Dit is een goede gewoonte naast het gewichtsadvies van de app, ook al berekent de app dit nog niet automatisch.',
    bronnen: [
      {
        titel: 'Exercise-Based Strategies from Warm-Up to Training: A Systematic Review of Performance Enhancement and Injury Prevention',
        auteurs: 'Systematic review, Sports (MDPI)',
        jaar: 2026,
        url: 'https://www.mdpi.com/2075-4663/14/5/187',
      },
    ],
  },
  {
    id: 'doms-teken-van-goede-training',
    category: 'Uitvoering & techniek',
    vraag: 'Is spierpijn (DOMS) een teken van een goede training, of juist niet nodig?',
    antwoord:
      'Spierpijn is geen betrouwbare maatstaf voor een effectieve training. Onderzoek laat zien dat spiergroei prima optreedt zonder noemenswaardige DOMS, en dat sommige spiergroepen (zoals schouders) van nature minder pijnlijk worden dan andere (zoals bovenbenen) zonder dat ze minder groeien. Te veel spierpijn kan zelfs je volgende training belemmeren.',
    watBetekentDitInDeApp:
      'De app stuurt daarom op prestatie en RIR, niet op hoe stijf je de dag erna bent.',
    bronnen: [
      {
        titel: 'Advances in Non-Pharmacological Strategies for DOMS: A Scoping and Critical Review of Recent Evidence',
        auteurs: 'Scoping review',
        jaar: 2025,
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12641786/',
      },
    ],
  },
  {
    id: 'blessurepreventie',
    category: 'Uitvoering & techniek',
    vraag: 'Hoe voorkom ik blessures bij het tillen?',
    antwoord:
      'De grootste risicofactor is een plotselinge sprong in trainingsbelasting — geleidelijk opbouwen is een van de best onderbouwde manieren om blessurerisico te verlagen. Daarnaast helpen opwarmen en voldoende herstel tussen zware sessies.',
    watBetekentDitInDeApp:
      'Dit is de wetenschappelijke basis achter waarom de app nooit een grote gewichtssprong adviseert, ook niet als je een sessie heel makkelijk vond.',
    bronnen: [
      {
        titel: 'Strength training as superior, dose-dependent and safe prevention of acute and overuse sports injuries: a systematic review, qualitative analysis and meta-analysis',
        auteurs: 'Lauersen, Andersen & Andersen',
        jaar: 2018,
        url: 'https://bjsm.bmj.com/content/52/24/1557',
      },
    ],
  },
  {
    id: 'rust-tussen-sets',
    category: 'Uitvoering & techniek',
    vraag: 'Hoeveel rust moet ik nemen tussen sets?',
    antwoord:
      'Voor spiergroei blijkt de exacte rustduur minder cruciaal dan lang gedacht — verschillen tussen kortere en langere pauzes op spiergroei zijn klein. Voor maximale kracht helpen langere pauzes (rond 2-3 minuten) wel aantoonbaar meer, omdat je dan met meer gewicht of kwaliteit kunt herhalen. Vuistregel: rust tot je de volgende set met goede vorm en bijna hetzelfde aantal reps kunt doen.',
    watBetekentDitInDeApp:
      'Dit onderbouwt waarom de app geen overdreven strikte rusttimer afdwingt, maar wel een richtlijn geeft passend bij je doel.',
    bronnen: [
      {
        titel: 'Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy',
        auteurs: 'Refalo et al.',
        jaar: 2024,
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11349676/',
      },
    ],
  },
  // --- Resultaten & tijdlijn ---
  {
    id: 'resultaten-tijdlijn',
    category: 'Resultaten & tijdlijn',
    vraag: 'Hoe lang duurt het voordat ik resultaten zie?',
    antwoord:
      'Krachttoename is vaak al na 2-4 weken meetbaar, grotendeels dankzij je zenuwstelsel dat leert de spier efficiënter aan te sturen — nog niet door meer spiermassa. Zichtbare spiergroei duurt langer: de eerste betrouwbare metingen zijn er meestal na 6-8 weken, met duidelijke veranderingen na 8-12 weken consistente training.',
    watBetekentDitInDeApp:
      'Dit is waarom de app vroege progressie op kracht/prestatie laat zien, niet op zichtbare verandering, om te voorkomen dat je te vroeg denkt dat er niets gebeurt.',
    bronnen: [
      {
        titel: 'An examination of the time course of training-induced skeletal muscle hypertrophy',
        auteurs: 'DeFreitas, Beck, Stock, Dillon & Kasishke',
        jaar: 2011,
        url: 'https://pubmed.ncbi.nlm.nih.gov/21409401/',
      },
    ],
  },
  {
    id: 'plateaus',
    category: 'Resultaten & tijdlijn',
    vraag: 'Waarom stagneer ik soms (plateaus), en wat helpt daartegen?',
    antwoord:
      'Een programma zonder enige variatie levert vaak maar een paar maanden vooruitgang op voordat het effect afvlakt — het lichaam past zich aan een gelijkblijvende prikkel aan. Periodisering (bewust variëren in volume/intensiteit, inclusief deload-weken) helpt om dit te doorbreken en op lange termijn door te blijven groeien.',
    watBetekentDitInDeApp:
      'Dit is precies waarom de adaptatieplanner automatisch deload-weken en volumeaanpassingen inplant, in plaats van eindeloos hetzelfde schema te herhalen.',
    bronnen: [
      {
        titel: 'Periodized Resistance Training for Enhancing Skeletal Muscle Hypertrophy and Strength: A Mini-Review',
        auteurs: 'Evans',
        jaar: 2019,
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6351492/',
      },
    ],
  },
  {
    id: 'spiermassa-per-maand',
    category: 'Resultaten & tijdlijn',
    vraag: 'Hoeveel spiermassa/kracht kan ik realistisch per maand opbouwen?',
    antwoord:
      'Als beginner (eerste 6-12 maanden) is 0,5-1 kg spiermassa per maand realistisch, soms iets meer in de eerste maanden ("newbie gains"). Naarmate je ervarener wordt, vertraagt dit sterk — na een paar jaar is enkele kilo\'s per jaar al een goed resultaat. Beloftes van veel meer, veel sneller zijn vrijwel nooit haalbaar op natuurlijke wijze.',
    watBetekentDitInDeApp:
      'Dit is waarom de progressie-verwachtingen in de app bewust bescheiden en eerlijk zijn, vooral naarmate je langer traint.',
    bronnen: [
      {
        titel: 'How Much Muscle Can You Gain in a Month?',
        auteurs: 'InBody USA (samenvatting van o.a. het Aragon-model)',
        jaar: 2026,
        url: 'https://inbodyusa.com/blogs/inbodyblog/how-much-muscle-can-you-gain-in-a-month/',
      },
    ],
  },
  // --- Herstel & leefstijl ---
  {
    id: 'slaap-en-prestatie',
    category: 'Herstel & leefstijl',
    vraag: 'Hoe beïnvloedt slaap mijn trainingsresultaten?',
    antwoord:
      'Te weinig slaap over meerdere nachten (slaaprestrictie) verlaagt aantoonbaar je maximale kracht, vooral bij samengestelde oefeningen zoals squat en bankdrukken. Slaap is ook essentieel voor spiereiwitsynthese en hormoonbalans, twee kernprocessen van herstel. Één enkele slechte nacht heeft meestal weinig effect, maar structureel te weinig slaap wel.',
    watBetekentDitInDeApp:
      'Dit is een factor die de herstel-inschatting (readiness) beïnvloedt naast trainingsvolume zelf.',
    bronnen: [
      {
        titel: 'Implications of sleep loss or sleep deprivation on muscle strength: a systematic review',
        auteurs: 'Systematic review',
        jaar: 2025,
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12263768/',
      },
      {
        titel: 'Inadequate sleep and muscle strength: Implications for resistance training',
        auteurs: 'Knowles, Drinkwater, Urban, Peak & Aisbett',
        jaar: 2018,
        url: 'https://www.jsams.org/article/S1440-2440(18)30030-6/abstract',
      },
    ],
  },
  {
    id: 'waarom-voelt-training-verschillend',
    category: 'Herstel & leefstijl',
    vraag: 'Waarom voelt de ene training zwaarder dan de andere bij hetzelfde gewicht?',
    antwoord:
      'Dit is precies wat het supercompensatie/herstelmodel beschrijft — je prestatievermogen schommelt afhankelijk van hoe ver je bent in het herstel van eerdere trainingen, slaap, stress en voeding. Hetzelfde gewicht kan daardoor de ene dag licht en de andere dag zwaar aanvoelen, zonder dat er iets mis is.',
    watBetekentDitInDeApp:
      'Dit is exact waarom de app RIR/RPE per sessie uitvraagt in plaats van te verwachten dat elke sessie identiek aanvoelt.',
    bronnen: [
      {
        titel: 'Periodization: Theory and Methodology of Training (6e editie)',
        auteurs: 'Bompa & Buzzichelli',
        jaar: 2019,
        url: 'https://us.humankinetics.com/products/periodization-6th-edition',
      },
    ],
  },
  // --- Overig ---
  {
    id: 'vrouwen-vs-mannen',
    category: 'Overig',
    vraag: 'Moeten vrouwen anders trainen dan mannen?',
    antwoord:
      'Mannen hebben gemiddeld meer absolute kracht en spiermassa, maar de relatieve vooruitgang (percentage verbetering) op kracht en spiergroei door krachttraining is grotendeels vergelijkbaar tussen mannen en vrouwen. Er is dus geen sterk wetenschappelijk bewijs dat vrouwen fundamenteel andere trainingsprincipes nodig hebben — dezelfde principes (progressive overload, voldoende volume, herstel) gelden voor iedereen.',
    watBetekentDitInDeApp:
      'Daarom gebruikt de app dezelfde engines voor iedereen, met individuele lichaamsmetingen als input in plaats van een apart "vrouwenschema".',
    bronnen: [
      {
        titel: 'Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis',
        auteurs: 'Roberts et al.',
        jaar: 2020,
        url: 'https://journals.lww.com/nsca-jscr/fulltext/2020/05000/sex_differences_in_resistance_training__a.30.aspx',
      },
    ],
  },
  {
    id: 'leeftijd-en-training',
    category: 'Overig',
    vraag: 'Verandert mijn trainingsaanpak met leeftijd?',
    antwoord:
      'Krachttraining blijft op elke leeftijd effectief — ook op zeer hoge leeftijd zijn duidelijke verbeteringen in kracht en spiermassa aangetoond. Bij ouderen (60+) is er wel vaak een iets kleinere relatieve winst dan bij jongere mensen, en wordt herstel doorgaans iets belangrijker om goed te bewaken. Het basisprincipe (progressieve, geleidelijke belasting) verandert niet, de opbouwsnelheid kan wel iets voorzichtiger.',
    watBetekentDitInDeApp:
      'De adaptatieplanner houdt hier al rekening mee via de algemene herstelbewaking, ook al wordt leeftijd niet apart uitgevraagd.',
    bronnen: [
      {
        titel: 'Evaluation of sex-based differences in resistance exercise training-induced changes in muscle mass, strength, and physical performance in healthy older (≥60 y) adults: A systematic review and meta-analysis',
        auteurs: 'Hawley, Bell, Huang, Gibbs & Churchward-Venne',
        jaar: 2023,
        url: 'https://www.sciencedirect.com/science/article/abs/pii/S1568163723001824',
      },
    ],
  },
  {
    id: 'spierpijn-vs-blessure',
    category: 'Overig',
    vraag: 'Wat is het verschil tussen spierpijn en een blessure — wanneer moet ik stoppen?',
    antwoord:
      'Normale spierpijn (DOMS) is diffuus, treft een hele spiergroep symmetrisch, begint 24-72 uur na de training en neemt geleidelijk af. Een blessure voelt anders: vaak scherp, plaatselijk (één punt), soms al tijdens de beweging zelf, gepaard met zwelling of functieverlies, en wordt meestal niet vanzelf snel minder. Bij twijfel — vooral bij scherpe of plaatselijke pijn tijdens het tillen zelf — is stoppen en een arts of fysiotherapeut raadplegen de veilige keuze.',
    watBetekentDitInDeApp:
      'Dit hoort bij de algemene voorlichting van de app; de app stelt geen diagnoses en verwijst bij twijfel altijd door naar een professional.',
    bronnen: [
      {
        titel: 'Advances in Non-Pharmacological Strategies for DOMS: A Scoping and Critical Review of Recent Evidence',
        auteurs: 'Scoping review',
        jaar: 2025,
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12641786/',
      },
    ],
  },
];

export const FAQ_CATEGORIES: FaqCategory[] = ['Training & progressie', 'Voeding', 'Uitvoering & techniek', 'Resultaten & tijdlijn', 'Herstel & leefstijl', 'Overig'];

export function searchFaqEntries(entries: FaqEntry[], query: string): FaqEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return entries;
  return entries.filter(
    (entry) =>
      entry.vraag.toLowerCase().includes(normalized) ||
      entry.antwoord.toLowerCase().includes(normalized) ||
      entry.watBetekentDitInDeApp.toLowerCase().includes(normalized),
  );
}
