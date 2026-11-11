import type { AcroFormField, AutofillProfile } from './types';

export const DEFAULT_AUTOFILL_PROFILE: AutofillProfile = {
  fullName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  streetAddress: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  company: '',
  jobTitle: '',
  date: new Date().toISOString().split('T')[0] ?? ''
};

// In-memory store fallback for profile
let cachedProfile: AutofillProfile = { ...DEFAULT_AUTOFILL_PROFILE };

const DB_NAME = 'rhypdf_autofill_db';
const STORE_NAME = 'profile';

function openAutofillDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAutofillProfile(profile: AutofillProfile): Promise<void> {
  cachedProfile = { ...profile };
  try {
    const db = await openAutofillDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(profile, 'user_profile');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Keep in memory
  }
}

export async function loadAutofillProfile(): Promise<AutofillProfile> {
  try {
    const db = await openAutofillDb();
    const result = await new Promise<AutofillProfile | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('user_profile');
      req.onsuccess = () => resolve(req.result as AutofillProfile | undefined);
      req.onerror = () => reject(req.error);
    });
    if (result) {
      cachedProfile = { ...result };
      return result;
    }
  } catch {
    // Return memory cache
  }
  return { ...cachedProfile };
}

/**
 * Matches a form field name against an autofill profile using semantic heuristics.
 */
export function matchFieldToProfile(
  fieldName: string,
  profile: AutofillProfile
): string | undefined {
  const norm = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check full name first
  if (
    norm.includes('fullname') ||
    norm.includes('legalname') ||
    norm.includes('applicantname') ||
    norm.includes('clientname')
  ) {
    if (profile.fullName) return profile.fullName;
  }
  if (
    (norm.includes('firstname') || norm === 'fname' || norm.includes('givenname')) &&
    profile.firstName
  ) {
    return profile.firstName;
  }
  if (
    (norm.includes('lastname') ||
      norm === 'lname' ||
      norm.includes('surname') ||
      norm.includes('familyname')) &&
    profile.lastName
  ) {
    return profile.lastName;
  }
  if (norm.includes('email') || norm.includes('mail')) {
    if (profile.email) return profile.email;
  }
  if (
    norm.includes('phone') ||
    norm.includes('tel') ||
    norm.includes('mobile') ||
    norm.includes('cell')
  ) {
    if (profile.phone) return profile.phone;
  }
  if (norm.includes('address') || norm.includes('street') || norm.includes('addr')) {
    if (profile.streetAddress) return profile.streetAddress;
  }
  if (norm.includes('city') || norm.includes('town')) {
    if (profile.city) return profile.city;
  }
  if (norm.includes('state') || norm.includes('province') || norm.includes('region')) {
    if (profile.state) return profile.state;
  }
  if (norm.includes('zip') || norm.includes('postal') || norm.includes('postcode')) {
    if (profile.postalCode) return profile.postalCode;
  }
  if (norm.includes('country') || norm.includes('nation')) {
    if (profile.country) return profile.country;
  }
  if (norm.includes('company') || norm.includes('organization') || norm.includes('employer')) {
    if (profile.company) return profile.company;
  }
  if (norm.includes('title') || norm.includes('position') || norm.includes('occupation')) {
    if (profile.jobTitle) return profile.jobTitle;
  }
  if (norm.includes('date') || norm.includes('today')) {
    if (profile.date) return profile.date;
  }
  if (norm.includes('name') && !norm.includes('file')) {
    if (profile.fullName) return profile.fullName;
  }

  return undefined;
}

/**
 * Autofills all matching text fields in an array of form fields.
 */
export function autofillFormFields(
  fields: AcroFormField[],
  profile: AutofillProfile
): Map<string, string> {
  const matchedValues = new Map<string, string>();

  for (const field of fields) {
    if (field.readOnly) continue;
    if (field.type === 'text') {
      const matched = matchFieldToProfile(field.name, profile);
      if (matched !== undefined) {
        matchedValues.set(field.id, matched);
      }
    }
  }

  return matchedValues;
}
