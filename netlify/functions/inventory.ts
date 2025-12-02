import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data"; // Ahora devuelve el objeto DB de MongoClient
import { Collection, Document } from "mongodb";
import mongoose from "mongoose"; // Necesario para generar IDs

// 🛑 Interfaz: Define el documento de Inventario con _id como string para compatibilidad UUID
interface InventoryItemDocument extends Document {
  _id: string;
  name: string;
  category: string;
  stockByLocation: { [key: string]: number };
}

// Interfaz para documentos de Historial
interface InventoryRecordDocument extends Document {
  _id: string;
  date: string;
  label: string;
  type: string;
  // ... otros campos
}

const INVENTORY_COLLECTION_NAME = "inventoryitems";
const HISTORY_COLLECTION_NAME = "inventoryrecords";

export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let db;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    db = await connectToDatabase();
  } catch (e) {
    console.error("Database Connection Error (inventory):", e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: (e as any).message || "Failed to connect to database.",
      }),
    };
  }

  try {
    const inventoryCollection: Collection<InventoryItemDocument> =
      db.collection(INVENTORY_COLLECTION_NAME);

    // Función auxiliar para mapear el ID de MongoDB al formato de frontend
    const formatItem = (item: InventoryItemDocument | null) => {
      if (!item) return null;
      const _idString = item._id.toString();
      const { _id, ...rest } = item;
      return { id: _idString, ...rest };
    };

    if (event.httpMethod === "GET") {
      // 🛑 CAMBIO: Usar find() nativo con toArray()
      const items = await inventoryCollection
        .find()
        .sort({ category: 1, name: 1 })
        .toArray();
      const formattedItems = items.map(formatItem);

      return { statusCode: 200, headers, body: JSON.stringify(formattedItems) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const itemToSave: any = { ...data };

      // Mantenemos la lógica de generar/usar el ID de string para compatibilidad con el frontend
      let filterId = itemToSave.id || null;
      if (!filterId) {
        filterId = new mongoose.Types.ObjectId().toHexString();
      }

      itemToSave._id = filterId;
      delete itemToSave.id;

      // 🛑 CAMBIO: Usar updateOne nativo para el upsert
      await inventoryCollection.updateOne(
        { _id: filterId },
        { $set: itemToSave },
        { upsert: true }
      );

      // Leer el documento guardado para devolverlo al frontend
      const updatedItem = await inventoryCollection.findOne({ _id: filterId });
      const formattedItem = formatItem(updatedItem);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(formattedItem),
      };
    }

    if (event.httpMethod === "PUT") {
      // Manejar actualizaciones masivas de stock (ej. reseteo a 0 o sincronización)
      const updates: { name: string; stock: number; mode: "set" | "add" }[] =
        JSON.parse(event.body || "[]");

      if (!Array.isArray(updates) || updates.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "Invalid or empty array of updates provided.",
          }),
        };
      }

      const bulkOps = updates
        .map((update) => {
          const fieldToUpdate = `stockByLocation.Almacén`;
          let updateOperation = {};

          // 🛑 CAMBIO: Usar $set o $inc nativo
          if (update.mode === "set") {
            updateOperation = { $set: { [fieldToUpdate]: update.stock } };
          } else if (update.mode === "add") {
            updateOperation = { $inc: { [fieldToUpdate]: update.stock } };
          } else {
            return null;
          }

          return {
            updateOne: {
              filter: { name: update.name },
              update: updateOperation,
            },
          };
        })
        .filter((op) => op !== null);

      if (bulkOps.length > 0) {
        // 🛑 CAMBIO: Usar bulkWrite nativo
        await inventoryCollection.bulkWrite(bulkOps as any);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: `Bulk update processed for ${bulkOps.length} items.`,
        }),
      };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};
      // 🛑 CAMBIO: Usar deleteOne nativo
      await inventoryCollection.deleteOne({ _id: id });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
      };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error: any) {
    console.error("Inventory function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
