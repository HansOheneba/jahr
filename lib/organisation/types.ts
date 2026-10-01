export interface OrganisationDepartmentView {
  id: string;
  name: string;
  isActive: boolean;
  employeeCount: number | null;
}

export interface OrganisationUnitView {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount: number | null;
  departments: OrganisationDepartmentView[];
}

export interface OrganisationStructure {
  units: OrganisationUnitView[];
  departmentCount: number;
  employeeCount: number | null;
}
