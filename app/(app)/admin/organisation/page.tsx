import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AUTH_BYPASS } from "@/lib/auth/config";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import {
  isOrgAdmin,
  type BusinessUnit,
  type Department,
} from "@/lib/types/database";
import { createClient } from "@/utils/supabase/server";

const PREVIEW_UNITS: BusinessUnit[] = [
  {
    id: "bu-wealth",
    name: "JA Wealth",
    slug: "ja-wealth",
    description: "Wealth planning and financial services",
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "bu-digital",
    name: "JA Digital",
    slug: "ja-digital",
    description: "Technology and digital finance investments",
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "bu-realty",
    name: "JA Realty",
    slug: "ja-realty",
    description: "Real estate acquisition, development, and renovation",
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "bu-elements",
    name: "JA Elements",
    slug: "ja-elements",
    description: "Natural resources and energy investments",
    is_active: true,
    created_at: "",
    updated_at: "",
  },
];

const PREVIEW_DEPARTMENTS: Department[] = [
  {
    id: "dep-eng",
    business_unit_id: "bu-digital",
    name: "Engineering",
    slug: "engineering",
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "dep-product",
    business_unit_id: "bu-digital",
    name: "Product",
    slug: "product",
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "dep-advisory",
    business_unit_id: "bu-wealth",
    name: "Advisory",
    slug: "advisory",
    is_active: true,
    created_at: "",
    updated_at: "",
  },
];

export default async function OrganisationPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile.role)) {
    redirect("/dashboard");
  }

  let businessUnits: BusinessUnit[] = [];
  let allDepartments: Department[] = [];

  if (AUTH_BYPASS) {
    businessUnits = PREVIEW_UNITS;
    allDepartments = PREVIEW_DEPARTMENTS;
  } else {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [{ data: units }, { data: departments }] = await Promise.all([
      supabase
        .from("business_units")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true }),
    ]);

    businessUnits = (units ?? []) as BusinessUnit[];
    allDepartments = (departments ?? []) as Department[];
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Organisation</h1>
        <p className="text-muted-foreground">
          Business units and departments are stored in the database - add or
          rename them without shipping code.
        </p>
      </div>

      <div className="grid gap-4">
        {businessUnits.map((unit) => {
          const unitDepartments = allDepartments.filter(
            (department) => department.business_unit_id === unit.id,
          );

          return (
            <Card key={unit.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{unit.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {unit.slug}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {unit.description ?? "No description yet."}
                </p>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Departments
                  </p>
                  {unitDepartments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No departments yet - add them from admin tools next.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {unitDepartments.map((department) => (
                        <li
                          key={department.id}
                          className="rounded-md bg-secondary px-3 py-1.5 text-sm"
                        >
                          {department.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
