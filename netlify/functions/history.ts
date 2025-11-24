// miryammiravalles/inventario_app/inventario_app-f32ca598e5e73825ca90ae4c3afa331e1cbfdfd2/netlify/functions/history.ts

import { Handler } from "@netlify/functions";
import { connectToDatabase } from "./utils/db";
import { InventoryRecordModel } from "./models";

export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectToDatabase();

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    if (event.httpMethod === "GET") {
      const history = await InventoryRecordModel.find().sort({ date: -1 });
      return { statusCode: 200, headers, body: JSON.stringify(history) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const newRecord = await InventoryRecordModel.create(data);
      return { statusCode: 201, headers, body: JSON.stringify(newRecord) };
    }

    // [MODIFICACIÓN] Manejador para DELETE (Borrado completo)
    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};

      // Si no se proporciona un ID, borrar todos los registros.
      if (!id) {
        await InventoryRecordModel.deleteMany({});
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "All history records deleted" }),
        };
      }

      // Si se proporciona un ID, borrar un registro específico. (Mantenido por si se añade la funcionalidad de borrado individual)
      await InventoryRecordModel.findByIdAndDelete(id);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Record deleted" }),
      };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
