import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_LEGAL_ENTITIES } from "@/lib/payroll/legal-entities";

export interface LegalEntityRecord {
  id: string;
  name: string;
  createdAt: string;
  usageCount: number;
}

function buildUsageCounts(
  rows: { legal_entity_paying: string | null }[] | null,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const name = row.legal_entity_paying?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

export async function getLegalEntities(): Promise<LegalEntityRecord[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data, error }, { data: payDetails, error: usageError }] =
    await Promise.all([
      supabase
        .from("legal_entities")
        .select("id, name, created_at")
        .order("name", { ascending: true }),
      supabase.from("pay_details").select("legal_entity_paying"),
    ]);

  if (usageError) {
    console.error("[getLegalEntities] usage", usageError.message);
  }

  const usageCounts = buildUsageCounts(payDetails);

  if (error) {
    console.error("[getLegalEntities]", error.message);
    return DEFAULT_LEGAL_ENTITIES.map((name, index) => ({
      id: `fallback-${index}`,
      name,
      createdAt: "",
      usageCount: usageCounts.get(name) ?? 0,
    }));
  }

  if (!data || data.length === 0) {
    return DEFAULT_LEGAL_ENTITIES.map((name, index) => ({
      id: `fallback-${index}`,
      name,
      createdAt: "",
      usageCount: usageCounts.get(name) ?? 0,
    }));
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    usageCount: usageCounts.get(row.name) ?? 0,
  }));
}

export async function getLegalEntityNames(): Promise<string[]> {
  const entities = await getLegalEntities();
  return entities.map((entity) => entity.name);
}
