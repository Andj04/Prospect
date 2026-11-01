"""Nettoie Base_ONG_partenaires_Amal_Biladi.xlsx et produit ong_amal_biladi_seed.json
(lu ensuite par scripts/seed-ong.mjs). Les règles de nettoyage sont décrites
dans la spécification « Ajout d'une section ONG ».

Usage : python scripts/build-ong-seed.py [--entreprises noms_entreprises.json]
  --entreprises : JSON {"entreprises":[{"nom","groupe"}]} (export de la table
  entreprises) ; sert à écarter les ONG déjà présentes côté entreprises et à
  proposer les passerelles.
"""

import io
import json
import re
import sys
import unicodedata
from collections import Counter, OrderedDict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "Base_ONG_partenaires_Amal_Biladi.xlsx"
OUT = ROOT / "ong_amal_biladi_seed.json"
OUT_PASSERELLES = ROOT / "ong_passerelles_a_valider.json"

# --- ONG déjà présentes dans la table entreprises : écartées de l'import ------
# (n° dans le fichier -> entreprise correspondante)
DEJA_ENTREPRISES = {
    40: "Fondation OCP",
    59: "Fondation BMCI (BNP Paribas)",
    67: "Fondation Attijariwafa bank",
}
# Doublons signalés par le fichier : le second est fusionné dans le premier.
FUSION = {33: 17}

PROJET_ALIAS = {  # nom dans le fichier -> nom dans la table projets
    "Hydrospitality": "Hydrospitalité",
    "Chaire de Recherche-Action": "Chaire de Recherche-Action-Intervention (DETAIR)",
}

TYPES = {
    "association": "association",
    "fondation": "fondation",
    "fondation d'entreprise": "fondation-entreprise",
    "association étudiante": "association-etudiante",
    "fédération ou union": "federation",
    "réseau international": "reseau-international",
}
APPORTS = [
    "Financement direct",
    "Accès à un réseau d'entreprises ou de bailleurs",
    "Expertise technique",
    "Relais terrain",
    "Recherche et évaluation",
    "Visibilité et communication",
    "Réplication d'un modèle",
]
VIDES = {"", "nc", "non trouvé", "non trouve", "introuvable", "inexistant", "none"}


