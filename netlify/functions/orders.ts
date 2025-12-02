import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data"; // Ahora devuelve el objeto DB de MongoClient
import { PurchaseOrderModel } from "./models"; // Lo mantenemos solo para referencia de estructura si fuera necesario
import mongoose from "mongoose"; // Necesario para generar el ID (ObjectId)
// Importamos Collection y Document de MongoDB para tipado
import { Collection, Document } from "mongodb";

// 🛑 NUEVA INTERFAZ: Define el tipo de documento con _id como string
interface PurchaseOrderDocument extends Document {
  _id: string;
  orderDate: string;
  deliveryDate?: string;
  supplierName: string;
  // Añadir aquí el resto de las propiedades del pedido si se quiere un tipado estricto
  // Para simplificar y mantener la compatibilidad con el código existente, Document y _id: string es suficiente.
}

// Nombre de la colección donde se guardan los pedidos. Mongoose pluraliza 'PurchaseOrder' a 'purchaseorders'.
const COLLECTION_NAME = "purchaseorders";

const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let db;

  try {
    // 🛑 Paso 1: Conectar y obtener el objeto DB nativo
    db = await connectToDatabase();
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
      // Usamos el mensaje de error de la función connectToDatabase
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
    // 🛑 CAMBIO CLAVE DE TIPADO: Usamos la interfaz PurchaseOrderDocument
    const collection: Collection<PurchaseOrderDocument> =
      db.collection(COLLECTION_NAME);

    // Función auxiliar para mapear el ID de MongoDB al formato de frontend
    const formatOrder = (order: PurchaseOrderDocument | null) => {
      if (!order) return null;

      // _id ya es un string gracias a la interfaz, no necesitamos .toString()
      const _idString = order._id;
      const { _id, ...rest } = order;

      // La propiedad 'id' del frontend es un string, lo extraemos del _id de Mongo
      return { id: _idString, ...rest };
    };

    if (event.httpMethod === "GET") {
      // 🛑 CAMBIO: Usar find() nativo con toArray()
      const orders = await collection.find().sort({ orderDate: -1 }).toArray();
      const formattedOrders = orders.map(formatOrder);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(formattedOrders),
      };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const orderToSave: any = { ...data };

      // 🛑 CAMBIO: Si es nuevo, generamos un ID String (UUID) compatible con Mongo _id
      if (!orderToSave.id) {
        // Reutilizamos el generador de ID de Mongoose/Mongo para asegurar unicidad
        orderToSave.id = new mongoose.Types.ObjectId().toHexString();
      }

      // Mapeo de ID
      const filterId = orderToSave.id; // Guardamos el ID como string
      orderToSave._id = filterId;
      delete orderToSave.id;

      // 🛑 CORRECCIÓN: El filtro es ahora tipo string, no hay error de tipado.
      await collection.updateOne(
        { _id: filterId }, // filterId es un string (UUID)
        { $set: orderToSave },
        { upsert: true }
      );

      // Leer el documento guardado para devolverlo al frontend
      const updatedOrder = await collection.findOne({ _id: filterId });
      const formattedOrder = formatOrder(updatedOrder);

      console.log(`Order processed successfully: ${formattedOrder!.id}`);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(formattedOrder),
      };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};
      // 🛑 CORRECCIÓN: El filtro es ahora tipo string, no hay error de tipado.
      await collection.deleteOne({ _id: id });
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
