// netlify/functions/inventory.ts
import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data";
import { InventoryItemModel } from "./models";
import mongoose from "mongoose";

// Definimos el tipo de dato que esperamos en el PUT (Bulk Update)
interface BulkUpdateItem {
  name: string;
  stock: number;
  mode: "set" | "add";
}

// 🛑 CORRECCIÓN: Implementación completa de Inventory CRUD + Bulk Update (PUT)
export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Aseguramos la conexión a la base de datos
    await connectToDatabase();
    console.log("Database connection established for inventory function.");
  } catch (dbError) {
    console.error("Database Connection Error (inventory):", dbError);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
      body: JSON.stringify({
        error: (dbError as any).message || "Failed to connect to database.",
      }),
    };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const collection = InventoryItemModel; // 🛑 Usamos el modelo correcto de Inventario

    if (event.httpMethod === "GET") {
      const items = await (collection.find as any)().sort({ name: 1 }); // Ordenamos por nombre
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(items),
      };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const itemToSave: any = { ...data };

      if (!itemToSave.id) {
        itemToSave.id = crypto.randomUUID();
      }

      if (!itemToSave.stockByLocation) {
        itemToSave.stockByLocation = { Almacén: 0 };
      }

      itemToSave._id = itemToSave.id;
      delete itemToSave.id;

      const updatedOrNewItem = await (collection.findOneAndUpdate as any)(
        { _id: itemToSave._id },
        itemToSave,
        { new: true, upsert: true, runValidators: true }
      );

      console.log(
        `Inventory item processed successfully: ${updatedOrNewItem._id}`
      );
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(updatedOrNewItem),
      };
    }

    // 🛑 IMPLEMENTACIÓN NUEVA: Manejo de PUT para Bulk Update
    if (event.httpMethod === "PUT") {
      const updates: BulkUpdateItem[] = JSON.parse(event.body || "[]");

      const promises = updates.map(async (update) => {
        const { name, stock, mode } = update;

        // 1. Encontrar el artículo por nombre
        const existingItem = await (collection.findOne as any)({ name });

        if (!existingItem) {
          console.warn(`Item not found for bulk update: ${name}`);
          return;
        }

        let newStockValue = stock;
        const currentStockInAlmacen =
          existingItem.stockByLocation.get("Almacén") || 0;

        // 2. Calcular el nuevo stock para la ubicación "Almacén"
        if (mode === "add") {
          newStockValue = currentStockInAlmacen + stock;
        }

        // 3. Crear el objeto de actualización para "stockByLocation.Almacén"
        const updateOperation = {
          [`stockByLocation.Almacén`]: newStockValue,
        };

        // Ejecutar la actualización
        await (collection.updateOne as any)(
          { _id: existingItem._id },
          { $set: updateOperation }
        );
      });

      // Esperar a que todas las actualizaciones se completen
      await Promise.all(promises);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: `Bulk update processed for ${updates.length} items.`,
        }),
      };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};
      await (collection.findByIdAndDelete as any)(id);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
      };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error: any) {
    console.error("Error executing inventory function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