def strip_accents(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def norm(s):
    s = strip_accents(str(s or "").lower())
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def blank(v):
    if v is None:
        return ""
    s = str(v).strip()
    return "" if s.lower() in VIDES else s


def split_top(s, seps=",;"):
    """Découpe sur les séparateurs hors parenthèses."""
    parts, depth, cur = [], 0, ""
    for ch in s:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch in seps and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return [p.strip() for p in parts if p.strip() and p.strip().lower() not in VIDES]


# --- Régions : déduction à partir des lieux cités -----------------------------
REGION_KEYWORDS = {
    "MA-01": "tanger tetouan al hoceima hoceima chefchaouen larache ouezzane asilah assilah martil mdiq fahs anjra",
    "MA-02": "oriental oujda berkane nador taourirt figuig jerada guercif saidia driouch",
    "MA-03": "fes meknes ifrane azrou sefrou taza taounate boulemane el hajeb moulay yacoub",
    "MA-04": "rabat sale kenitra temara skhirat harhoura khemisset sidi kacem sidi slimane tiflet gharb souissi agdal akdal",
    "MA-05": "beni mellal khenifra azilal fquih ben salah khouribga naour",
    "MA-06": "casablanca settat el jadida mohammedia benslimane berrechid nouaceur mediouna sidi bennour azemmour ain chock ain sebaa bouznika",
    "MA-07": "marrakech safi essaouira benguerir ben guerir youssoufia chichaoua al haouz kelaa des sraghna rehamna tahannaout ourika",
    "MA-08": "draa tafilalet ouarzazate errachidia midelt tinghir tinerhir zagora merzouga rissani",
    "MA-09": "souss massa agadir taroudant tiznit inezgane ait melloul chtouka tata ait baha taghazout arbaa sahel",
    "MA-10": "guelmim oued noun sidi ifni tan tan assa zag",
    "MA-11": "laayoune sakia el hamra boujdour smara semara tarfaya boucraa",
    "MA-12": "dakhla oued ed dahab aousserd",
}
# Les noms de région en entier, en un seul motif (évite que « oued noun » seul
# ne soit pris pour autre chose) ; les mots isolés ci-dessus restent des lieux.
REGION_NAMES = {
    "MA-01": ["tanger tetouan al hoceima"],
    "MA-02": ["oriental"],
    "MA-03": ["fes meknes"],
    "MA-04": ["rabat sale kenitra"],
    "MA-05": ["beni mellal khenifra"],
    "MA-06": ["casablanca settat"],
    "MA-07": ["marrakech safi"],
    "MA-08": ["draa tafilalet"],
    "MA-09": ["souss massa"],
    "MA-10": ["guelmim oued noun"],
    "MA-11": ["laayoune sakia el hamra"],
    "MA-12": ["dakhla oued ed dahab"],
}
# Lieux multi-mots d'abord, puis mots simples
PLACES = []
for code, kws in REGION_KEYWORDS.items():
    for ph in re.findall(
        r"tanger tetouan al hoceima|beni mellal|fquih ben salah|ben guerir|ait melloul|ait baha|arbaa sahel|"
        r"el hajeb|moulay yacoub|sidi kacem|sidi slimane|el jadida|sidi bennour|ain chock|ain sebaa|"
        r"al haouz|kelaa des sraghna|sidi ifni|tan tan|assa zag|sakia el hamra|oued noun|oued ed dahab|"
        r"al hoceima",
        kws,
    ):
        PLACES.append((ph, code))
    rest = kws
    for ph in re.findall(
        r"tanger tetouan al hoceima|beni mellal|fquih ben salah|ben guerir|ait melloul|ait baha|arbaa sahel|"
        r"el hajeb|moulay yacoub|sidi kacem|sidi slimane|el jadida|sidi bennour|ain chock|ain sebaa|"
        r"al haouz|kelaa des sraghna|sidi ifni|tan tan|assa zag|sakia el hamra|oued noun|oued ed dahab|"
        r"al hoceima",
        kws,
    ):
        rest = rest.replace(ph, " ")
    for w in rest.split():
        if w in ("el", "al", "ed", "des", "ben", "ait", "sidi", "oued", "ain", "tan", "assa", "zag", "sakia", "hamra", "noun", "dahab", "settat_"):
            continue
        PLACES.append((w, code))
PLACES.append(("tanger", "MA-01"))
for code, names in REGION_NAMES.items():
    for n in names:
        PLACES.append((n, code))


def detect_regions(text):
    t = " " + norm(text) + " "
    found = set()
    for ph, code in PLACES:
        if re.search(r"(?<![a-z0-9])" + re.escape(ph) + r"(?![a-z0-9])", t):
            found.add(code)
    return sorted(found)


def detect_echelle(siege, zones, terr):
    t = norm(" ; ".join([siege, zones, terr]))
    out = []
    zn = norm(zones)
    if re.search(r"\blocal\b", t):
        out.append("local")
    if re.search(r"\bregional\b|\bregionale\b|\bregionaux\b", t):
        out.append("regional")
    if (
        re.search(r"\bnational\b|\bnationale\b|toutes regions|toutes les regions|\b15 regions\b", t)
        or re.fullmatch(r"maroc", zn)
        or re.fullmatch(r"maroc \(portee nationale\)", zn)
    ):
        out.append("national")
    if re.search(r"\binternational\b|italie|etats unis|tunisie|afrique|moyen orient|europe", t):
        out.append("international")
    return out


def detect_milieu(zones, terr):
    t = norm(zones + " " + terr)
    out = []
    if re.search(r"\burbain|\burbaine|peri urbain", t):
        out.append("urbain")
    if re.search(r"\brural|\brurale", t):
        out.append("rural")
    if re.search(r"montagn|\batlas\b", t):
        out.append("montagnard")
    if re.search(r"\bcoti|littoral", t):
        out.append("cotier")
    return out


def clean_siege(s):
    s = blank(s)
    if not s:
        return ""
    s = re.sub(r"\([^)]*\)", "", s)
    first = ""
    for p in re.split(r"[/,]", s):
        p = p.strip()
        if p and norm(p) not in ("national", "maroc"):
            first = p
            break
    return first


def canon_thematiques(rows):
    """Une graphie par thématique (sans tenir compte de la casse ni des accents)."""
    variants = {}
    for r in rows:
        for t in split_top(blank(r), ",;"):
            variants.setdefault(norm(t), Counter())[t] += 1
    best = {}
    for k, c in variants.items():
        # préfère la variante accentuée, puis la plus fréquente
        v = sorted(c.items(), key=lambda kv: (-(kv[0] != strip_accents(kv[0])), -kv[1]))[0][0]
        best[k] = v[0].upper() + v[1:]
    return best


def parse_odd(s):
    s = re.sub(r"\([^)]*\)", " ", blank(s))
    nums = []
    for m in re.findall(r"\d+", s):
        n = int(m)
        if 1 <= n <= 17 and n not in nums:
            nums.append(n)
    return nums


ROYAL = re.compile(r"\bSM\b|Sa Majesté|Son Altesse|Princesse|\bRoi\b|\bSAR\b", re.I)

# Contacts découpés à la main quand la cellule mélange personnes et patronage.
CONTACTS_MANUELS = {
    12: (
        [
            ("Kaddour Kharbouch", "Vice-Président"),
            ("Abdel Salam", "Président actuel"),
        ],
        "Patronage royal : feu la Princesse Lalla Malika (1957-2021). Informations sur la présidence actuelle incomplètes.",
    ),
    17: ([("Leïla Mezian Benjelloun", "Présidente")], ""),
    20: (
        [("Karima M'kika", "Fondatrice et présidente")],
        "Patronage royal : Princesse Lalla Meryem, présidente d'honneur.",
    ),
    24: (
        [
            ("Abdelkrim Bencherki", "Président fondateur"),
            ("Abdelhak El Kadiri", "Membre fondateur"),
            ("Hosni Benslimane", "Membre fondateur"),
        ],
        "",
    ),
    30: ([("Hlima Razkaoui", "Leader (Top 100 Women Leaders in Africa)")], ""),
    31: (
        [
            ("Mohamed Aouad", "Président-fondateur"),
            ("Zine El Abidine El Alaoui", "Président"),
            ("Noureddine Chemaoû", "Président-délégué"),
        ],
        "",
    ),
    60: (
        [("Dounia Benyaich", "")],
        "Patronage royal : Princesse Lalla Hasnaa, présidente d'honneur.",
    ),
}


def parse_contacts(num, raw):
    raw = blank(raw)
    if not raw:
        return [], ""
    if num in CONTACTS_MANUELS:
        pairs, note = CONTACTS_MANUELS[num]
        return [{"nom": n, "fonction_detail": f} for n, f in pairs], note
    if ROYAL.search(raw):
        return [], f"Patronage royal : {raw.rstrip('.')}."
    out = []
    for part in split_top(raw, ";"):
        part = part.strip().rstrip(".")
        m = re.match(r"^(.*?)\s*\((.*)\)\s*$", part)
        if m:
            nom, fonction = m.group(1).strip(), m.group(2).strip()
        else:
            m = re.match(r"^([^,]+),\s*(.+)$", part)
            if m:
                nom, fonction = m.group(1).strip(), m.group(2).strip()
            else:
                nom, fonction = part, ""
        nom = re.sub(r"^(Mme|M\.|Dr\.?|Pr\.?)\s+", lambda mm: mm.group(0), nom).strip()
        fonction = fonction[:1].upper() + fonction[1:] if fonction else ""
        out.append({"nom": nom, "fonction_detail": fonction})
    return out, ""


def fonction_categorie(detail):
    return "dirigeant"  # tous les contacts nommés du fichier sont des dirigeants


def reseaux(fb, li, ig):
    out = []
    for typ, v in (("linkedin", li), ("facebook", fb), ("instagram", ig)):
        v = blank(v)
        if v.startswith("http"):
            out.append({"type": typ, "url": v})
    return out


def merge_text(a, b):
    if not b or b == a:
        return a
    if not a:
        return b
    if norm(b) in norm(a):
        return a
    return f"{a} ; {b}"


def main():
    ent_path = None
    if "--entreprises" in sys.argv:
        ent_path = Path(sys.argv[sys.argv.index("--entreprises") + 1])

    wb = openpyxl.load_workbook(XLSX, data_only=True)
    rows = list(wb.worksheets[0].iter_rows(values_only=True))
    H = list(rows[1])
    col = {h: i for i, h in enumerate(H)}
    data = [r for r in rows[2:] if r[1]]
    assert len(data) == 69, len(data)

    def g(r, name):
        return r[col[name]]

    them = canon_thematiques([g(r, "Thématiques") for r in data])

    # Matrice
    mrows = list(wb.worksheets[1].iter_rows(values_only=True))
    mh = None
    for i, r in enumerate(mrows):
        if r and r[0] == "#":
            mh = i
            break
    mcols = list(mrows[mh])
    proj_cols = [(j, mcols[j]) for j in range(3, 11)]
    matrice = {}
    for r in mrows[mh + 1 :]:
        if not isinstance(r[0], int):
            continue
        items = []
        for j, nom in proj_cols:
            if r[j] in ("Principal", "Lié"):
                items.append((PROJET_ALIAS.get(nom, nom), "principal" if r[j] == "Principal" else "lie"))
        matrice[r[0]] = items

    fiches = OrderedDict()
    rapport = {"ecartees": [], "fusion": [], "incoherences_matrice": []}

    for r in data:
        num = r[0]
        nom = blank(g(r, "Nom de l'ONG"))
        siege_raw = blank(g(r, "Siège"))
        zones = blank(g(r, "Zones d'intervention"))
        terr = blank(g(r, "Territoires précis"))
        contacts, note = parse_contacts(num, g(r, "Dirigeant et fonction"))
        apports = [a for a in APPORTS if a in (blank(g(r, "Apports possibles")))]
        fin_src = []
        if blank(g(r, "Financement international")).lower() == "oui":
            fin_src.append("international")
        if blank(g(r, "Financement diaspora")).lower() == "oui":
            fin_src.append("diaspora")
        partenaires = []
        seen = set()
        for colname, typ in (
            ("Partenaires privés", "prive"),
            ("Partenaires institutionnels", "institutionnel"),
            ("Partenaires académiques", "academique"),
            ("Bailleurs connus", "bailleur"),
        ):
            for p in split_top(blank(g(r, colname))):
                p = re.sub(r"\s*Modes signalés.*$", "", p).strip(" .")
                if not p or p.lower() in ("etc", "etc."):
                    continue
                k = (norm(p), typ)
                if k in seen:
                    continue
                seen.add(k)
                partenaires.append({"nom": p, "type": typ})
        t_raw = blank(g(r, "Thématiques"))
        thematiques = []
        for t in split_top(t_raw):
            c = them[norm(t)]
            if c not in thematiques:
                thematiques.append(c)
        dv = g(r, "Date de dernière vérification")
        fiches[num] = {
            "numero": num,
            "nom": nom,
            "acronyme": blank(g(r, "Acronyme")),
            "type_structure": TYPES[blank(g(r, "Type de structure")).lower()],
            "annee_creation": int(g(r, "Année de création")) if isinstance(g(r, "Année de création"), (int, float)) else None,
            "utilite_publique": True if blank(g(r, "Reconnue d'utilité publique")).lower() == "oui" else None,
            "thematiques": thematiques,
            "activites_principales": blank(g(r, "Activités principales")),
            "publics_cibles": blank(g(r, "Publics cibles")),
            "odd": parse_odd(g(r, "ODD")),
            "siege": clean_siege(siege_raw),
            "echelle": detect_echelle(siege_raw, zones, terr),
            "milieu": detect_milieu(zones, terr),
            "regions": detect_regions(" ; ".join([siege_raw, zones, terr])) or detect_regions(nom),
            "regions_verifiees": False,
            "territoires_precis": terr,
            "acces_financement": blank(g(r, "Mode d'accès au financement")),
            "budget_annuel": blank(g(r, "Budget annuel (capacité financière)")),
            "financement_sources": fin_src,
            "comment_partenariats": blank(g(r, "Comment elle noue ses partenariats")),
            "apports": apports,
            "atouts": blank(g(r, "Atouts")),
            "pourquoi_partenaire": blank(g(r, "Pourquoi ce partenaire")),
            "relation_amal_biladi": blank(g(r, "Relation existante avec Amal Biladi")),
            "transversale": blank(g(r, "Transversale")).lower() == "oui",
            "notes": note,
            "email": blank(g(r, "Email")),
            "telephone": blank(g(r, "Téléphone")),
            "site_web": blank(g(r, "Site web")),
            "reseaux": reseaux(g(r, "Facebook"), g(r, "LinkedIn"), g(r, "Instagram")),
            "sources": blank(g(r, "Sources")),
            "date_verification": dv.date().isoformat() if hasattr(dv, "date") else None,
            "signaux_concrets": g(r, "Signaux concrets (sur 5)"),
            "niveau_information": blank(g(r, "Niveau d'information")),
            "doublon_possible": blank(g(r, "Doublon possible avec")),
            "points_a_verifier": blank(g(r, "Points à vérifier")),
            "contacts": [
                {**c, "fonction_categorie": fonction_categorie(c["fonction_detail"])} for c in contacts
            ],
            "partenaires": partenaires,
            "projets": [{"projet": p, "role": ro} for p, ro in matrice.get(num, [])],
            "pipeline": {"statut": "partenaire-actif" if blank(g(r, "Statut")).lower() == "partenaire" else "a-contacter"},
        }
        # cohérence Fiches / Matrice (projet principal)
        pp = blank(g(r, "Projet principal"))
        pp = PROJET_ALIAS.get(pp, pp)
        mp = [p for p, ro in matrice.get(num, []) if ro == "principal"]
        if pp and mp != [pp]:
            rapport["incoherences_matrice"].append({"numero": num, "fiche": pp, "matrice": mp})

    # Fusion des doublons (le second est absorbé par le premier)
    for src, dst in FUSION.items():
        a, b = fiches[dst], fiches.pop(src)
        for k in ("annee_creation", "siege", "email", "telephone", "site_web"):
            if not a[k]:
                a[k] = b[k]
        if a["utilite_publique"] is None:
            a["utilite_publique"] = b["utilite_publique"]
        for k in ("activites_principales", "publics_cibles", "territoires_precis", "acces_financement",
                  "budget_annuel", "comment_partenariats", "atouts", "pourquoi_partenaire", "notes"):
            a[k] = merge_text(a[k], b[k])
        for k in ("thematiques", "odd", "echelle", "milieu", "regions", "apports", "financement_sources"):
            for v in b[k]:
                if v not in a[k]:
                    a[k].append(v)
        a["regions"].sort()
        a["odd"].sort()
        a["apports"] = [x for x in APPORTS if x in a["apports"]]
        have = {c["nom"].lower() for c in a["contacts"]}
        a["contacts"] += [c for c in b["contacts"] if c["nom"].lower() not in have]
        have = {(norm(p["nom"]), p["type"]) for p in a["partenaires"]}
        a["partenaires"] += [p for p in b["partenaires"] if (norm(p["nom"]), p["type"]) not in have]
        have = {p["projet"]: p for p in a["projets"]}
        for p in b["projets"]:
            if p["projet"] not in have:
                a["projets"].append({"projet": p["projet"], "role": "lie"})
        have_r = {x["url"] for x in a["reseaux"]}
        a["reseaux"] += [x for x in b["reseaux"] if x["url"] not in have_r]
        a["doublon_possible"] = ""
        a["points_a_verifier"] = merge_text(a["points_a_verifier"], f"Fusion avec le n° {src} ({b['nom']}).")
        a["signaux_concrets"] = max(a["signaux_concrets"] or 0, b["signaux_concrets"] or 0)
        rapport["fusion"].append({"conserve": dst, "absorbe": src})

    # Écartées parce que déjà dans entreprises
    for num, ent in DEJA_ENTREPRISES.items():
        f = fiches.pop(num)
        rapport["ecartees"].append({"numero": num, "nom": f["nom"], "entreprise": ent, "statut_fichier": f["pipeline"]["statut"]})

    # Passerelles candidates (partenaires privés / bailleurs ~ entreprises)
    passerelles = []
    vus = set()
    if ent_path:
        ents = json.loads(ent_path.read_text(encoding="utf-8"))["entreprises"]
        stop = set("fondation foundation groupe group maroc morocco bank banque de du des la le l d et and association s a sa holding societe".split())

        def core(s):
            return " ".join(w for w in norm(s).split() if w not in stop)

        for f in fiches.values():
            for p in f["partenaires"]:
                if p["type"] not in ("prive", "bailleur"):
                    continue
                a = core(p["nom"])
                if len(a) < 3:
                    continue
                for e in ents:
                    b = core(e["nom"].split("(")[0])
                    if len(b) >= 3 and (a == b or re.search(r"" + re.escape(b) + r"", a) or re.search(r"" + re.escape(a) + r"", b)):
                        cle = (f["nom"], norm(p["nom"]), e["id"])
                        if cle in vus:
                            continue
                        vus.add(cle)
                        passerelles.append({"ong": f["nom"], "partenaire": p["nom"], "type": p["type"], "entreprise_id": e["id"], "entreprise": e["nom"], "exact": a == b})

    out = {"ong": list(fiches.values())}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    if ent_path:
        OUT_PASSERELLES.write_text(json.dumps(passerelles, ensure_ascii=False, indent=1), encoding="utf-8")

    # Rapport
    L = list(fiches.values())
    reg = Counter(c for f in L for c in f["regions"])
    print(f"{len(L)} ONG écrites dans {OUT.name}")
    print("écartées :", json.dumps(rapport["ecartees"], ensure_ascii=False))
    print("fusion :", rapport["fusion"])
    print("incohérences fiche/matrice :", rapport["incoherences_matrice"])
    print("nationales :", sum("national" in f["echelle"] for f in L), "| internationales :", sum("international" in f["echelle"] for f in L))
    print("sans région :", [f["nom"] for f in L if not f["regions"]])
    print("régions :", dict(sorted(reg.items())))
    print("contacts :", sum(len(f["contacts"]) for f in L), "| notes patronage :", sum(bool(f["notes"]) for f in L))
    print("partenaires :", sum(len(f["partenaires"]) for f in L), "| liens projets :", sum(len(f["projets"]) for f in L))
    print("thématiques distinctes :", len({t for f in L for t in f["thematiques"]}))
    if ent_path:
        print("passerelles candidates :", len(passerelles), f"({sum(p['exact'] for p in passerelles)} exactes)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
