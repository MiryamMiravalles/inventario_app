import mongoose, { Schema } from 'mongoose';

const SessionSchema = new Schema({
  date: String,
  description: String,
  income: { type: Map, of: Number },
  expenses: [{ description: String, amount: Number }],
  paymentBreakdown: { type: Map, of: { cash: Number, card: Number } },
  workedHours: [{ employeeId: String, hours: Number }]
}, { timestamps: true });

// Transform _id to id
SessionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) { delete ret._id; }
});

const IncomeSourceSchema = new Schema({
    id: String, // Keep original ID for reference if needed, or rely on _id
    label: String
});
IncomeSourceSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });


const InventoryItemSchema = new Schema({
  name: String,
  category: String,
  stockByLocation: { type: Map, of: Number },
  unit: String
}, { timestamps: true });

InventoryItemSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) { delete ret._id; }
});

const PurchaseOrderSchema = new Schema({
  orderDate: String,
  deliveryDate: String,
  supplierName: String,
  status: String,
  totalAmount: Number,
  items: [{
    inventoryItemId: String,
    quantity: Number,
    costAtTimeOfPurchase: Number
  }]
}, { timestamps: true });

PurchaseOrderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) { delete ret._id; }
});

const InventoryRecordSchema = new Schema({
  date: String,
  items: [{
    itemId: String,
    name: String,
    unit: String,
    currentStock: Number,
    pendingStock: Number,
    initialStock: Number,
    endStock: Number,
    consumption: Number
  }]
}, { timestamps: true });

InventoryRecordSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) { delete ret._id; }
});

export const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);
export const InventoryItemModel = mongoose.models.InventoryItem || mongoose.model('InventoryItem', InventoryItemSchema);
export const PurchaseOrderModel = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
export const InventoryRecordModel = mongoose.models.InventoryRecord || mongoose.model('InventoryRecord', InventoryRecordSchema);
export const IncomeSourceModel = mongoose.models.IncomeSource || mongoose.model('IncomeSource', IncomeSourceSchema);