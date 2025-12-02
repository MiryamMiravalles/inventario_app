import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data"; // Ahora devuelve el objeto DB de MongoClient
import { Collection, Document } from "mongodb";
import mongoose from "mongoose"; // Necesario para generar IDs

// Nombre de la colección (pluralizado por convención de Mongoose)
const COLLECTION_NAME = "inventoryrecords";

// 🛑 Interfaz: Define el documento de historial con _id como string para compatibilidad UUID
interface InventoryRecordDocument extends Document {
  _id: string;
  date: string;
  label: string;
  type: string;
  // ... otros campos del registro de inventario (items)
}

const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let db;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    db = await connectToDatabase();
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
    // 🛑 CAMBIO CLAVE: Usamos la Collection de MongoClient con tipado
    const collection: Collection<InventoryRecordDocument> =
      db.collection(COLLECTION_NAME);

    // Función auxiliar para mapear el ID de MongoDB al formato de frontend
    const formatRecord = (record: InventoryRecordDocument | null) => {
      if (!record) return null;
      const _idString = record._id.toString();
      const { _id, ...rest } = record;
      return { id: _idString, ...rest };
    };

    if (event.httpMethod === "GET") {
      // 🛑 CAMBIO: Usar find() nativo y toArray()
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
      delete recordToSave.id;

      // 🛑 CORRECCIÓN DE FECHA: Aseguramos que la fecha es el ISO string si se necesita actualizar.
      // El frontend debería enviar un ISO string, pero si no lo hace, usamos el actual.
      if (!recordToSave.date) {
        recordToSave.date = new Date().toISOString();
      }

      // 🛑 CAMBIO: Usar updateOne con upsert para manejar tanto la creación como la actualización
      // (si se enviara un ID para actualizar un registro, aunque no es común en el historial)
      await collection.updateOne(
        { _id: filterId },
        { $set: recordToSave },
        { upsert: true }
      );

      // Leer el documento guardado para devolverlo al frontend
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
        // Borrar un solo registro
        // 🛑 CAMBIO: Usar deleteOne nativo
        await collection.deleteOne({ _id: id });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Deleted single record" }),
        };
      } else {
        // Borrar TODOS los registros (Reseteo de historial completo)
        // 🛑 CAMBIO: Usar deleteMany nativo
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

export { handler };
