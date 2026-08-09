# Prospect Green

Crée le FRONT-END uniquement (pas de backend, pas de base de données réelle, 

pas d'authentification réelle) d'une application web de gestion d'une base 

de prospection RSE (entreprises et fondations pouvant financer des projets 

d'une ONG marocaine, Amal Biladi).

Utilise des données mockées/statiques en local (tableau JS ou JSON en dur 

dans le code) pour simuler le contenu — la vraie base de données sera 

branchée séparément plus tard. Toutes les actions (ajouter, éditer, 

supprimer, changer un statut) doivent fonctionner visuellement sur ces 

données mockées (état en mémoire), sans persistance réelle nécessaire.

## IDENTITÉ VISUELLE

Utilise comme couleur principale un vert dans l'esprit du logo "180 Degrees 

Consulting" (dégradé de vert foncé à vert clair, style organique/spirale). 

Palette : vert comme couleur d'accent dominante (boutons primaires, liens actifs, 

highlights, barres de statut), blanc/gris très clair en fond, gris foncé pour le 

texte. Design épuré, professionnel, beaucoup d'espace blanc. Typographie moderne 

et lisible (sans-serif). L'app doit être fluide et intuitive : transitions douces, 

feedback visuel clair sur les actions (hover, clic, chargement), pas de surcharge 

visuelle. Priorité à la clarté et à la rapidité de navigation.

## PAS D'ÉCRAN DE CONNEXION

Ne pas créer d'écran de login pour l'instant. À la place, prévoir un simple 

sélecteur de rôle visible dans l'interface (ex. petit menu ou toggle dans le 

header : "Vue Admin" / "Vue Utilisateur") permettant de prévisualiser les 

deux niveaux d'accès sans vraie authentification. Ce sélecteur est temporaire, 

juste pour visualiser les deux expériences.

## DEUX VUES SELON LE RÔLE SÉLECTIONNÉ

**Vue Admin** : accès complet — gestion des entreprises, formulaire d'ajout, 

tableau type Excel, bouton export Excel (peut être un bouton non fonctionnel 

ou simulé pour l'instant), module Pipeline en édition complète, page "Gérer 

les utilisateurs" (liste mockée, formulaire de création avec email, mot de 

passe, nom complet, structure/organisation, rôle).

**Vue Utilisateur normal** : accès en lecture — liste des entreprises avec 

recherche, consultation des fiches, bouton export PDF de la fiche (peut être 

simulé), consultation du Pipeline en lecture seule.

## MODULE 1 — Gestion des entreprises (vue Admin)

### Formulaire d'ajout/édition d'une entreprise

Formulaire structuré en sections :

**1. Identité**

- Nom de l'entreprise/fondation (texte, obligatoire)

- Groupe / maison mère (texte)

- Secteur d'activité (texte)

- Structure dédiée : fondation existante ? (oui/non)

**2. Comment (mécanisme de financement)**

- Mode d'accès au financement (texte libre ou tags : appel à projets, 

  partenariat direct, mécénat de compétences, dons ponctuels)

- Budget / volume RSE si connu (texte libre)

- Type d'engagement (récurrent/structuré vs ponctuel)

**3. Quoi (ce qu'ils financent déjà) — 3 sous-champs distincts**

- Descriptif des activités de la fondation (texte long)

- Programmes (texte long)

- Projets déjà financés (texte long)

**4. Pourquoi (pertinence pour Amal Biladi)**

- Alignement thématique (texte long)

- Précédent le plus fort / porte d'entrée prioritaire (texte long)

- Proposition concrète à formuler (texte long)

**5. Contacts** (répétable, plusieurs contacts possibles)

Pour chaque contact : fonction (dirigeant / responsable RH / RSE-communication 

/ fondation / marketing / autre), nom, LinkedIn, email, téléphone.

**6. Projets Amal Biladi concernés**

- Sélection multiple parmi une liste de projets de référence (P1 à P9, 

  ex. Maison des Étoiles, Maison du Soleil, Camps Éco-Douirates, etc.)

**7. Statut d'exclusion (optionnel)**

- Case "entreprise exclue" (oui/non)

- Si oui : champ "raison de l'exclusion" (texte)

### Tableau type Excel (vue Admin)

- Table éditable en ligne, une ligne par entreprise, colonnes correspondant 

  aux champs ci-dessus (les champs longs tronqués avec aperçu au clic/hover)

- Tri et filtres par colonne (notamment par projet, secteur, structure dédiée)

- Recherche texte globale

- Bouton "Exporter en Excel" (visuel, peut être non fonctionnel pour l'instant)

## MODULE 2 — Consultation (vue Utilisateur normal)

### Liste des entreprises

- Liste/grille des entreprises avec recherche par nom

- Filtres simples (par projet Amal Biladi, par secteur)

- Clic sur une entreprise → ouvre sa fiche détaillée

### Fiche entreprise (lecture)

Affiche les sections dans cet ordre, en ne montrant que les champs renseignés :

1. Identité

2. Comment (mécanisme de financement)

3. Quoi (descriptif / programmes / projets financés)

4. Pourquoi (pertinence pour Amal Biladi)

5. Contacts (avec labels clairs par fonction, incluant responsable RH)

6. Projets Amal Biladi concernés (affichés comme badges/tags)

7. Bloc "Suivi" condensé (lecture seule) : statut actuel, responsable, 

   date du dernier contact, 2-3 dernières notes du pipeline

Bouton "Télécharger en PDF" (visuel, peut être simulé pour l'instant), qui 

doit reprendre l'identité visuelle verte de l'app dans sa mise en page prévue.

Le bloc Suivi ne doit PAS apparaître dans l'aperçu/maquette du PDF, 

uniquement à l'écran.

## MODULE 3 — Pipeline (vue globale)

Visible dans les deux vues (Admin et Utilisateur normal), avec édition 

uniquement dans la vue Admin.

Tableau/liste, une ligne par entreprise :

- Colonnes : Entreprise, Statut, Priorité, Responsable, Date dernier 

  contact, Prochaine action, Projet(s) lié(s)

- Statuts possibles : Identifié, Premier contact pris, En discussion, 

  Visite/présentation programmée, Proposition envoyée, Partenariat signé, 

  Classé sans suite (avec motif)

- Filtres par statut, par responsable, par priorité

- Tri par date de dernier contact

- Historique par entreprise : liste d'entrées horodatées (date, type 

  d'action, résumé, auteur), consultable en cliquant sur une ligne

- Vue Admin : édition complète (changer statut, ajouter une entrée 

  d'historique, assigner un responsable)

- Vue Utilisateur normal : lecture seule

## DONNÉES DE DÉMONSTRATION

Peupler l'interface avec 5 à 10 entreprises fictives mais réalistes 

(secteur RSE marocain) pour que toutes les vues soient testables visuellement 

dès le premier rendu.

## NAVIGATION GÉNÉRALE

- Barre de navigation claire séparant : Entreprises / Pipeline / 

  (Vue Admin : + Ajouter une entreprise, Export Excel, Gérer les utilisateurs)

- Le sélecteur de rôle (Admin / Utilisateur) doit être visible en permanence 

  dans le header

- Design responsive (utilisable sur ordinateur et tablette au minimum)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b45513ef-d619-4a30-8674-da36f4fcd7c9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

# Prospect
