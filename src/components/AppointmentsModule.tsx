import { CalendarPlus, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../lib/api';
import type { Appointment, Doctor, Patient } from '../types';

interface Props {
  preselectedPatient: Patient | null;
  refreshSignal: number;
  onUpdated: () => void;
}

export function AppointmentsModule({ preselectedPatient, refreshSignal, onUpdated }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [patientId, setPatientId] = useState(preselectedPatient ? String(preselectedPatient.id) : '');
  const [doctorId, setDoctorId] = useState('');
  const [aptDate, setAptDate] = useState(new Date().toISOString().slice(0, 10));
  const [aptTime, setAptTime] = useState('10:30');
  const [reason, setReason] = useState('Routine Eye Examination');
  const [notes, setNotes] = useState('');

  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('date', filterDate);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);

      const [aptRes, patRes, docRes] = await Promise.all([
        apiRequest<{ appointments: Appointment[] }>(`/api/appointments?${params.toString()}`),
        apiRequest<{ patients: Patient[] }>('/api/patients?limit=50'),
        apiRequest<{ doctors: Doctor[] }>('/api/admin/doctors'),
      ]);
      setAppointments(aptRes.appointments);
      setPatients(patRes.patients);
      setDoctors(docRes.doctors);
      if (!doctorId && docRes.doctors.length > 0) {
        setDoctorId(String(docRes.doctors[0].doctor_id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [filterDate, filterStatus, refreshSignal]);

  useEffect(() => {
    if (preselectedPatient) {
      setPatientId(String(preselectedPatient.id));
    }
  }, [preselectedPatient]);

  const handleBook = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiRequest('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: Number(patientId),
          doctor_id: Number(doctorId),
          appointment_date: aptDate,
          appointment_time: aptTime,
          reason,
          notes,
        }),
      });
      setNotes('');
      await loadAll();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to book appointment.');
    }
  };

  const handleUpdateStatus = async (id: number, status: Appointment['status']) => {
    try {
      await apiRequest(`/api/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAll();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update appointment.');
    }
  };

  const handleReschedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    try {
      await apiRequest(`/api/appointments/${rescheduleTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Rescheduled',
          appointment_date: newDate,
          appointment_time: newTime,
        }),
      });
      setRescheduleTarget(null);
      await loadAll();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reschedule appointment.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Appointment Scheduling</h1>
        <p className="mt-1 text-sm text-slate-600">
          Assign registered patients to approved Optometrists, manage schedules, and track consultations.
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Booking Form */}
      <form onSubmit={handleBook} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 font-display text-sm font-bold text-slate-900">
          <CalendarPlus className="h-4 w-4 text-[#1E40AF]" />
          Book New Appointment
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            required
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">Select Patient...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.patient_code} — {p.full_name}
              </option>
            ))}
          </select>

          <select
            required
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">Select Doctor...</option>
            {doctors.map((d) => (
              <option key={d.doctor_id} value={d.doctor_id}>
                {d.full_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            required
            value={aptDate}
            onChange={(e) => setAptDate(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />

          <input
            type="time"
            required
            value={aptTime}
            onChange={(e) => setAptTime(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 font-mono text-sm"
          />

          <button
            type="submit"
            className="h-10 rounded-lg bg-[#1E40AF] px-4 text-sm font-semibold text-white hover:bg-[#173bab]"
          >
            Confirm Booking
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (e.g. Routine Eye Checkup, Contact Lens Fit)"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional reception notes"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
        </div>
      </form>

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={handleReschedule} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Reschedule {rescheduleTarget.patient_name}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Time</label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white"
              >
                Save Reschedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Appointments Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'Scheduled', 'In Consultation', 'Rescheduled', 'Completed', 'Cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterStatus === st
                    ? 'bg-[#1E40AF] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-2.5 text-xs"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className="text-xs font-medium text-[#0284C7] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading appointments...</td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No appointments found.</td>
                </tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1E40AF]">{a.appointment_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{a.patient_name}</div>
                      <div className="font-mono text-xs text-slate-500">{a.patient_code} · {a.patient_mobile}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{a.doctor_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 tabular-nums">
                      {a.appointment_date} · {a.appointment_time}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(a.id, 'In Consultation')}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Clock className="h-3 w-3 text-[#0284C7]" />
                            Start
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleTarget(a);
                              setNewDate(a.appointment_date);
                              setNewTime(a.appointment_time);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(a.id, 'Completed')}
                            className="inline-flex items-center gap-1 rounded bg-[#059669] px-2 py-1 text-xs font-medium text-white"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(a.id, 'Cancelled')}
                            className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
