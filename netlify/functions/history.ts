// netlify/functions/history.ts
import { Handler } from "@netlify/functions";
import { connectToDatabase } from "./utils/db";
import { InventoryRecordModel } from "./models";

// ÚNICA DECLARACIÓN Y EXPORTACIÓN DEL HANDLER
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
      const records = await InventoryRecordModel.find().sort({ date: -1 });
      return { statusCode: 200, headers, body: JSON.stringify(records) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const recordToSave: any = { ...data };
      if (recordToSave.id) {
        recordToSave._id = recordToSave.id;
        delete recordToSave.id;
      }
      // Se usa 'as any' para mitigar errores de tipado de Mongoose (TS2349)
      const newRecord = await (InventoryRecordModel.create as any)(
        recordToSave
      );
      return { statusCode: 201, headers, body: JSON.stringify(newRecord) };
    }

    // Lógica para Borrado Total
    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};

      if (id) {
        // Borrar un solo registro
        await (InventoryRecordModel.findByIdAndDelete as any)(id);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Deleted single record" }),
        };
      } else {
        // Borrar TODOS los registros
        await InventoryRecordModel.deleteMany({});
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "All history records deleted" }),
        };
      }
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
// NOTA: La línea 'export { handler };' ha sido ELIMINADA para resolver el conflicto de exportación.
