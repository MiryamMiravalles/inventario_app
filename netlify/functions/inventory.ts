import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/db";
import { InventoryItemModel } from "./models";
import mongoose from "mongoose";
import { INVENTORY_LOCATIONS } from "../../constants";

export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectToDatabase();

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    if (event.httpMethod === "GET") {
      const items = await (InventoryItemModel.find as any)().sort({
        category: 1,
        name: 1,
      });
      return { statusCode: 200, headers, body: JSON.stringify(items) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const itemToSave: any = { ...data }; // Mapear 'id' del frontend a '_id' de Mongoose y asegurar un ID
      if (!itemToSave.id) {
        itemToSave.id = new mongoose.Types.ObjectId().toHexString();
      }

      itemToSave._id = itemToSave.id;
      delete itemToSave.id; // Usar findOneAndUpdate con upsert: true para manejar la creación/actualización por ID de cliente

      const updatedOrNewItem = await (
        InventoryItemModel.findOneAndUpdate as any
      )({ _id: itemToSave._id }, itemToSave, {
        new: true,
        upsert: true,
        runValidators: true,
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(updatedOrNewItem),
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
          // La lógica de frontend (App.tsx) realiza las operaciones sobre 'Almacén'
          const fieldToUpdate = `stockByLocation.Almacén`;
          let updateOperation = {};
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
        await (InventoryItemModel.bulkWrite as any)(bulkOps);
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
      await (InventoryItemModel.findByIdAndDelete as any)(id);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
      };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error: any) {
    console.error("Inventory function error:", error); // Incluimos el mensaje de error para facilitar la depuración en el frontend
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
