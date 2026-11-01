import { REGIONS } from "@/lib/types";

export const regionNomParCode = (code: string) => REGIONS.find((r) => r.code === code)?.nom ?? code;
