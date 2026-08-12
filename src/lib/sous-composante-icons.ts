import {
  IconBallFootball,
  IconBook2,
  IconBuilding,
  IconCertificate,
  IconCurrencyDollar,
  IconDeviceLaptop,
  IconDroplet,
  IconGift,
  IconHeartHandshake,
  IconHome,
  IconLeaf,
  IconMicroscope,
  IconMoon,
  IconSchool,
  IconSparkles,
  IconSun,
  IconTent,
  IconTool,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";

// Curated set, kept intentionally small and relevant to Amal Biladi's
// projects (éducation, camps, agriculture, construction, sport, eau…)
// rather than exposing the full Tabler catalogue.
export const SOUS_COMPOSANTE_ICONS: { key: string; label: string; icon: Icon }[] = [
  { key: "sparkles", label: "Général", icon: IconSparkles },
  { key: "device-laptop", label: "Numérique", icon: IconDeviceLaptop },
  { key: "gift", label: "Distribution", icon: IconGift },
  { key: "school", label: "Bourses / scolarité", icon: IconSchool },
  { key: "certificate", label: "Formation certifiante", icon: IconCertificate },
  { key: "book", label: "Éducation", icon: IconBook2 },
  { key: "droplet", label: "Eau", icon: IconDroplet },
  { key: "tool", label: "Équipement", icon: IconTool },
  { key: "users", label: "Communauté", icon: IconUsers },
  { key: "home", label: "Habitat", icon: IconHome },
  { key: "heart-handshake", label: "Partenariat", icon: IconHeartHandshake },
  { key: "sun", label: "Soleil", icon: IconSun },
  { key: "moon", label: "Lune", icon: IconMoon },
  { key: "ball-football", label: "Sport", icon: IconBallFootball },
  { key: "leaf", label: "Agriculture / environnement", icon: IconLeaf },
  { key: "building", label: "Construction", icon: IconBuilding },
  { key: "microscope", label: "Recherche", icon: IconMicroscope },
  { key: "tent", label: "Camps", icon: IconTent },
  { key: "currency-dollar", label: "Financement", icon: IconCurrencyDollar },
];

const ICON_BY_KEY = new Map(SOUS_COMPOSANTE_ICONS.map((i) => [i.key, i.icon]));

export function getSousComposanteIcon(key: string): Icon {
  return ICON_BY_KEY.get(key) ?? IconSparkles;
}
