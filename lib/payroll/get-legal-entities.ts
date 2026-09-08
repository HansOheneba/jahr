import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_LEGAL_ENTITIES } from "@/lib/payroll/legal-entities";

export interface LegalEntityRecord {
  id: string;
  name: string;
  createdAt: string;
}

export async function getLegalEntities(): Promise<LegalEntityRecord[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("legal_entities")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("[getLegalEntities]", error.message);
    return DEFAULT_LEGAL_ENTITIES.map((name, index) => ({
      id: `fallback-${index}`,
      name,
      createdAt: "",
    }));
  }

  if (!data || data.length === 0) {
    return DEFAULT_LEGAL_ENTITIES.map((name, index) => ({
      id: `fallback-${index}`,
      name,
      createdAt: "",
    }));
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export async function getLegalEntityNames(): Promise<string[]> {
  const entities = await getLegalEntities();
  return entities.map((entity) => entity.name);
}
