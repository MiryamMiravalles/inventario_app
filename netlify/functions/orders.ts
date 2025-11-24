import { Handler } from "@netlify/functions";
import { connectToDatabase } from "./utils/db";
import { PurchaseOrderModel } from "./models";

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
      const orders = await PurchaseOrderModel.find().sort({ orderDate: -1 });
      return { statusCode: 200, headers, body: JSON.stringify(orders) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");

      // Mapear 'id' a '_id' y limpiar el objeto para Mongoose
      const orderToSave: any = { ...data };
      if (orderToSave.id) {
        orderToSave._id = orderToSave.id;
        delete orderToSave.id;
      }

      // Comprobar si existe para actualizar o crear
      if (
        orderToSave._id &&
        (await PurchaseOrderModel.exists({ _id: orderToSave._id }))
      ) {
        const updated = await PurchaseOrderModel.findByIdAndUpdate(
          orderToSave._id, // Usamos el _id para la búsqueda
          orderToSave, // Usamos el objeto mapeado para la actualización
          { new: true }
        );
        return { statusCode: 200, headers, body: JSON.stringify(updated) };
      }

      // Crear nuevo documento (asume que orderToSave ya tiene _id si es nuevo, como lo genera el frontend)
      const newOrder = await PurchaseOrderModel.create(orderToSave);
      return { statusCode: 201, headers, body: JSON.stringify(newOrder) };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};
      await PurchaseOrderModel.findByIdAndDelete(id);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
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
