import { q } from './db.js';

// Запись в журнал аудита. Fire-and-forget: не роняем основной запрос, если лог не записался.
export function logAudit(req, entity_type, entity_id, action, changes = null) {
  const u = req?.user || {};
  q(
    `INSERT INTO audit_log (entity_type, entity_id, action, actor_id, actor_name, actor_role, changes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [entity_type, String(entity_id ?? ''), action, u.id ?? null, u.name ?? null, u.role ?? null, changes ? JSON.stringify(changes) : null],
  ).catch((e) => console.warn('[audit] не записан:', e.message));
}
