import { Handler } from "@netlify/functions";
// 🛑 CORRECCIÓN: Asumo que connectToDatabase devuelve el CLIENTE MongoClient
import connectToDatabase from "./utils/data";
import mongoose from "mongoose"; // Necesario para generar IDs
// Importamos Collection y Document de MongoDB para tipado
import { Collection, Document, MongoClient } from "mongodb";

// Nombre de la colección (pluralizado por convención de Mongoose)
const COLLECTION_NAME = "inventoryrecords";

// 🛑 Interfaz: Define el documento de historial con _id como string para compatibilidad UUID
interface InventoryRecordDocument extends Document {
  _id: string;
  date: string;
  label: string;
  type: string; // El campo 'items' se mapea automáticamente.
}

// 🛑 CORRECCIÓN CLAVE: Exportación directa para resolver el error de runtime
export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let db: any; // Usaremos 'any' para el objeto DB devuelto por el cliente

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // 🛑 CAMBIO CLAVE: connectToDatabase devuelve el CLIENTE
    const client: MongoClient = await connectToDatabase();
    // Accedemos a la base de datos a través del cliente
    // El nombre de la base de datos se debe obtener de la variable MONGO_URI
    const dbName = new URL(
      process.env.MONGO_URI || "mongodb://localhost/test"
    ).pathname.substring(1);
    db = client.db(dbName);
  } catch (dbError) {
    console.error("Database Connection Error (history):", dbError);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: (dbError as any).message || "Failed to connect to database.",
      }),
    };
  }

  try {
    // Usamos la Collection de MongoClient con tipado
    const collection: Collection<InventoryRecordDocument> =
      db.collection(COLLECTION_NAME); // Función auxiliar para mapear el ID de MongoDB al formato de frontend

    const formatRecord = (record: InventoryRecordDocument | null) => {
      if (!record) return null;
      const _idString = record._id.toString();
      const { _id, ...rest } = record;
      return { id: _idString, ...rest };
    };

    if (event.httpMethod === "GET") {
      // Usar find() nativo y toArray() para obtener el historial ordenado
      const records = await collection.find().sort({ date: -1 }).toArray();
      const formattedRecords = records.map(formatRecord);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(formattedRecords),
      };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const recordToSave: any = { ...data };

      let filterId = recordToSave.id || null;

      if (!filterId) {
        // Si es nuevo, generamos un ID String (UUID) compatible
        filterId = new mongoose.Types.ObjectId().toHexString();
      }

      recordToSave._id = filterId;
      delete recordToSave.id; // Aseguramos que la fecha existe

      if (!recordToSave.date) {
        recordToSave.date = new Date().toISOString();
      } // Usar updateOne con upsert para manejar tanto la creación como la actualización

      await collection.updateOne(
        { _id: filterId },
        { $set: recordToSave },
        { upsert: true }
      ); // Leer el documento guardado para devolverlo al frontend

      const newRecord = await collection.findOne({ _id: filterId });
      const formattedRecord = formatRecord(newRecord);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(formattedRecord),
      };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};

      if (id) {
        // Borrar un solo registro (usando el ID del query string)
        await collection.deleteOne({ _id: id });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Deleted single record" }),
        };
      } else {
        // Borrar TODOS los registros (cuando no se proporciona 'id')
        await collection.deleteMany({});
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
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
