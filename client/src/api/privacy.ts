import api from './index';

export interface PrivacyCaptain {
  id: string;
  name: string;
  zone: string;
  photo_url: string | null;
  is_my_captain: boolean;
  whatsapp_shared: boolean;
}

export type ConsentType = 'terms_privacy' | 'age_18_plus' | 'marketing_email' | 'captain_whatsapp' | 'applicant_privacy';

export interface ConsentHistoryEntry {
  consent_type: ConsentType;
  granted: boolean;
  policy_slug: string | null;
  policy_version: string | null;
  source: string;
  created_at: string;
  captain_name: string | null;
}

export interface MyPrivacy {
  marketing_opt_in: boolean | null;
  marketing_opt_in_at: string | null;
  privacy_version_accepted: string | null;
  privacy_accepted_at: string | null;
  age_confirmed_at: string | null;
  has_password: boolean;
  captains: PrivacyCaptain[];
  history: ConsentHistoryEntry[];
  delete_grace_days: number;
}

export const getMyPrivacy = async (): Promise<MyPrivacy> => {
  const response = await api.get('/me/privacy');
  return response.data;
};

export const setMyMarketing = async (optIn: boolean): Promise<{ marketing_opt_in: boolean }> => {
  const response = await api.put('/me/privacy/marketing', { optIn });
  return response.data;
};

export const setMyWhatsappShare = async (captainId: string, enabled: boolean) => {
  const response = await api.put(`/me/privacy/whatsapp/${captainId}`, { enabled });
  return response.data as { captain_id: string; whatsapp_shared: boolean };
};

/** Saves the member's information file through the browser's download prompt. */
export const downloadMyData = async (): Promise<void> => {
  const response = await api.get('/me/privacy/export', { responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'trfc-my-information.json';
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const deleteMyAccount = async (data: { password?: string; confirm?: string }) => {
  const response = await api.post('/me/privacy/delete', data);
  return response.data as { ok: true; delete_within_days: number };
};

const CONSENT_LABELS: Record<ConsentType, [string, string]> = {
  terms_privacy: ['Agreed to the terms', 'Withdrew agreement to the terms'],
  age_18_plus: ['Confirmed 18 or older', 'Age confirmation removed'],
  marketing_email: ['Promotion emails on', 'Promotion emails off'],
  captain_whatsapp: ['WhatsApp shared with captain', 'WhatsApp access removed'],
  applicant_privacy: ['Agreed to the applicant terms', 'Withdrew agreement to the applicant terms'],
};

const SOURCE_LABELS: Record<string, string> = {
  signup: 'at sign-up',
  google_signup: 'at sign-up with Google',
  login_prompt: 'when signing in',
  settings: 'in privacy settings',
  unsubscribe_link: 'from an email link',
  account_deleted: 'when the account was deleted',
  coach_form: 'on the coach application',
};

export function describeConsent(entry: ConsentHistoryEntry): string {
  const [on, off] = CONSENT_LABELS[entry.consent_type] ?? [entry.consent_type, `${entry.consent_type} withdrawn`];
  let text = entry.granted ? on : off;
  if (entry.consent_type === 'captain_whatsapp' && entry.captain_name) text += ` (${entry.captain_name})`;
  if (entry.policy_version && entry.policy_slug) text += ` · ${entry.policy_slug} v${entry.policy_version}`;
  const source = SOURCE_LABELS[entry.source];
  return source ? `${text} ${source}` : text;
}

export function formatConsentTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
