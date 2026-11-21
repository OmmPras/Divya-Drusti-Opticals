import { Camera, CheckCircle2, Printer, ShieldCheck, UserPlus } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { apiRequest, calculateAgePreview } from '../lib/api';
import type { ClinicSettings, Patient, User } from '../types';

interface Props {
  currentUser: User;
  clinicSettings: ClinicSettings | null;
  onRegistered: (patient: Patient) => void;
}

const HISTORY_TAGS = [
  'Diabetes',
  'Hypertension',
  'Glaucoma History',
  'Cataract Surgery',
  'Drug / Eye Drop Allergy',
  'Contact Lens Wearer',
];

export function FreeRegistrationModule({ currentUser, clinicSettings, onRegistered }: Props) {
  const [nextCode, setNextCode] = useState('DDO-2026-0001');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [mobile, setMobile] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('Odisha');
  const [pinCode, setPinCode] = useState('');
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registeredPatient, setRegisteredPatient] = useState<Patient | null>(null);

  const computedAge = calculateAgePreview(dob);

  const fetchNextCode = () => {
    apiRequest<{ nextCode: string }>('/api/patients/next-code')
      .then((res) => setNextCode(res.nextCode))
      .catch(() => {});
  };

  useEffect(() => {
    fetchNextCode();
  }, []);

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPEG, PNG, or WEBP photograph.');
      return;
    }
    if (file.size > 450 * 1024) {
      setError('Photograph must be under 450 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoData(reader.result);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleHistoryTag = (tag: string) => {
    setSelectedHistory((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const combinedHistory = [
      selectedHistory.length > 0 ? `Conditions: ${selectedHistory.join(', ')}` : '',
      medicalNotes.trim(),
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const res = await apiRequest<{ patient: Patient; message: string }>('/api/patients', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          dob,
          gender,
          mobile,
          alt_phone: altPhone,
          address,
          village,
          district,
          state: stateName,
          pin_code: pinCode,
          registration_date: registrationDate,
          medical_history: combinedHistory,
          photo_data: photoData,
          consent_given: consentGiven,
        }),
      });
      setRegisteredPatient(res.patient);
      onRegistered(res.patient);
      fetchNextCode();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setRegisteredPatient(null);
    setFullName('');
    setDob('');
    setMobile('');
    setAltPhone('');
    setAddress('');
    setVillage('');
    setDistrict('');
    setPinCode('');
    setSelectedHistory([]);
    setMedicalNotes('');
    setPhotoData('');
    setConsentGiven(false);
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Emerald Privilege Banner — Always ₹0 */}
      <div className="no-print rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="rounded-lg bg-[#059669] p-2.5 text-white shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold text-[#003d28]">
                Complimentary Patient Registration
              </h2>
              <span className="rounded-full bg-white border border-[#A7F3D0] px-3 py-0.5 text-xs font-bold text-[#047857]">
                100% Free · ₹0 Fee
              </span>
            </div>
            <p className="mt-1 text-sm text-[#005137]">
              Patient onboarding at Divya Drusti Opticals is permanently free. Every new patient immediately appears on the Admin Dashboard and Doctor queue.
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-lg bg-white border border-[#A7F3D0] px-4 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#047857]">Next Patient ID</p>
          <p className="font-mono text-base font-bold text-slate-900 tabular-nums">{nextCode}</p>
        </div>
      </div>

      {/* Registration Success & Printable Free Slip */}
      {registeredPatient && (
        <div className="rounded-xl border border-[#A7F3D0] bg-white p-6 space-y-5 print-sheet">
          <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5 text-[#059669]">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Patient Registered Successfully (Fee: ₹0.00)
                </h3>
                <p className="text-xs text-slate-600">
                  Admin Dashboard and Doctor patient records have been updated automatically.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173bab]"
              >
                <Printer className="h-4 w-4" />
                Print Free Registration Slip
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Register Another Patient
              </button>
            </div>
          </div>

          {/* Printable Free Registration Slip */}
          <div className="rounded-lg border border-slate-200 p-6 bg-white">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-[#1E40AF]">
                  {clinicSettings?.clinic_name || 'Divya Drusti Opticals'}
                </h3>
                <p className="text-xs text-slate-600">{clinicSettings?.clinic_address}</p>
                <p className="text-xs text-slate-600">Phone: {clinicSettings?.clinic_phone}</p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#047857]">
                  FREE REGISTRATION SLIP
                </span>
                <p className="mt-2 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {registeredPatient.patient_code}
                </p>
                <p className="text-xs text-slate-500">Date: {registeredPatient.registration_date}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Patient Name</p>
                <p className="font-semibold text-slate-900">{registeredPatient.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Age / Gender</p>
                <p className="font-semibold text-slate-900 tabular-nums">
                  {registeredPatient.age} yrs · {registeredPatient.gender}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mobile Number</p>
                <p className="font-mono font-semibold text-slate-900">{registeredPatient.mobile}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Registration Fee</p>
                <p className="font-mono font-bold text-[#059669]">₹0.00 (FREE)</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-slate-800">
                  {[registeredPatient.address, registeredPatient.village, registeredPatient.district, registeredPatient.state, registeredPatient.pin_code]
                    .filter(Boolean)
                    .join(', ') || 'On file'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Registered By</p>
                <p className="text-slate-800">
                  {registeredPatient.registered_by_name} ({registeredPatient.registered_by_role})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form */}
      {!registeredPatient && (
        <form onSubmit={handleSubmit} className="no-print rounded-xl border border-slate-200 bg-white p-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Auto Meta Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Auto Patient ID</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[#1E40AF] tabular-nums">{nextCode}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500">Registration Date</label>
              <input
                type="date"
                required
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
                className="mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 focus:border-[#0284C7] focus:outline-none"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Registered By</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {currentUser.full_name} ({currentUser.role})
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Registration Fee</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[#059669]">₹0.00 (Always Free)</p>
            </div>
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Subham Mohanty"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Calculated Age</label>
              <div className="h-10 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {computedAge !== null ? `${computedAge} yrs` : '—'}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender <span className="text-red-600">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternative Phone</label>
              <input
                type="tel"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                placeholder="Optional family number"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Photograph</label>
              <label className="h-10 flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                <span className="inline-flex items-center gap-2 truncate">
                  <Camera className="h-4 w-4 text-[#0284C7]" />
                  {photoData ? 'Photo attached (Click to change)' : 'Upload JPEG/PNG (<450KB)'}
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Address Block */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-200">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Street / House Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Plot / Street / Landmark"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Village / Town</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village / Ward"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Khordha"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="751001"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
              />
            </div>
          </div>

          {/* Medical History */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Relevant Medical & Ocular History (Confidential)
            </label>
            <div className="flex flex-wrap gap-2">
              {HISTORY_TAGS.map((tag) => {
                const active = selectedHistory.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleHistoryTag(tag)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <textarea
              rows={2}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Current spectacles usage, chief visual complaints, medications, or allergies..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#BAE6FD]"
            />
          </div>

          {/* Privacy Consent */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                <strong className="inline-flex items-center gap-1 text-slate-900">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" />
                  Patient Consent & Privacy Notice:
                </strong>{' '}
                I confirm that the patient has consented to recording demographic and confidential eye-care history for consultation at Divya Drusti Opticals, and has been informed that patient registration is completely free (₹0).
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#047857] disabled:opacity-60 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Registering Patient...' : 'Complete Free Registration (₹0)'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
