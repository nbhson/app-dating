export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const sa = Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

function deg2rad(d: number) { return (d * Math.PI) / 180; }

export function formatDistance(km: number | null): string {
  if (km === null || Number.isNaN(km)) return "Khoảng cách ẩn";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// Làm mờ khoảng cách để bảo vệ privacy: ~ 1km nếu <5km, ~2km nếu xa hơn
export function obscureDistance(km: number | null): string {
  if (km === null) return "Khoảng cách ẩn";
  if (km < 1) return "~ 500 m";
  if (km < 5) return `~ ${Math.round(km)} km`;
  // làm tròn lên 2km
  const rounded = Math.round(km / 2) * 2;
  return `~ ${rounded} km`;
}

// Các tâm thành phố để seed fallback
export const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Quận 1, Sài Gòn": { lat: 10.7769, lng: 106.7009 },
  "Thảo Điền": { lat: 10.802, lng: 106.741 },
  "Đà Nẵng": { lat: 16.0544, lng: 108.2022 },
  "Hà Nội": { lat: 21.0285, lng: 105.8342 },
  "Bangkok": { lat: 13.7563, lng: 100.5018 },
  "Singapore": { lat: 1.3521, lng: 103.8198 },
  "Quận 3, Sài Gòn": { lat: 10.782, lng: 106.682 },
};
