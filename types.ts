export type View = "cashflow" | "inventory";

export enum EmployeeType {
  Hourly = "Hourly",
  Salaried = "Salaried",
}

export interface Employee {
  id: string;
  name: string;
  type: EmployeeType;
  hourlyRate?: number;
  salary?: number;
  otherCosts?: number;
}

export interface WorkedHour {
  employeeId: string;
  hours: number;
}

export type Income = Record<string, number>;

export interface Expense {
  description: string;
  amount: number;
}

export interface PaymentMethodSplit {
  cash: number;
  card: number;
}

export type PaymentBreakdown = Record<string, PaymentMethodSplit>;

export interface CashFlowSession {
  id: string;
  date: string;
  description: string;
  income: Income;
  expenses: Expense[];
  paymentBreakdown: PaymentBreakdown;
  workedHours: WorkedHour[];
}

export interface IncomeSource {
  id: string;
  label: string;
}

export interface SupplierExpense {
  id: string;
  supplierName: string;
  description: string;
  amount: number;
  date: string;
}

export enum StructuralCostType {
  Fixed = "Fixed",
  Variable = "Variable",
}

export interface StructuralCost {
  id: string;
  name: string;
  amount: number;
  type: StructuralCostType;
  category: string;
  date: string;
}

export enum PurchaseOrderStatus {
  Pending = "Pending",
  Completed = "Completed",
  Cancelled = "Cancelled",
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stockByLocation: { [key: string]: number };
  unit: string; // e.g., 'kg', 'liters', 'units'
}

export interface OrderItem {
  inventoryItemId: string;
  quantity: number;
  costAtTimeOfPurchase: number;
}

export interface PurchaseOrder {
  id: string;
  orderDate: string;
  deliveryDate?: string;
  supplierName: string;
  items: OrderItem[];
  status: PurchaseOrderStatus;
  totalAmount: number;
}

export interface InventoryRecordItem {
  itemId: string;
  name: string;
  unit: string;
  currentStock: number;
  pendingStock: number;
  initialStock: number;
  endStock: number;
  consumption: number;
}

export interface InventoryRecord {
  id: string;
  date: string;
  label: string; // <<-- CORRECCIÓN AÑADIDA
  items: InventoryRecordItem[];
}
