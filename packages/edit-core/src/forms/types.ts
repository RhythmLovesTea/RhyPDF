import type { Rect } from '@rhypdf/pdf-model';

export type FormFieldType =
  'text' | 'checkbox' | 'radio' | 'dropdown' | 'list' | 'button' | 'signature';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface AcroFormField {
  id: string;
  pageIndex: number;
  bounds: Rect;
  type: FormFieldType;
  name: string;
  value: string | boolean | string[];
  defaultValue?: string | boolean;
  readOnly?: boolean;
  required?: boolean;
  options?: FormFieldOption[];
  tabOrder?: number;
  exportValue?: string;
  groupName?: string;
}

export interface AutofillProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  company: string;
  jobTitle: string;
  date: string;
}

export interface CreateFormFieldOptions {
  pageIndex: number;
  type: FormFieldType;
  name: string;
  bounds: Rect;
  defaultValue?: string | boolean;
  required?: boolean;
  readOnly?: boolean;
  options?: FormFieldOption[];
}
