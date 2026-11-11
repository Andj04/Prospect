// Modèles de messages LinkedIn (document « Messages LinkedIn Amal Biladi : après
// acceptation et relances »). Variables remplies automatiquement :
//   {prenom}             prénom du contact
//   {entreprise}         nom de l'entreprise
//   {expediteur_prenom}  prénom de la personne connectée
//   {expediteur}         prénom et nom de la personne connectée
//   {lien}               page LinkedIn d'Amal Biladi (LIEN_LINKEDIN_AMAL_BILADI)
// Les passages entre crochets ([action précise…]) restent à compléter à la main
// avec un fait vérifié sur l'entreprise.
import type { CategoriePoste } from "@/lib/prospection";

/** Lien de la page LinkedIn d'Amal Biladi : à renseigner dès qu'il est connu. */
export const LIEN_LINKEDIN_AMAL_BILADI = "";

export type Modele = { id: string; titre: string; texte: string };

const PRESENTATION =
  "Je suis {expediteur_prenom}, du club 180 Degrees Consulting de l'École Centrale Casablanca.";

const LIENS = `Je vous partage quelques liens pour avoir plus d'informations sur Amal Biladi :
Site : www.amalbiladi.org
LinkedIn : {lien}

Merci d'avance pour votre attention.

Cordialement,
{expediteur}`;

const message = (accroche: string, corps: string, demande: string) =>
  `Bonjour {prenom}, merci d'avoir accepté mon invitation.

${accroche}

${PRESENTATION} ${corps}

${demande}

${LIENS}`;

