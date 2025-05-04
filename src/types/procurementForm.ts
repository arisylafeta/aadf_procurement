// src/types/procurementForm.ts

// Shared type definitions for the procurement form

export type FieldType = 'text' | 'number' | 'file' | 'multi-file' | 'textarea' | 'select' | 'email';
export type ColumnType = 'text' | 'number' | 'file';
export type SectionType = 'standard' | 'table';

export interface Condition {
    fieldId: string;
    value: string | number | boolean;
}

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  accept?: string;
  maxSizeMB?: number;
  required: boolean;
  currency?: string;
  min?: number;
  step?: number;
  triggersConditional?: boolean;
  dependsOn?: string; // Field ID this field depends on
  condition?: Condition;
  options?: { value: string; label: string }[]; // For select type
  rows?: number; // For textarea type
  maxLength?: number; // For textarea type
  percentageScore?: number; // Percentage score for rating this field
  canDuplicate?: boolean; // Whether this field can be duplicated
  parentFieldId?: string; // Reference to the original field if this is a duplicate
}

export interface Column {
  id: string;
  label: string;
  type: ColumnType;
  placeholder?: string;
  required: boolean;
  min?: number;
  accept?: string;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  description?: string;
  type?: SectionType; // Default is 'standard'
  fields?: Field[];
  conditionalFields?: Field[]; // Fields shown based on a trigger
  columns?: Column[]; // Only for table type
  addLabel?: string; // Only for table type
  minRows?: number; // Only for table type
  gridCols?: string; // For custom grid columns e.g., 'md:grid-cols-3'
}

export interface FormConfig {
  formTitle: string;
  sections: Section[];
  submitLabel: string;
}

export interface StaffMember {
  id: number;
  staffIndex: number; // For staff member index
  [key: string]: string | number | boolean | File | FileList | null; 
}

export interface FormData { // Used for component state
  [key: string]: string | number | boolean | File | FileList | string[] | StaffMember[] | null;
}

export interface SubmissionStaffMember { 
    id: number;
    staffIndex: number;
    [key: string]: string | number | boolean | null; 
}

export interface SubmissionData { 
    procurementId: string;
    submissionId: string;
    staffMembers?: SubmissionStaffMember[]; 
    [key: string]: string | number | boolean | string[] | SubmissionStaffMember[] | null | undefined; 
}
