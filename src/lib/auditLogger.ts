// Minimal Postgres-based audit logger using `pg` pool.
// Adjust the import path for your existing db pool / query function if needed.
import type { Pool } from 'pg';
import db from '../db'; // <-- Adjust this path to your project's DB export. It should expose a `query(text, params)` function or be a `Pool`.

export type PerformedBy = {
  id?: string | number;
  email?: string;
  name?: string;
};

export type ActionType = 'role_change' | 'delete' | 'model_version_update' | string;

export async function logAudit(
  actionType: ActionType,
  targetType: string | null,
  targetId: string | null,
  details: Record<string, any> | null,
  performedBy: PerformedBy | null
) {
  const client: Pool | { query: (text: string, params?: any[]) => Promise<any> } = db as any;

  const query = `
    INSERT INTO audit_logs
      (action_type, target_type, target_id, details, performed_by_id, performed_by_email, performed_by_name)
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
    RETURNING id, created_at;
  `;

  const params = [
    actionType,
    targetType,
    targetId,
    details ? JSON.stringify(details) : JSON.stringify({}),
    performedBy?.id?.toString() ?? null,
    performedBy?.email ?? null,
    performedBy?.name ?? null,
  ];

  try {
    const res = await (client as any).query(query, params);
    return res.rows[0];
  } catch (err) {
    // Fail-safe: log and continue so admin flows are not blocked by audit failures.
    console.error('Failed to write audit log', { actionType, targetType, targetId, performedBy, err });
    return null;
  }
}
