import { api } from './client.js';

// Normalize API row → frontend shape (compatible with FLEET[].* usage across the app).
function normalize(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    year: row.year,
    body: row.body,
    fuel: row.fuel,
    engine: row.engine,
    power: row.power_hp ? `${row.power_hp} л.с.` : '',
    power_hp: row.power_hp,
    drive: row.drive,
    price: row.price_per_day,
    price_per_day: row.price_per_day,
    price_6_12: row.price_6_12 ?? null,
    price_30: row.price_30 ?? null,
    deposit: row.deposit ?? 0,
    mileage_limit: row.mileage_limit ?? 250,
    overmileage_rate: row.overmileage_rate ?? 200,
    photo_rate: row.photo_rate ?? 0,
    badge: row.badge,
    img: row.image_url,
    image_url: row.image_url,
    description: row.description,
    photos: Array.isArray(row.photos) ? row.photos : [],
    closed_until: row.closed_until ?? null, // «закрыта до даты» — плашка «В аренде»
  };
}

export async function listCars(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  );
  const data = await api(`/cars?${qs.toString()}`);
  return { items: (data.items || []).map(normalize), total: data.total };
}

export async function getCar(id) {
  const row = await api(`/cars/${id}`);
  return normalize(row);
}
