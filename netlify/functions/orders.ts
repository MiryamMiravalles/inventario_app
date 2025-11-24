// netlify/functions/orders.ts
import { Handler } from "@netlify/functions";
import { connectToDatabase } from "./utils/db";
import { PurchaseOrderModel } from "./models";

const handler: Handler = async (event, context) => {
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
      // Corrección TS2349: Se usa 'as any' en find()
      const orders = await (PurchaseOrderModel.find as any)().sort({
        orderDate: -1,
      });
      return { statusCode: 200, headers, body: JSON.stringify(orders) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");

      // Mapear 'id' del frontend a '_id' de Mongoose (necesario si se usa un string ID)
      const orderToSave: any = { ...data };
      if (orderToSave.id) {
        orderToSave._id = orderToSave.id;
        delete orderToSave.id;
      }

      // Corrección TS2349: Se usa countDocuments() con 'as any' para evitar el error de tipado
      const exists = await (PurchaseOrderModel.countDocuments as any)({
        _id: orderToSave._id,
      });

      // Comprobar si existe para actualizar (update) o crear (create)
      if (orderToSave._id && exists > 0) {
        // Corrección TS2349: Se usa 'as any' en findByIdAndUpdate
        const updated = await (PurchaseOrderModel.findByIdAndUpdate as any)(
          orderToSave._id, // Usamos el _id para la búsqueda
          orderToSave, // Usamos el objeto mapeado para la actualización
          { new: true }
        );
        return { statusCode: 200, headers, body: JSON.stringify(updated) };
      }

      // Corrección TS2349: Se usa 'as any' en create()
      const newOrder = await (PurchaseOrderModel.create as any)(orderToSave);
      return { statusCode: 201, headers, body: JSON.stringify(newOrder) };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};
      // Corrección TS2349: Se usa 'as any' en findByIdAndDelete
      await (PurchaseOrderModel.findByIdAndDelete as any)(id);
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

// Se utiliza la exportación explícita para evitar problemas de inicialización en Netlify CLI
export { handler };
