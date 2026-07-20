/**
 * Structured content for the "Wetenschap"-FAQ. Every source below was
 * checked against the actual publication before being included here — one
 * prompt-provided source (PMC11679080) turned out to be about a different
 * topic (polarized cardio training, not supercompensation) than it was
 * originally cited for, and has been moved to the question it actually
 * supports. See PROJECT.md for the full verification notes.
 */

export type FaqCategory = 'Kracht' | 'Herstel' | 'Cardio';

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
    category: 'Kracht',
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
    category: 'Herstel',
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
    category: 'Kracht',
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
    category: 'Kracht',
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
    category: 'Herstel',
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
    category: 'Cardio',
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
    category: 'Kracht',
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
    category: 'Kracht',
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
];

export const FAQ_CATEGORIES: FaqCategory[] = ['Kracht', 'Herstel', 'Cardio'];

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
