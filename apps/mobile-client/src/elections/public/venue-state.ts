export type VenueState = {
  lat: string;
  lng: string;
  address: string;
  radiusM: string;
};
export type VenuePlace = {
  lat: number;
  lng: number;
  name: string;
  detail: string;
  address: string;
};
export const validVenueCoordinates = (value: VenueState) =>
  value.lat.trim() !== "" &&
  value.lng.trim() !== "" &&
  Number.isFinite(Number(value.lat)) &&
  Number.isFinite(Number(value.lng)) &&
  Math.abs(Number(value.lat)) <= 90 &&
  Math.abs(Number(value.lng)) <= 180;
export const validVenueRadius = (value: string) =>
  value.trim() !== "" &&
  Number.isInteger(Number(value)) &&
  Number(value) >= 20 &&
  Number(value) <= 10000;
export const venueDirty = (value: VenueState, saved: VenueState | null) =>
  !saved ||
  Number(value.lat) !== Number(saved.lat) ||
  Number(value.lng) !== Number(saved.lng) ||
  Number(value.radiusM) !== Number(saved.radiusM) ||
  value.address !== saved.address;
