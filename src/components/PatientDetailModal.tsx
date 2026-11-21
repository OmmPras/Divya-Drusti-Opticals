import { Calendar, Eye, FileText, Lock, Printer, Receipt, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest, formatCurrency } from '../lib/api';
import type { Appointment, Bill, ClinicSettings, EyeCheckup, Patient, UserRole } from '../types';

interface Props {
  patientId: number | null;
  userRole: UserRole;
  clinicSettings: ClinicSettings | null;
  onClose: () => void;
  onBookAppointment: (patient: Patient) => void;
  onStartExam: (patient: Patient) => void;
  onCreateBill: (patient: Patient) => void;
}

export function PatientDetailModal({
  patientId,
  userRole,
  clinicSettings,
  onClose,
  onBookAppointment,
  onStartExam,
  onCreateBill,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [checkups, setCheckups] = useState<EyeCheckup[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [clinicalAccessGranted, setClinicalAccessGranted] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    apiRequest<{
      patient: Patient;
      appointments: Appointment[];
      eyeCheckups: EyeCheckup[];
      bills: Bill[];
      clinicalAccessGranted: boolean;
    }>(`/api/patients/${patientId}`)
      .then((res) => {
        setPatient(res.patient);
        setAppointments(res.appointments);
        setCheckups(res.eyeCheckups);
        setBills(res.bills);
        setClinicalAccessGranted(res.clinicalAccessGranted);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load patient details.'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden print-sheet">
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Patient Record {patient ? `· ${patient.patient_code}` : ''}
            </h2>
            <p className="text-xs text-slate-500">
              Free Registration (₹0.00) · Registered by {patient?.registered_by_name || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Slip
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close patient details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading patient record...</div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : patient ? (
            <>
              {/* Header summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-5">
                <div className="flex items-center gap-4">
                  {patient.photo_data ? (
                    <img
                      src={patient.photo_data}
                      alt={patient.full_name}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#1E40AF] text-white font-display text-xl font-bold">
                      {patient.full_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl font-bold text-slate-900">{patient.full_name}</h3>
                      <span className="rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-semibold text-[#047857]">
                        Free Reg · ₹0
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 tabular-nums">
                      <span className="font-mono font-semibold text-[#1E40AF]">{patient.patient_code}</span> · {patient.age} yrs · {patient.gender} · DOB: {patient.dob}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Mobile: <span className="font-mono text-slate-800">{patient.mobile}</span>
                      {patient.alt_phone ? ` · Alt: ${patient.alt_phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="no-print flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onBookAppointment(patient)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#0284C7]" />
                    Book Appointment
                  </button>
                  {(userRole === 'DOCTOR' || userRole === 'ADMIN') && (
                    <button
                      type="button"
                      onClick={() => onStartExam(patient)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#173bab]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Perform Eye Exam
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onCreateBill(patient)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3 py-2 text-xs font-semibold text-white hover:bg-[#047857]"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    New Bill
                  </button>
                </div>
              </div>

              {/* Address & Registration Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-slate-200 p-4 text-sm">
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-slate-500">Residential Address</p>
                  <p className="mt-1 text-slate-800">
                    {[patient.address, patient.village, patient.district, patient.state, patient.pin_code]
                      .filter(Boolean)
                      .join(', ') || 'No address provided'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Clinic Info</p>
                  <p className="mt-1 text-xs text-slate-700">
                    {clinicSettings?.clinic_name || 'Divya Drusti Opticals'} · Reg Date: {patient.registration_date}
                  </p>
                </div>
              </div>

              {/* Confidential Medical & Refraction Records */}
              {clinicalAccessGranted ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                      <FileText className="h-4 w-4 text-[#1E40AF]" />
                      Medical & Ocular History
                    </h4>
                    <p className="mt-2 text-sm text-slate-700">
                      {patient.medical_history || 'No chronic ocular or systemic conditions recorded.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <h4 className="font-display text-sm font-bold text-slate-900 mb-3">
                      Eye Examination History ({checkups.length})
                    </h4>
                    {checkups.length === 0 ? (
                      <p className="text-xs text-slate-500">No eye examinations recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {checkups.map((chk) => (
                          <div key={chk.id} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 mb-2">
                              <span className="font-mono font-semibold text-[#1E40AF]">{chk.checkup_code}</span>
                              <span>
                                Exam Date: {chk.exam_date} · Doctor: {chk.doctor_name} · PD: {chk.pd_mm} mm
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="py-1.5 text-left">Eye</th>
                                    <th className="py-1.5 text-center">SPH</th>
                                    <th className="py-1.5 text-center">CYL</th>
                                    <th className="py-1.5 text-center">AXIS</th>
                                    <th className="py-1.5 text-center">ADD</th>
                                    <th className="py-1.5 text-center">VA</th>
                                  </tr>
                                </thead>
                                <tbody className="font-mono tabular-nums text-slate-900">
                                  <tr className="border-b border-slate-100">
                                    <td className="py-1.5 font-sans font-semibold text-[#1E40AF]">OD (Right)</td>
                                    <td className="py-1.5 text-center">{chk.od_sph}</td>
                                    <td className="py-1.5 text-center">{chk.od_cyl}</td>
                                    <td className="py-1.5 text-center">{chk.od_axis}°</td>
                                    <td className="py-1.5 text-center">{chk.od_add}</td>
                                    <td className="py-1.5 text-center">{chk.visual_acuity_od}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1.5 font-sans font-semibold text-[#059669]">OS (Left)</td>
                                    <td className="py-1.5 text-center">{chk.os_sph}</td>
                                    <td className="py-1.5 text-center">{chk.os_cyl}</td>
                                    <td className="py-1.5 text-center">{chk.os_axis}°</td>
                                    <td className="py-1.5 text-center">{chk.os_add}</td>
                                    <td className="py-1.5 text-center">{chk.visual_acuity_os}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            {chk.observations && (
                              <p className="mt-2 text-xs text-slate-700">
                                <strong>Observations:</strong> {chk.observations}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3 text-xs text-slate-600">
                  <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>
                    Confidential clinical history, OD/OS refraction values, and doctor prescriptions are restricted to authorized Doctors and Clinic Admin.
                  </span>
                </div>
              )}

              {/* Appointments & Billing Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="font-display text-sm font-bold text-slate-900 mb-2">
                    Appointments ({appointments.length})
                  </h4>
                  {appointments.length === 0 ? (
                    <p className="text-xs text-slate-500">No appointments scheduled.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {appointments.map((apt) => (
                        <li key={apt.id} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <div>
                            <p className="font-semibold text-slate-800">{apt.appointment_date} · {apt.appointment_time}</p>
                            <p className="text-slate-500">{apt.doctor_name}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                            {apt.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="font-display text-sm font-bold text-slate-900 mb-2">
                    Invoices & Optical Billing ({bills.length})
                  </h4>
                  {bills.length === 0 ? (
                    <p className="text-xs text-slate-500">No paid services billed yet. Registration fee is ₹0.00.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {bills.map((b) => (
                        <li key={b.id} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <div>
                            <p className="font-mono font-semibold text-slate-800">{b.invoice_no}</p>
                            <p className="text-slate-500">{b.payment_method} · {b.created_at.slice(0, 10)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-slate-900 tabular-nums">{formatCurrency(b.total_amount)}</p>
                            <p className={b.payment_status === 'Paid' ? 'text-[#059669] font-semibold' : 'text-amber-600 font-semibold'}>
                              {b.payment_status}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