export const MESSAGES_APRES_ACCEPTATION: Record<CategoriePoste, Modele[]> = {
  dirigeant: [
    {
      id: "dirigeant-1",
      titre: "Soutien direct",
      texte: message(
        "Nous avons suivi avec intérêt [action précise de l'entreprise : programme, projet, engagement]. Cela rejoint un sujet sur lequel nous travaillons.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial des zones rurales et montagneuses du Maroc à travers plusieurs projets : écoconstruction (plus de 200 habitats d'urgence depuis le séisme de 2023), formation des jeunes, coopératives féminines et écotourisme solidaire.",
        "Amal Biladi recherche des partenaires pour financer ses prochains projets, et l'engagement de {entreprise} sur [thème] nous laisse penser que l'un d'eux pourrait vous intéresser. Seriez-vous ouvert à en discuter 15 minutes ? Sinon, pourriez-vous nous mettre en relation avec la personne qui s'occupe de ces sujets chez vous ?",
      ),
    },
    {
      id: "dirigeant-2",
      titre: "Un projet chiffré",
      texte: message(
        "En suivant {entreprise}, nous avons noté [action précise]. Un engagement ancré dans les territoires, c'est exactement ce qui nous motive.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans des zones rurales du Maroc. Après plus de 200 habitats d'urgence écoconstruits depuis 2023, elle cherche des financements pour cinq projets (de 45 000 DH à 3 MDH) : habitats, Maison des étoiles pour l'écotourisme et la formation des jeunes, accompagnement de coopératives de femmes.",
        "Ces projets ont chacun un budget et un territoire clairement identifiés, ce qui permet à un partenaire de choisir celui qui lui correspond. Pourriez-vous nous dire qui, chez {entreprise}, examine ce type de soutien financier, ou accepteriez-vous un échange de 15 minutes ?",
      ),
    },
    {
      id: "dirigeant-3",
      titre: "Mise en relation",
      texte: message(
        "Nous avons vu que {entreprise} a [action précise]. C'est ce qui nous a donné envie de vous écrire.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc : habitat d'urgence écoconstruit (plus de 200 réalisés depuis 2023), éducation et formation, écotourisme solidaire, coopératives de femmes.",
        "L'association cherche des partenaires financiers engagés dans les territoires, et {entreprise} nous paraît être l'un des plus pertinents. Nous savons que votre temps est précieux : pourriez-vous simplement nous indiquer la personne, chez vous, en charge des partenariats et du mécénat ? Nous lui présenterions les projets directement.",
      ),
    },
  ],
  "dirigeant-adjoint": [
    {
      id: "adjoint-1",
      titre: "Modalités de soutien",
      texte: message(
        "Nous avons vu que {entreprise} soutient [action précise : programme, projet, partenariat associatif]. Cela nous intéresse beaucoup.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc, à travers l'écoconstruction (plus de 200 habitats d'urgence depuis 2023), l'éducation et la formation, et l'écotourisme solidaire. Elle bénéficie déjà du soutien de la Fondation BMCI, de la Fondation de France et d'autres partenaires.",
        "Amal Biladi cherche de nouveaux soutiens financiers pour ses projets en cours. Pourriez-vous nous expliquer comment {entreprise} étudie ce type de demande (dossier, calendrier, critères) ? Et qui serait la bonne personne pour la recevoir ?",
      ),
    },
    {
      id: "adjoint-2",
      titre: "Cofinancement",
      texte: message(
        "Nous avons suivi l'action de {entreprise} sur [thème précis]. Elle rejoint le cœur de notre mission actuelle.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans des zones rurales du Maroc : plus de 200 habitats d'urgence écoconstruits depuis 2023, puis des projets de formation des jeunes, d'accès à l'eau et d'écotourisme solidaire.",
        "Certains de ces projets sont ouverts au cofinancement avec d'autres fondations et entreprises, ce qui permet de partager l'effort financier. Une contribution de {entreprise} pourrait-elle être envisagée ? Si ce n'est pas votre périmètre, pourriez-vous nous mettre en relation avec la personne en charge ?",
      ),
    },
    {
      id: "adjoint-3",
      titre: "Présentation du dossier",
      texte: message(
        "Nous avons lu avec intérêt [action ou programme précis de l'entreprise ou de sa fondation]. Cela nous donne envie de vous présenter un projet qui s'en rapproche.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales du Maroc à travers plusieurs projets : habitat d'urgence (plus de 200 réalisés), éducation et formation, écotourisme, coopératives féminines.",
        "L'association prépare cinq projets à financer, chacun avec un territoire et un budget identifiés. Nous souhaiterions vous envoyer une présentation d'une page. Êtes-vous la bonne personne pour l'examiner, ou pourriez-vous nous indiquer qui, chez {entreprise}, instruit les demandes de soutien ?",
      ),
    },
  ],
  rse: [
    {
      id: "rse-1",
      titre: "Budget RSE",
      texte: message(
        "Nous avons vu l'action de {entreprise} sur [programme ou action RSE précis]. C'est aussi le cœur de notre travail.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc : écoconstruction (plus de 200 habitats d'urgence depuis 2023), formation des jeunes, coopératives de femmes, écotourisme solidaire.",
        "Amal Biladi propose aux entreprises de transformer une partie de leur budget RSE en impact territorial mesurable, avec des indicateurs adaptés à votre reporting. Votre stratégie RSE laisse-t-elle de la place à ce type de soutien financier ? Si oui, comment procéder avec vous pour présenter un projet ?",
      ),
    },
    {
      id: "rse-2",
      titre: "Projet aligné sur vos axes",
      texte: message(
        "Nous avons suivi [programme ou action RSE précis de l'entreprise] et son orientation vers [éducation / environnement / territoires / femmes]. Cela nous parle beaucoup.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial du Maroc rural à travers cinq projets à financer, de 45 000 DH à 3 MDH : habitat d'urgence écoconstruit (plus de 200 réalisés depuis 2023), formation des jeunes, accès à l'eau, coopératives féminines et écotourisme.",
        "Selon vos axes RSE, l'un de ces projets pourrait être soutenu seul ou en cofinancement. Lequel vous semblerait le plus proche de vos priorités ? Nous pourrions vous envoyer le détail correspondant, et échanger avec la personne qui valide les budgets si ce n'est pas vous.",
      ),
    },
    {
      id: "rse-3",
      titre: "Formes d'engagement",
      texte: message(
        "Nous avons remarqué que {entreprise} [action précise : programme, partenariat, label RSE]. Cela montre une vraie démarche, et c'est ce qui nous a donné envie de vous contacter.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc (écoconstruction, éducation, écotourisme solidaire, coopératives féminines). Elle propose plusieurs formes de partenariat : financer un projet, cofinancer avec d'autres entreprises ou fondations, ou s'engager sur plusieurs années.",
        "Laquelle de ces formes serait la plus adaptée à {entreprise} ? Et pourriez-vous nous dire qui, de votre côté, valide ce type d'engagement financier ?",
      ),
    },
  ],
  rh: [
    {
      id: "rh-1",
      titre: "Engagement et mécénat",
      texte: message(
        "Nous avons vu que {entreprise} s'engage auprès de ses collaborateurs et de la société : [action précise : bénévolat, programme jeunes, politique RH responsable]. Cela nous intéresse.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales du Maroc : écoconstruction (plus de 200 habitats d'urgence depuis 2023), formation des jeunes, coopératives féminines, écotourisme solidaire.",
        "Amal Biladi cherche des entreprises partenaires pour financer ses projets, avec la possibilité d'y associer vos collaborateurs sur le terrain, par du mécénat de compétences. Pourriez-vous nous mettre en relation avec la personne, chez {entreprise}, qui porte les actions de mécénat et de soutien aux associations ?",
      ),
    },
    {
      id: "rh-2",
      titre: "Jeunes et emploi",
      texte: message(
        "Nous avons suivi l'engagement de {entreprise} pour [action précise : formation, insertion des jeunes, partenariat avec une école]. Cela rejoint notre sujet.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales du Maroc. Au-delà des plus de 200 habitats d'urgence écoconstruits depuis 2023, elle forme des jeunes et accompagne des coopératives de femmes pour créer des emplois sur place.",
        "Elle cherche aujourd'hui des financements pour développer ces actions de formation et d'emploi. Savez-vous quelle équipe, chez {entreprise}, examine les demandes de soutien financier de ce type, et pourriez-vous nous mettre en contact ?",
      ),
    },
    {
      id: "rh-3",
      titre: "Action terrain et financement",
      texte: message(
        "Nous avons vu que {entreprise} [action précise : journée solidaire, programme de bénévolat, engagement des équipes]. C'est une belle démarche.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc (écoconstruction, éducation, écotourisme solidaire, coopératives féminines). Les entreprises partenaires financent un projet et peuvent aussi impliquer leurs équipes directement sur le terrain.",
        "Si une telle collaboration vous semble pertinente pour {entreprise}, pourriez-vous nous orienter vers la personne qui porte le mécénat et les partenariats avec des associations ?",
      ),
    },
  ],
  communication: [
    {
      id: "communication-1",
      titre: "Partenariats et mécénat",
      texte: message(
        "Nous avons remarqué l'engagement de {entreprise} sur [action précise : programme, partenariat, projet soutenu vu sur LinkedIn ou dans la presse]. Cela nous a intéressés.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc : écoconstruction (plus de 200 habitats d'urgence depuis 2023), éducation, écotourisme solidaire, coopératives féminines.",
        "Amal Biladi cherche des entreprises partenaires pour financer ses projets. Comme vous suivez les engagements de {entreprise}, pourriez-vous nous indiquer qui s'occupe des demandes de mécénat et de partenariat, et nous mettre en relation ?",
      ),
    },
    {
      id: "communication-2",
      titre: "Projets à financer",
      texte: message(
        "Vos publications sur [action précise de l'entreprise] montrent un vrai engagement. Elles nous ont donné envie de vous écrire.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial du Maroc rural. Après plus de 200 habitats d'urgence écoconstruits depuis 2023, elle cherche des financements pour cinq projets : habitats, Maison des étoiles (formation des jeunes et écotourisme), eau, coopératives de femmes.",
        "Pourriez-vous nous indiquer qui, chez {entreprise}, examine les demandes de soutien financier des associations, afin que nous lui présentions ces projets ?",
      ),
    },
    {
      id: "communication-3",
      titre: "Bonne personne",
      texte: message(
        "Nous avons vu [action précise de l'entreprise], et nous aimerions comprendre comment {entreprise} choisit les causes qu'elle soutient financièrement.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc, à travers plusieurs projets : écoconstruction (plus de 200 habitats d'urgence), éducation, écotourisme solidaire, coopératives féminines.",
        "Amal Biladi cherche des partenaires financiers engagés dans les territoires. Pourriez-vous nous mettre en relation avec la personne qui traite les demandes de mécénat et de partenariat chez {entreprise} ?",
      ),
    },
  ],
  finance: [
    {
      id: "finance-1",
      titre: "Budget et décision",
      texte: message(
        "Nous avons suivi [fait précis : résultat, projet, engagement, rapport annuel ou ESG de l'entreprise]. Cela nous intéresse, et nous aimerions mieux comprendre vos priorités d'engagement.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc : écoconstruction (plus de 200 habitats d'urgence depuis 2023), formation des jeunes, coopératives féminines, écotourisme solidaire.",
        "Amal Biladi cherche des financements, avec une exigence : relier chaque budget engagé à un résultat concret et documenté. Pourriez-vous nous indiquer qui, chez {entreprise}, décide des budgets de mécénat et de partenariat associatif, et nous mettre en relation ?",
      ),
    },
    {
      id: "finance-2",
      titre: "Cadre de suivi",
      texte: message(
        "En lisant [document ou fait précis : rapport ESG, rapport annuel, communiqué], nous avons noté l'attention que {entreprise} porte à [thème]. Cela nous parle.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial du Maroc rural à travers cinq projets à financer, de 45 000 DH à 3 MDH (habitat, formation, écotourisme, eau, coopératives de femmes). Chaque partenariat s'accompagne d'une convention, d'un calendrier, d'un tableau de bord et d'un bilan d'impact.",
        "Si un engagement de ce type correspond à votre politique de mécénat, pourriez-vous nous orienter vers l'instance ou la personne qui l'examine ?",
      ),
    },
    {
      id: "finance-3",
      titre: "Question simple",
      texte: message(
        "Nous avons vu que {entreprise} [fait précis : résultat, engagement, projet soutenu]. Votre fonction vous donne une bonne vision de ces choix, c'est pourquoi nous nous permettons de vous écrire.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc, à travers plusieurs projets : habitat d'urgence écoconstruit (plus de 200 réalisés), éducation, écotourisme solidaire.",
        "Elle cherche des partenaires financiers pour ses prochains projets. Seriez-vous en mesure de nous dire quelle personne, chez {entreprise}, décide des soutiens financiers aux associations ? Un simple nom nous aiderait beaucoup.",
      ),
    },
  ],
  autre: [
    {
      id: "autre-1",
      titre: "Orientation",
      texte: message(
        "Nous avons vu que {entreprise} [action précise : programme, projet, engagement]. Cela nous intéresse, car nous travaillons sur un sujet proche.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc, à travers plusieurs projets : écoconstruction (plus de 200 habitats d'urgence depuis 2023), éducation, écotourisme solidaire, coopératives féminines.",
        "Amal Biladi cherche des entreprises partenaires pour financer ses projets. Je ne sais pas si vous êtes la bonne personne, mais pourriez-vous nous indiquer qui s'occupe des partenariats et du mécénat chez {entreprise}, et nous mettre en relation ?",
      ),
    },
    {
      id: "autre-2",
      titre: "Transmission du dossier",
      texte: message(
        "Nous suivons l'action de {entreprise}, en particulier [action précise], et elle nous inspire.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans des zones rurales du Maroc : habitat d'urgence écoconstruit (plus de 200 réalisés depuis 2023), formation des jeunes, écotourisme solidaire et coopératives de femmes.",
        "Nous préparons une présentation d'une page de cinq projets à financer pour les entreprises engagées. Pourriez-vous la transmettre à la personne qui gère le mécénat ou les partenariats chez {entreprise}, ou nous donner son contact ?",
      ),
    },
    {
      id: "autre-3",
      titre: "Conseil",
      texte: message(
        "Nous avons découvert [action précise de l'entreprise] et cela nous a donné envie d'échanger avec quelqu'un de chez {entreprise}.",
        "Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc, à travers plusieurs projets : écoconstruction (plus de 200 habitats d'urgence), éducation et formation, écotourisme solidaire, coopératives féminines.",
        "Amal Biladi cherche des soutiens financiers. Si vous connaissez les actions sociales de {entreprise}, à qui nous conseilleriez-vous de présenter ces projets ? Un nom ou une mise en relation nous aiderait beaucoup.",
      ),
    },
  ],
};

