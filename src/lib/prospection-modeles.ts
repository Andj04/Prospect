// Modèles de messages LinkedIn, repris du document « Messages LinkedIn Amal
// Biladi : après acceptation et relances » : un premier message par profil,
// puis les relances. Variables remplies automatiquement :
//   {salutation}         « Monsieur Belkhayat » / « Madame Tazi »
//   {entreprise}         nom de l'entreprise
//   {expediteur_prenom}  prénom de la personne connectée
//   {expediteur}         prénom et nom de la personne connectée
// Les passages entre crochets ([action précise…], [thème], [Sujet…]) restent à
// compléter à la main avec un fait vérifié sur l'entreprise.
import type { CategoriePoste } from "@/lib/prospection";

export type Modele = { id: string; titre: string; texte: string };

/** Les quatre temps de la séquence LinkedIn, dans l'ordre. */
export type TempsMessage = "premier" | "relance-1" | "relance-2" | "relance-finale";

export const TEMPS_MESSAGE: { value: TempsMessage; label: string }[] = [
  { value: "premier", label: "Premier message" },
  { value: "relance-1", label: "Relance 1" },
  { value: "relance-2", label: "Relance 2" },
  { value: "relance-finale", label: "Relance finale" },
];

/** À joindre à chaque premier message. */
export const PIECE_JOINTE =
  "Joindre l'image des réalisations d'Amal Biladi depuis 2023 et de ses partenaires.";

const PRESENTATION =
  "Je suis {expediteur_prenom}, du club 180 Degrees Consulting de l'École Centrale Casablanca. Nous collaborons avec Amal Biladi, une association qui agit pour le développement territorial autour de l'écotourisme dans les zones rurales et montagneuses du Maroc. Son expertise lui a permis de mettre en place plus de 200 habitats d'urgence depuis 2023. Je vous joins une image de ses réalisations et de ses partenaires.";

const LIENS = `Instagram : https://www.instagram.com/association_amal_biladi/
LinkedIn : https://www.linkedin.com/company/amal-biladi
Site : www.amalbiladi.org`;

const BLOC_FINAL = `NB : Amal Biladi bénéficie déjà du soutien de la Fondation BMCI, de la Fondation de France et d'autres partenaires.

Je vous partage quelques liens pour avoir plus d'informations sur Amal Biladi :
${LIENS}

Merci d'avance pour votre attention.

Cordialement,
{expediteur}`;

const FIN = `Merci d'avance pour votre attention.

Cordialement,
{expediteur}`;

const SUJETS =
  "[Sujet à choisir selon l'entreprise : habitat d'urgence écoconstruit, Maison des étoiles et écotourisme, formation des jeunes, accès à l'eau]";

const premier = (accroche: string, demande: string) =>
  `Bonjour {salutation}, merci d'avoir accepté mon invitation.

${accroche}

${PRESENTATION}

${demande}

${BLOC_FINAL}`;

