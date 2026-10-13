import type { DotMapArc, DotMapMarker } from "@/components/dithercn/dot-map";

// Shared locations for the dot map demos. Coordinates are [lat, lon].

export const SAN_FRANCISCO = [37.77, -122.42] as const;
export const NEW_YORK = [40.71, -74.01] as const;
export const SAO_PAULO = [-23.55, -46.63] as const;
export const LONDON = [51.51, -0.13] as const;
export const LAGOS = [6.52, 3.38] as const;
export const SINGAPORE = [1.35, 103.82] as const;
export const TOKYO = [35.68, 139.69] as const;
export const SYDNEY = [-33.87, 151.21] as const;

export const OFFICES: readonly DotMapMarker[] = [
  { at: SAN_FRANCISCO, label: "SFO" },
  { at: NEW_YORK, label: "NYC" },
  { at: SAO_PAULO, label: "GRU" },
  { at: LONDON, label: "LHR" },
  { at: LAGOS, label: "LOS" },
  { at: SINGAPORE, label: "SIN" },
  { at: TOKYO, label: "NRT" },
  { at: SYDNEY, label: "SYD" },
];

export const ROUTES: readonly DotMapArc[] = [
  { from: SAN_FRANCISCO, to: LONDON },
  { from: NEW_YORK, to: SAO_PAULO },
  { from: LONDON, to: SINGAPORE },
  { from: SINGAPORE, to: SYDNEY },
  { from: TOKYO, to: SAN_FRANCISCO },
  { from: LONDON, to: LAGOS },
];

/** Customer cities for the "customers worldwide" section. */
export const CUSTOMERS: readonly DotMapMarker[] = [
  { at: [47.61, -122.33] },
  { at: [34.05, -118.24] },
  { at: [19.43, -99.13] },
  { at: [43.65, -79.38] },
  { at: NEW_YORK },
  { at: [4.71, -74.07] },
  { at: [-34.6, -58.38] },
  { at: SAO_PAULO },
  { at: [53.35, -6.26] },
  { at: LONDON },
  { at: [48.86, 2.35] },
  { at: [52.52, 13.4] },
  { at: [59.33, 18.07] },
  { at: [41.9, 12.5] },
  { at: [30.04, 31.24] },
  { at: LAGOS },
  { at: [-1.29, 36.82] },
  { at: [-33.92, 18.42] },
  { at: [25.2, 55.27] },
  { at: [19.08, 72.88] },
  { at: [12.97, 77.59] },
  { at: SINGAPORE },
  { at: [-6.21, 106.85] },
  { at: [22.32, 114.17] },
  { at: [37.57, 126.98] },
  { at: TOKYO },
  { at: SYDNEY },
  { at: [-36.85, 174.76] },
];

/** European edge regions for the region map. */
export const EDGE_REGIONS: readonly DotMapMarker[] = [
  { at: [53.35, -6.26], label: "dub1" },
  { at: LONDON, label: "lhr1" },
  { at: [48.86, 2.35], label: "cdg1" },
  { at: [50.11, 8.68], label: "fra1" },
  { at: [59.33, 18.07], label: "arn1" },
  { at: [40.42, -3.7], label: "mad1" },
  { at: [45.46, 9.19], label: "mxp1" },
];
