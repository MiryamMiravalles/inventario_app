// netlify/functions/orders.ts
import { Handler } from "@netlify/functions";
import { connectToDatabase } from "./utils/db";
import { PurchaseOrderModel } from "./models";
import mongoose from "mongoose";

const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // 1. Conexión a la base de datos (con manejo de errores de conexión)
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
      // CORRECCIÓN TS2349: Tipado explícito a 'any'
      const orders = await (PurchaseOrderModel.find as any)().sort({
        orderDate: -1,
      });
      return { statusCode: 200, headers, body: JSON.stringify(orders) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      console.log("Processing POST request for order:", data.id || "new");

      const orderToSave: any = { ...data };

      // 1. Mapear 'id' del frontend a '_id' de Mongoose.
      if (!orderToSave.id) {
        orderToSave.id = new mongoose.Types.ObjectId().toHexString(); // Fallback ID if missing
      }

      orderToSave._id = orderToSave.id;
      delete orderToSave.id;

      // 2. Usar findOneAndUpdate con upsert: true para manejar la creación/actualización.
      // CORRECCIÓN TS2349: Tipado explícito a 'any'
      const updatedOrNewOrder = await (
        PurchaseOrderModel.findOneAndUpdate as any
      )({ _id: orderToSave._id }, orderToSave, {
        new: true,
        upsert: true,
        runValidators: true,
      });

      console.log(`Order processed successfully: ${updatedOrNewOrder._id}`);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(updatedOrNewOrder),
      };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};
      // CORRECCIÓN TS2349: Tipado explícito a 'any'
      await (PurchaseOrderModel.findByIdAndDelete as any)(id);
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

// Se utiliza la exportación explícita para evitar problemas de inicialización en Netlify CLI
export { handler };
