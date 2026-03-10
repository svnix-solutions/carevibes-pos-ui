export interface ERPNextItem {
  name: string;
  item_name: string;
  item_group: string;
  description?: string;
  image?: string;
  stock_uom: string;
  standard_rate?: number;
}

export interface ERPNextItemGroup {
  name: string;
  parent_item_group?: string;
  is_group?: 0 | 1;
}

export interface ERPNextPatient {
  name: string;
  patient_name: string;
  mobile?: string;
  email?: string;
  customer?: string;
}

export interface ERPNextSupplier {
  name: string;
  supplier_name: string;
  custom_supplier_type__care_?: string;
}

export interface ERPNextSalesOrder {
  name: string;
  customer: string;
  company: string;
  transaction_date: string;
  delivery_date: string;
  grand_total: number;
  status: string;
  items: ERPNextSOItem[];
}

export interface ERPNextSOItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse?: string;
}

export interface ERPNextSalesInvoice {
  name: string;
  customer: string;
  company: string;
  posting_date: string;
  grand_total: number;
  status: string;
  is_pos?: 0 | 1;
  items: ERPNextSIItem[];
  payments?: ERPNextPayment[];
}

export interface ERPNextSIItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  sales_order?: string;
  warehouse?: string;
}

export interface ERPNextPayment {
  mode_of_payment: string;
  amount: number;
}

export interface ERPNextPOSProfile {
  name: string;
  company: string;
  warehouse: string;
  currency: string;
  payments: Array<{
    mode_of_payment: string;
    default: 0 | 1;
  }>;
}

// --- Appointments ---

export type AppointmentStatus =
  | "Scheduled"
  | "Open"
  | "Confirmed"
  | "Checked In"
  | "Checked Out"
  | "Closed"
  | "Cancelled"
  | "No Show";

export interface ERPNextAppointment {
  name: string;
  patient: string;
  patient_name: string;
  practitioner: string;
  practitioner_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  appointment_for: "Practitioner" | "Department" | "Service Unit";
  company: string;
  status: AppointmentStatus;
  department?: string;
  duration?: number;
  invoiced?: 0 | 1;
  ref_sales_invoice?: string;
  notes?: string;
}

export interface ERPNextPractitioner {
  name: string;
  practitioner_name: string;
  supplier?: string;
  department?: string;
}

export interface ERPNextAppointmentType {
  name: string;
}

export interface ERPNextListResponse<T> {
  data: T[];
}

export interface ERPNextDocResponse<T> {
  data: T;
}
