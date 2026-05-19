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
    drive: row.drive,
    price: row.price_per_day,
    badge: row.badge,
    img: row.image_url,
    description: row.description,
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
