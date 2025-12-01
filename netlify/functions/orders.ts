import { Handler } from "@netlify/functions";
// 🛑 CORRECCIÓN: Usar importación por defecto
import connectToDatabase from "./utils/db";
import { PurchaseOrderModel } from "./models";
import mongoose from "mongoose";

const handler: Handler = async (event, context) => {
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
      const orders = await (PurchaseOrderModel.find as any)().sort({
        orderDate: -1,
      });
      return { statusCode: 200, headers, body: JSON.stringify(orders) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const orderToSave: any = { ...data }; // 🚨 NUEVA LÍNEA DE DEBUG: Muestra la carga útil antes de guardar

      console.log(
        "Order payload before save:",
        JSON.stringify(orderToSave, null, 2)
      );

      if (!orderToSave.id) {
        orderToSave.id = new mongoose.Types.ObjectId().toHexString();
      }

      orderToSave._id = orderToSave.id;
      delete orderToSave.id;

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

export { handler };