/** Le premier message après acceptation : un seul par profil. */
export const PREMIER_MESSAGE: Record<CategoriePoste, Modele> = {
  dirigeant: {
    id: "premier-dirigeant",
    titre: "Dirigeant",
    texte: premier(
      "Nous avons suivi avec intérêt [action précise de l'entreprise : programme, projet, engagement]. Cela rejoint un sujet sur lequel nous travaillons.",
      "Amal Biladi cherche des partenaires pour collaborer sur des projets à impact, et l'engagement de {entreprise} sur [thème] nous laisse penser que cette collaboration pourrait rejoindre votre approche. Pourrait-on en discuter un petit moment ? Sinon, pourriez-vous nous mettre en relation avec la personne qui s'occupe de ces sujets chez vous ?",
    ),
  },
  "dirigeant-adjoint": {
    id: "premier-adjoint",
    titre: "Adjoint ou fondation",
    texte: premier(
      "Nous avons vu que {entreprise} soutient [action précise : programme, projet, partenariat associatif]. Cela nous intéresse beaucoup.",
      "Amal Biladi cherche des partenaires pour collaborer sur des projets à impact. Comment {entreprise} étudie-t-elle ce type de collaboration (dossier, calendrier, critères) ? Et pourriez-vous nous orienter vers la personne qui reçoit ces demandes ?",
    ),
  },
  rse: {
    id: "premier-rse",
    titre: "Responsable RSE",
    texte: premier(
      "Nous avons vu l'action de {entreprise} sur [programme ou action RSE précis]. C'est aussi le cœur de notre travail.",
      `Amal Biladi cherche des partenaires pour collaborer sur des projets à impact. Elle propose aux entreprises de transformer une partie de leur budget RSE en impact territorial mesurable, avec des indicateurs adaptés à votre reporting.

Nous souhaitions voir avec vous quels sont les projets sur lesquels on pourrait travailler. Compte tenu de vos axes RSE, nous pensons notamment à :
${SUJETS}

Sur lequel souhaiteriez-vous avoir un impact ? Pourrait-on en discuter un petit moment ?`,
    ),
  },
  rh: {
    id: "premier-rh",
    titre: "Responsable RH",
    texte: premier(
      "Nous avons vu que {entreprise} s'engage auprès de ses collaborateurs et de la société : [action précise : bénévolat, programme jeunes, politique RH responsable]. Cela nous intéresse.",
      "Amal Biladi cherche des partenaires pour collaborer sur des projets à impact. Les collaborateurs peuvent aussi s'y associer sur le terrain, par exemple via du mécénat de compétences. Pourriez-vous nous mettre en relation avec la personne, chez {entreprise}, qui porte les actions de mécénat et de soutien aux associations ?",
    ),
  },
  communication: {
    id: "premier-communication",
    titre: "Responsable communication",
    texte: premier(
      "Nous avons remarqué l'engagement de {entreprise} sur [action précise : programme, partenariat, projet soutenu vu sur LinkedIn ou dans la presse]. Cela nous a intéressés.",
      "Amal Biladi cherche des partenaires pour collaborer sur des projets à impact. Comme vous suivez les engagements de {entreprise}, pourriez-vous nous indiquer qui s'occupe des demandes de mécénat et de partenariat, et nous mettre en relation ?",
    ),
  },
  finance: {
    id: "premier-finance",
    titre: "Responsable finance ou gouvernance",
    texte: premier(
      "Nous avons suivi [fait précis : résultat, projet, engagement, rapport annuel ou ESG de l'entreprise]. Cela nous intéresse, et nous aimerions mieux comprendre vos priorités d'engagement.",
      "Amal Biladi cherche des partenaires pour collaborer sur des projets à impact, avec une exigence : relier chaque budget engagé à un résultat concret et documenté. Pourriez-vous nous indiquer qui, chez {entreprise}, décide des budgets de mécénat et de partenariat associatif, et nous mettre en relation ?",
    ),
  },
  autre: {
    id: "premier-autre",
    titre: "Autres postes",
    texte: premier(
      "Nous avons vu que {entreprise} [action précise : programme, projet, engagement]. Cela nous intéresse, car nous travaillons sur un sujet proche.",
      "Amal Biladi cherche des partenaires pour collaborer sur des projets à impact. Je ne sais pas si vous êtes la bonne personne, mais pourriez-vous nous indiquer qui s'occupe des partenariats et du mécénat chez {entreprise}, et nous mettre en relation ?",
    ),
  },
};

// Relances. Les phrases « hors RSE » ne sont ajoutées que pour les profils
// autres que RSE.
const relance1Dirigeant: Modele = {
  id: "relance-1-dirigeant",
  titre: "Dirigeant",
  texte: `Bonjour {salutation},

Je me permets de revenir vers vous suite à mon message sur Amal Biladi. Je sais que votre agenda est chargé.

L'association cherche des partenaires pour collaborer sur des projets à impact autour du développement territorial dans les zones rurales et montagneuses du Maroc, et {entreprise} nous paraît un partenaire pertinent. Pourrait-on en discuter un petit moment ? Sinon, pourriez-vous simplement nous indiquer la personne chez {entreprise} qui s'occupe du mécénat et des partenariats ?

${FIN}`,
};

const relance1Autres: Modele = {
  id: "relance-1-autres",
  titre: "Autres profils",
  texte: `Bonjour {salutation},

Je reviens vers vous suite à mon précédent message concernant Amal Biladi, association qui agit pour le développement territorial autour de l'écotourisme dans les zones rurales et montagneuses du Maroc. Elle cherche des partenaires pour collaborer sur des projets à impact.

Pourriez-vous nous indiquer qui, chez {entreprise}, examine les demandes de mécénat et de partenariat avec des associations ? Un simple nom ou une mise en relation nous aiderait beaucoup. Et si c'est vous, nous vous enverrons volontiers une présentation d'une page.

${FIN}`,
};

