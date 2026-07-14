import type { QueryResult } from "pg";

// Mock DB export since this project primarily connects via Supabase client directly.
// If connecting to a local raw Postgres instance, define your DB client export in src/db.ts.
const db = {
  query: async (_text: string, _params?: unknown[]): Promise<QueryResult> => {
    return {
      rows: [],
      rowCount: 0,
      command: "",
      oid: 0,
      fields: [],
    };
  },
};

export type PerformedBy = {
  id?: string | number;
  email?: string;
  name?: string;
};

export type ActionType = "role_change" | "delete" | "model_version_update" | string;

export interface AuditDetails {
  [key: string]: unknown;
}

export async function logAudit(
  actionType: ActionType,
  targetType: string | null,
  targetId: string | null,
  details: AuditDetails | null,
  performedBy: PerformedBy | null,
) {
  interface Queryable {
    query: (text: string, params?: unknown[]) => Promise<QueryResult>;
  }
  const client = db as unknown as Queryable;

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
    const res = await client.query(query, params);
    return res.rows[0];
  } catch (err) {
    // Fail-safe: log and continue so admin flows are not blocked by audit failures.
    console.error("Failed to write audit log", {
      actionType,
      targetType,
      targetId,
      performedBy,
      err,
    });
    return null;
  }
}
