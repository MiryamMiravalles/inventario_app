import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data";
import { PurchaseOrderModel } from "./models";
import mongoose from "mongoose";

// 🛑 CORRECCIÓN: Exportación directa de la función 'handler' para Netlify CLI
export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectToDatabase();
    console.log("Database connection established for orders function.");
  } catch (dbError) {
    console.error("Database Connection Error (orders):", dbError);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      },
      body: JSON.stringify({
        error: (dbError as any).message || "Failed to connect to database.",
      }),
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
    const collection = PurchaseOrderModel;

    if (event.httpMethod === "GET") {
      const orders = await (collection.find as any)().sort({ orderDate: -1 });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(orders),
      };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const orderToSave: any = { ...data }; // Aseguramos un ID compatible con Mongoose/UUID si no existe.

      if (!orderToSave.id) {
        orderToSave.id = new mongoose.Types.ObjectId().toHexString();
      }

      orderToSave._id = orderToSave.id;
      delete orderToSave.id; // Usamos findOneAndUpdate de Mongoose para aplicar la validación (runValidators: true)

      const updatedOrNewOrder = await (collection.findOneAndUpdate as any)(
        { _id: orderToSave._id },
        orderToSave,
        { new: true, upsert: true, runValidators: true }
      );

      console.log(`Order processed successfully: ${updatedOrNewOrder._id}`);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(updatedOrNewOrder),
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
    console.error("Error executing orders function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
