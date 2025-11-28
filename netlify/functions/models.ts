import mongoose, { Schema } from "mongoose";

const SessionSchema = new Schema(
  {
    date: String,
    description: String,
    income: { type: Map, of: Number },
    expenses: [{ description: String, amount: Number }],
    paymentBreakdown: { type: Map, of: { cash: Number, card: Number } },
    workedHours: [{ employeeId: String, hours: Number }],
  },
  { timestamps: true }
);

// Transform _id to id
SessionSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  // CORRECCIÓN: Tipar ret como 'any' para permitir la adición de 'id'
  transform: function (doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

const IncomeSourceSchema = new Schema({
  id: String, // Keep original ID for reference if needed, or rely on _id
  label: String,
});
IncomeSourceSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  // CORRECCIÓN: Tipar ret como 'any'
  transform: (doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

const InventoryItemSchema = new Schema(
  {
    // CORRECCIÓN: Permite IDs generados por el cliente (UUIDs)
    _id: { type: String, required: true },
    name: String,
    category: String,
    stockByLocation: { type: Map, of: Number },
  },
  { _id: false, timestamps: true }
);

InventoryItemSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  // CORRECCIÓN: Tipar ret como 'any'
  transform: function (doc, ret: any) {
    ret.id = ret._id; // _id ya es string aquí
    delete ret._id;
  },
});

const PurchaseOrderSchema = new Schema(
  {
    // CORRECCIÓN: Permite IDs generados por el cliente (UUIDs)
    _id: { type: String, required: true },
    orderDate: String,
    deliveryDate: String,
    supplierName: String,
    status: String,
    totalAmount: Number,
    items: [
      {
        inventoryItemId: String,
        quantity: Number,
        costAtTimeOfPurchase: Number,
      },
    ],
  },
  { _id: false, timestamps: true }
);

PurchaseOrderSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  // CORRECCIÓN: Tipar ret como 'any'
  transform: function (doc, ret: any) {
    ret.id = ret._id; // _id ya es string aquí
    delete ret._id;
  },
});

// Definición del sub-esquema para los ítems del registro de inventario
const InventoryRecordItemSchema = new Schema(
  {
    itemId: String,
    name: String,

    currentStock: Number,
    pendingStock: Number,
    initialStock: Number,
    endStock: Number,
    consumption: Number,
    stockByLocationSnapshot: { type: Map, of: Number }, // Campo para el detalle del Snapshot
  },
  { _id: false }
);

// Esquema completo para InventoryRecord
const InventoryRecordSchema = new Schema(
  {
    // CORRECCIÓN: Permite IDs generados por el cliente (UUIDs)
    _id: { type: String, required: true },
    date: String,
    label: String, // Etiqueta (Ej: "Análisis de consumo (DD/MM/YYYY)")
    type: String, // Tipo de registro ("snapshot" o "analysis")
    items: [InventoryRecordItemSchema],
  },
  { _id: false, timestamps: true }
);

InventoryRecordSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  // CORRECCIÓN: Tipar ret como 'any'
  transform: function (doc, ret: any) {
    ret.id = ret._id; // _id ya es string aquí
    delete ret._id;
  },
});

export const SessionModel =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);
export const InventoryItemModel =
  mongoose.models.InventoryItem ||
  mongoose.model("InventoryItem", InventoryItemSchema);
export const PurchaseOrderModel =
  mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", PurchaseOrderSchema);
export const InventoryRecordModel =
  mongoose.models.InventoryRecord ||
  mongoose.model("InventoryRecord", InventoryRecordSchema);
export const IncomeSourceModel =
  mongoose.models.IncomeSource ||
  mongoose.model("IncomeSource", IncomeSourceSchema);
