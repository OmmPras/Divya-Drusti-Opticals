import { CheckCircle2, Cookie, Lock, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';

export interface CookiePreferences {
  essential: true;
  optionalAnalytics: boolean;
  optionalUiPreferences: boolean;
  decidedAt: string;
}

const CONSENT_KEY = 'ddo_cookie_consent_v1';

export function getSavedCookiePreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

export function saveCookiePreferences(prefs: CookiePreferences) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

interface Props {
  isOpen: boolean;
  initialTab?: 'preferences' | 'privacy' | 'cookie-policy';
  onClose: () => void;
  onSave: (prefs: CookiePreferences) => void;
}

export function CookiePolicyModal({ isOpen, initialTab = 'preferences', onClose, onSave }: Props) {
  const saved = getSavedCookiePreferences();
  const [activeTab, setActiveTab] = useState<'preferences' | 'privacy' | 'cookie-policy'>(initialTab);
  const [optionalAnalytics, setOptionalAnalytics] = useState<boolean>(saved?.optionalAnalytics ?? false);
  const [optionalUiPreferences, setOptionalUiPreferences] = useState<boolean>(saved?.optionalUiPreferences ?? true);

  if (!isOpen) return null;

  const commit = (analytics: boolean, uiPrefs: boolean) => {
    const next: CookiePreferences = {
      essential: true,
      optionalAnalytics: analytics,
      optionalUiPreferences: uiPrefs,
      decidedAt: new Date().toISOString(),
    };
    saveCookiePreferences(next);
    onSave(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#1E40AF]" />
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Privacy, Consent & Cookie Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close privacy and cookie settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Cookie Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cookie-policy')}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'cookie-policy'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Cookie Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-[#1E40AF] text-[#1E40AF]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient Privacy Policy
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 text-sm text-slate-700">
          {activeTab === 'preferences' && (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Lock className="h-4 w-4 text-[#1E40AF]" />
                      <span>Strictly Necessary Authentication Cookies</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Essential <code className="font-mono text-slate-800">HttpOnly; Secure; SameSite</code> session cookies (<code className="font-mono text-slate-800">ddo_session</code>) protect clinical logins, role-based access, and CSRF security. These are never classified as optional analytics cookies and remain active while signed in.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1E40AF]">
                    Always Active
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Optional UI Layout Preferences</p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Remembers your preferred table page density and clinic filter selections across visits.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={optionalUiPreferences}
                    onChange={(e) => setOptionalUiPreferences(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1E40AF] focus:ring-[#0284C7]"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Optional Clinic Performance Analytics</p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Helps measure page load responsiveness internally without recording any patient PII or clinical data.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={optionalAnalytics}
                    onChange={(e) => setOptionalAnalytics(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1E40AF] focus:ring-[#0284C7]"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'cookie-policy' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Divya Drusti Opticals Cookie Policy
              </h3>
              <p>
                We distinguish strictly between essential security cookies required for clinic operations and optional preference cookies.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>
                  <strong className="text-slate-900">ddo_session (Essential):</strong> HttpOnly, Secure, SameSite cookie holding your signed clinical session identifier. Invalidated immediately on logout and never accessible to browser scripts.
                </li>
                <li>
                  <strong className="text-slate-900">ddo_cookie_consent_v1 (Preference):</strong> Stores your explicit consent choice for optional cookies.
                </li>
                <li>
                  <strong className="text-slate-900">Native Android Storage:</strong> On Android Capacitor devices, session tokens use native encrypted storage rather than browser cookies or <code className="font-mono">localStorage</code>.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 leading-relaxed">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Patient Medical Privacy & Data Protection Notice
              </h3>
              <p>
                Divya Drusti Opticals collects patient demographics and optometric clinical history strictly for free patient registration (₹0), eye examinations, prescription fulfillment, and statutory GST billing.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                <li>
                  <strong className="text-slate-900">Role-Based Confidentiality:</strong> Refraction metrics, intraocular pressure (IOP), medical history, and clinical observations are accessible solely to authorized Optometrists/Doctors and the Clinic Admin. Front-desk receptionists cannot inspect confidential medical histories.
                </li>
                <li>
                  <strong className="text-slate-900">Audit Trail:</strong> Every registration, eye checkup edit, invoice, and staff access event is logged with timestamp and user identity.
                </li>
                <li>
                  <strong className="text-slate-900">Free Registration Guarantee:</strong> Patient registration is permanently ₹0.00. No payment information is ever required to register a patient.
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => commit(false, false)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Reject Optional Cookies
          </button>
          <button
            type="button"
            onClick={() => commit(optionalAnalytics, optionalUiPreferences)}
            className="rounded-lg border border-[#1E40AF] bg-white px-4 py-2 text-sm font-medium text-[#1E40AF] hover:bg-[#EFF6FF]"
          >
            Save Preferences
          </button>
          <button
            type="button"
            onClick={() => commit(true, true)}
            className="rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-medium text-white hover:bg-[#173bab]"
          >
            Accept Optional Cookies
          </button>
        </div>
      </div>
    </div>
  );
}

export function CookieBanner({
  onOpenSettings,
  onConsentSaved,
}: {
  onOpenSettings: () => void;
  onConsentSaved: (prefs: CookiePreferences) => void;
}) {
  const handleAccept = () => {
    const prefs: CookiePreferences = {
      essential: true,
      optionalAnalytics: true,
      optionalUiPreferences: true,
      decidedAt: new Date().toISOString(),
    };
    saveCookiePreferences(prefs);
    onConsentSaved(prefs);
  };

  const handleReject = () => {
    const prefs: CookiePreferences = {
      essential: true,
      optionalAnalytics: false,
      optionalUiPreferences: false,
      decidedAt: new Date().toISOString(),
    };
    saveCookiePreferences(prefs);
    onConsentSaved(prefs);
  };

  return (
    <div className="no-print fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-[#EFF6FF] p-2 text-[#1E40AF]">
          <Cookie className="h-4 w-4" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-900">Essential Security & Optional Cookie Consent</p>
          <p className="mt-0.5">
            We use strictly necessary <code className="font-mono text-slate-800">HttpOnly</code> cookies for clinic authentication and CSRF protection. You may accept or reject optional preference cookies at any time.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 shrink-0 sm:mt-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Manage & Policy
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Reject Optional
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#173bab]"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Accept Optional
        </button>
      </div>
    </div>
  );
}
