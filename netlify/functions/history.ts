// netlify/functions/history.ts
import { Handler } from "@netlify/functions";
import { connectToDatabase } from "./utils/db";
import { InventoryRecordModel } from "./models";

const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectToDatabase();
    console.log("Database connection established for history function.");
  } catch (dbError) {
    console.error("Database Connection Error (history):", dbError);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      },
      body: JSON.stringify({ error: "Failed to connect to database." }),
    };
  }

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
      const records = await (InventoryRecordModel.find as any)().sort({
        date: -1,
      });
      return { statusCode: 200, headers, body: JSON.stringify(records) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const recordToSave: any = { ...data };

      recordToSave.date = new Date();

      if (recordToSave.id) {
        recordToSave._id = recordToSave.id;
        delete recordToSave.id;
      }
      const newRecord = await (InventoryRecordModel.create as any)(
        recordToSave
      );
      return { statusCode: 201, headers, body: JSON.stringify(newRecord) };
    }

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
        // Borrar TODOS los registros (Reseteo)
        const result = await (InventoryRecordModel.deleteMany as any)({});
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "All history records deleted" }),
        };
      }
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error: any) {
    console.error("Error executing history function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
