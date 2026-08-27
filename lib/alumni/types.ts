export type AlumniSource = "profile" | "record";

export interface AlumniRecord {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  personal_email: string | null;
  start_year: number | null;
  end_year: number | null;
  start_date: string | null;
  termination_date: string | null;
  placement: string | null;
  job_title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlumniProfileEntry {
  source: "profile";
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string;
  phone: string | null;
  job_title: string | null;
  department_name: string | null;
  business_unit_name: string | null;
  gender: string | null;
  avatar_url: string | null;
  leaving_reason: string | null;
  termination_date: string | null;
  start_date: string | null;
}

export interface AlumniRecordEntry {
  source: "record";
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  personal_email: string | null;
  start_year: number | null;
  end_year: number | null;
  start_date: string | null;
  termination_date: string | null;
  placement: string | null;
  job_title: string | null;
  notes: string | null;
}

export type AlumniDirectoryEntry = AlumniProfileEntry | AlumniRecordEntry;

export interface AlumniRecordInput {
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  personalEmail: string;
  startYear: string;
  endYear: string;
  startDate: string;
  terminationDate: string;
  placement: string;
  jobTitle: string;
  notes: string;
}