const FIN = `Merci d'avance pour votre attention.

Cordialement,
{expediteur}`;

// Relances : de la plus légère à la dernière (délai libre entre deux relances).
export const RELANCES: Record<"relance-1" | "relance-2" | "relance-finale", Modele[]> = {
  "relance-1": [
    {
      id: "relance-1-dirigeant",
      titre: "Relance 1 : dirigeant",
      texte: `Bonjour {prenom},

Je me permets de revenir vers vous suite à mon message sur Amal Biladi. Je sais que votre agenda est chargé.

L'association cherche des partenaires financiers pour ses projets de développement territorial dans les zones rurales et montagneuses du Maroc, et {entreprise} nous paraît un partenaire très pertinent. Si le sujet ne relève pas directement de vous, pourriez-vous simplement nous indiquer la personne chez {entreprise} qui s'occupe du mécénat et des partenariats ?

${FIN}`,
    },
    {
      id: "relance-1-autres",
      titre: "Relance 1 : autres profils",
      texte: `Bonjour {prenom},

Je reviens vers vous suite à mon précédent message concernant Amal Biladi, association qui agit pour le développement territorial dans les zones rurales et montagneuses du Maroc.

Nous cherchons à savoir qui, chez {entreprise}, examine les demandes de mécénat et de partenariat avec des associations. Un simple nom ou une mise en relation nous aiderait beaucoup. Et si c'est vous, nous vous enverrons volontiers une présentation d'une page.

${FIN}`,
    },
  ],
  "relance-2": [
    {
      id: "relance-2-presentation",
      titre: "Relance 2 : proposer la présentation",
      texte: `Bonjour {prenom},

Pour faciliter votre lecture, je vous propose de vous envoyer une présentation d'une page sur les projets d'Amal Biladi (écoconstruction, formation des jeunes, coopératives féminines, écotourisme solidaire), avec le budget de chacun.

Souhaitez-vous que je vous l'envoie ici, ou préférez-vous que je la transmette à la personne de {entreprise} en charge de ces sujets ?

${FIN}`,
    },
    {
      id: "relance-2-echange",
      titre: "Relance 2 : proposer un échange",
      texte: `Bonjour {prenom},

Si un échange de 15 minutes vous convient, nous pouvons vous présenter les projets d'Amal Biladi et voir s'il existe un point de rencontre avec les engagements de {entreprise}. Nous nous adaptons entièrement à vos disponibilités.

Si ce n'est pas le bon moment ou le bon interlocuteur, n'hésitez pas à nous orienter vers un collègue.

${FIN}`,
    },
  ],
  "relance-finale": [
    {
      id: "relance-finale-cloture",
      titre: "Relance finale : clôture polie",
      texte: `Bonjour {prenom},

Je ne veux pas vous solliciter davantage. Je laisse simplement ce dernier message au cas où le sujet vous intéresserait : Amal Biladi reste disponible pour présenter ses projets à {entreprise} quand vous le souhaitez.

Vous pouvez en savoir plus ici :
Site : www.amalbiladi.org
LinkedIn : {lien}

Je vous remercie pour votre temps et vous souhaite une excellente continuation.

Cordialement,
{expediteur}`,
    },
    {
      id: "relance-finale-contact",
      titre: "Relance finale : demander le bon contact",
      texte: `Bonjour {prenom},

Dernier message de ma part. Si vous n'êtes pas la bonne personne pour parler de mécénat associatif, pourriez-vous transmettre ce message à votre collègue concerné chez {entreprise} ou nous indiquer son nom ? Cela nous aiderait beaucoup.

${FIN}`,
    },
  ],
};

export function remplirModele(
  texte: string,
  v: { prenom: string; entreprise: string; expediteur: string },
) {
  const expediteurPrenom = v.expediteur.split(" ")[0] || "[Votre prénom]";
  return texte
    .replaceAll("{prenom}", v.prenom || "[Prénom]")
    .replaceAll("{entreprise}", v.entreprise || "[Entreprise]")
    .replaceAll("{expediteur_prenom}", expediteurPrenom)
    .replaceAll("{expediteur}", v.expediteur || "[Votre prénom et nom]")
    .replaceAll("{lien}", LIEN_LINKEDIN_AMAL_BILADI || "[lien LinkedIn Amal Biladi]");
}
