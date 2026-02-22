import type { OrderItem } from "./types";

/** Display order for predefined delivery groups */
export const GROUP_ORDER = ["Pickup", "Fri-P", "Fri-K", "Sat-P", "Sat-K"];

/** Zip-based group assignment for ambiguous cities (San Jose, Sunnyvale, Mountain View) */
export const ZIP_TO_GROUP: Record<string, string> = {
  "95132": "Fri-P",
  "95133": "Fri-P",
  "94086": "Fri-K",
  "94043": "Fri-K",
  "94087": "Sat-P",
  "95129": "Sat-P",
  "94040": "Sat-P",
};

/** City-based group assignment for unambiguous cities */
export const CITY_TO_GROUP: Record<string, string> = {
  "San Ramon": "Pickup",
  Hayward: "Fri-P",
  Fremont: "Fri-P",
  Milpitas: "Fri-P",
  Newark: "Fri-P",
  Saratoga: "Sat-P",
  Cupertino: "Sat-P",
  "San Francisco": "Sat-P",
  "Palo Alto": "Sat-P",
  "Los Altos": "Sat-P",
  "Santa Clara": "Sat-P",
  Belmont: "Sat-P",
  "San Mateo": "Sat-P",
  "Redwood City": "Sat-P",
  Atherton: "Sat-P",
  "San Carlos": "Sat-P",
  "Los Gatos": "Sat-P",
  Albany: "Sat-K",
  "San Leandro": "Sat-K",
};

/** Fixed color per predefined group */
export const GROUP_COLORS_MAP: Record<string, string> = {
  Pickup: "#a3a3a3",
  "Fri-P": "#60a5fa",
  "Fri-K": "#2dd4bf",
  "Sat-P": "#f87171",
  "Sat-K": "#c084fc",
};

/** Assign a group based on city and zip. Zip takes priority for ambiguous cities. */
export function assignGroup(city: string, zip: string): string | undefined {
  if (zip && ZIP_TO_GROUP[zip]) return ZIP_TO_GROUP[zip];
  if (city && CITY_TO_GROUP[city]) return CITY_TO_GROUP[city];
  return undefined;
}

/**
 * Sort orders by group: predefined groups in GROUP_ORDER, then user-added groups
 * alphabetically, then ungrouped last. Within each group, original order is preserved.
 */
export function sortByGroupOrder(orders: OrderItem[], hasGroups: boolean): OrderItem[] {
  if (!hasGroups) return orders;

  const groupRank = new Map<string, number>();
  GROUP_ORDER.forEach((g, i) => groupRank.set(g, i));

  return [...orders].sort((a, b) => {
    const ga = a.group;
    const gb = b.group;

    // Ungrouped goes last
    if (!ga && !gb) return 0;
    if (!ga) return 1;
    if (!gb) return -1;

    const ra = groupRank.get(ga);
    const rb = groupRank.get(gb);

    // Both predefined
    if (ra !== undefined && rb !== undefined) return ra - rb;
    // Predefined before user-added
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    // Both user-added: alphabetical
    return ga.localeCompare(gb);
  });
}