const relance2Presentation = (rse: boolean): Modele =>
  rse
    ? {
        id: "relance-2-presentation-rse",
        titre: "Proposer la présentation",
        texte: `Bonjour {salutation},

Pour faciliter votre lecture, je peux vous envoyer ici une présentation d'une page sur les projets d'Amal Biladi, notamment sur :
${SUJETS}

Sur lequel souhaiteriez-vous avoir un impact ?

${FIN}`,
      }
    : {
        id: "relance-2-presentation",
        titre: "Proposer la présentation",
        texte: `Bonjour {salutation},

Pour faciliter votre lecture, je peux vous envoyer ici une présentation d'une page sur les projets d'Amal Biladi (écoconstruction, formation des jeunes, écotourisme solidaire). Sur quel sujet souhaiteriez-vous avoir un impact ? Je peux aussi la transmettre directement à la personne de {entreprise} en charge de ces sujets.

${FIN}`,
      };

const relance2Echange = (rse: boolean): Modele => ({
  id: rse ? "relance-2-echange-rse" : "relance-2-echange",
  titre: "Proposer un échange",
  texte: `Bonjour {salutation},

Si un petit moment d'échange vous convient, nous pouvons vous présenter les projets d'Amal Biladi et voir comment ils rejoignent votre approche et les engagements de {entreprise}. Nous nous adaptons entièrement à vos disponibilités.${rse ? "" : " Si ce n'est pas le bon moment ou le bon interlocuteur, n'hésitez pas à nous orienter vers un collègue."}

${FIN}`,
});

const relanceFinaleCloture: Modele = {
  id: "relance-finale-cloture",
  titre: "Clôture polie",
  texte: `Bonjour {salutation},

Je ne veux pas vous solliciter davantage. Je laisse simplement ce dernier message au cas où le sujet vous intéresserait : Amal Biladi reste disponible pour présenter ses projets à {entreprise} quand vous le souhaitez.

Vous pouvez en savoir plus ici :
${LIENS}

Je vous remercie pour votre temps et vous souhaite une excellente continuation.

Cordialement,
{expediteur}`,
};

const relanceFinaleBonContact: Modele = {
  id: "relance-finale-bon-contact",
  titre: "Demander le bon contact",
  texte: `Bonjour {salutation},

Dernier message de ma part. Si vous n'êtes pas la bonne personne pour parler de mécénat associatif, pourriez-vous transmettre ce message à votre collègue concerné chez {entreprise} ou nous indiquer son nom ? Cela nous aiderait beaucoup.

${FIN}`,
};

/**
 * Modèles proposés à chaque temps selon le profil. Pour un responsable RSE, la
 * séquence est : présentation (version RSE), échange (sans les phrases hors
 * RSE), puis clôture polie ; « demander le bon contact » ne lui est pas envoyé.
 */
export function modelesPour(temps: TempsMessage, categorie: CategoriePoste): Modele[] {
  const rse = categorie === "rse";
  switch (temps) {
    case "premier":
      return [PREMIER_MESSAGE[categorie] ?? PREMIER_MESSAGE.autre];
    case "relance-1":
      if (rse) return [relance2Presentation(true)];
      return [categorie === "dirigeant" ? relance1Dirigeant : relance1Autres];
    case "relance-2":
      if (rse) return [relance2Echange(true)];
      return [relance2Presentation(false), relance2Echange(false)];
    case "relance-finale":
      return rse ? [relanceFinaleCloture] : [relanceFinaleCloture, relanceFinaleBonContact];
  }
}

export function remplirModele(
  texte: string,
  v: { salutation: string; entreprise: string; expediteur: string },
) {
  const expediteurPrenom = v.expediteur.split(" ")[0] || "[Votre prénom]";
  return texte
    .replaceAll("{salutation}", v.salutation || "[Monsieur/Madame Nom]")
    .replaceAll("{entreprise}", v.entreprise || "[Entreprise]")
    .replaceAll("{expediteur_prenom}", expediteurPrenom)
    .replaceAll("{expediteur}", v.expediteur || "[Votre prénom et nom]");
}
