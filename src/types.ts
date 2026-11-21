export type UserRole = 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  doctor_id?: number | null;
}

export interface ClinicSettings {
  clinic_name: string;
  clinic_tagline: string;
  clinic_address: string;
  clinic_phone: string;
  clinic_email: string;
  clinic_gstin: string;
  default_gst_percent: string;
  registration_fee: string;
}

export interface DashboardStats {
  totalPatients: number;
  todaysNewPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  todaysAppointments: number;
  completedCheckups: number;
  pendingCheckups: number;
  totalRevenue: number;
  pendingBills: number;
  lowStockCount: number;
  registrationFee: number;
}

export interface Patient {
  id: number;
  patient_code: string;
  full_name: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  mobile: string;
  alt_phone: string;
  address: string;
  village: string;
  district: string;
  state: string;
  pin_code: string;
  photo_data: string;
  medical_history?: string;
  consent_given?: number;
  registration_fee: number;
  registration_date: string;
  registered_by_id: number;
  registered_by_name: string;
  registered_by_role: UserRole;
  status: 'Registered' | 'Pending Exam' | 'Exam Completed' | 'In Lab' | 'Dispatched';
  created_at: string;
}

export interface Doctor {
  doctor_id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  is_active: number;
  is_approved: number;
  registration_no: string;
  specialization: string;
  qualification: string;
  consultation_fee: number;
  availability: string;
}

export interface Appointment {
  id: number;
  appointment_code: string;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: 'Scheduled' | 'In Consultation' | 'Completed' | 'Cancelled' | 'Rescheduled';
  reason: string;
  notes: string;
  patient_code: string;
  patient_name: string;
  patient_mobile: string;
  patient_age: number;
  patient_gender: string;
  doctor_name: string;
  specialization: string;
  created_by_name: string;
}

export interface EyeCheckup {
  id: number;
  checkup_code: string;
  patient_id: number;
  doctor_id: number;
  appointment_id: number | null;
  exam_date: string;
  od_sph: string;
  od_cyl: string;
  od_axis: string;
  od_add: string;
  od_prism: string;
  os_sph: string;
  os_cyl: string;
  os_axis: string;
  os_add: string;
  os_prism: string;
  visual_acuity_od: string;
  visual_acuity_os: string;
  distance_vision: string;
  near_vision: string;
  pd_mm: string;
  iop_od: string;
  iop_os: string;
  remarks: string;
  observations: string;
  status: string;
  patient_code?: string;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_mobile?: string;
  doctor_name: string;
  qualification?: string;
  doctor_reg_no?: string;
  prescription_id?: number;
  prescription_code?: string;
  lens_type?: string;
  frame_recommendation?: string;
  coating?: string;
  medicines_json?: string;
  follow_up_date?: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category:
    | 'Eyeglasses'
    | 'Spectacle Frames'
    | 'Spectacle Lenses'
    | 'Sunglasses'
    | 'Contact Lenses'
    | 'Optical Accessories'
    | 'Eye Medicines';
  brand: string;
  model_no: string;
  description: string;
  unit_price: number;
  gst_percent: number;
  is_medicine: number;
  expiry_date: string;
  batch_no: string;
  quantity_in_stock: number;
  reorder_level: number;
  location: string;
}

export interface BillItem {
  product_id?: number | null;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Bill {
  id: number;
  invoice_no: string;
  patient_id: number;
  checkup_id: number | null;
  exam_charge: number;
  frame_charge: number;
  lens_charge: number;
  medicine_charge: number;
  accessory_charge: number;
  subtotal: number;
  discount_amount: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
  payment_method: 'Cash' | 'UPI' | 'Card' | 'NetBanking' | 'Pending';
  payment_status: 'Paid' | 'Pending' | 'Partial';
  items_json: string;
  notes: string;
  patient_code: string;
  patient_name: string;
  patient_mobile: string;
  patient_address: string;
  created_by_name: string;
  created_at: string;
}

export interface StaffMember {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  is_active: number;
  is_approved: number;
  role: UserRole;
  doctor_id: number | null;
  registration_no: string | null;
  specialization: string | null;
  qualification: string | null;
  consultation_fee: number | null;
  availability: string | null;
  patients_registered: number;
  checkups_performed: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}
