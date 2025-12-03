// netlify/functions/config.ts
import { Handler } from "@netlify/functions";
// Nota: Usamos "./utils/data" (asumiendo que connectToDatabase devuelve la DB nativa)
import connectToDatabase from "./utils/data";
// Importamos Collection y Document de MongoDB para tipado
import { Collection, Document } from "mongodb";

// Nombre de la colección donde se guarda la configuración (similar a un singleton)
const COLLECTION_NAME = "config";
const DOCUMENT_ID = "main_config"; // Usamos un ID fijo para el documento único de configuración

// Interfaz: Define el documento de configuración
interface ConfigDocument extends Document {
  _id: string; // ID fijo del documento singleton
  incomeSources: { id: string; label: string }[];
}

// 🛑 CORRECCIÓN CLAVE: Exportación directa para resolver el error de runtime
export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let db: any;

  try {
    // 🛑 CAMBIO CLAVE: connectToDatabase devuelve el objeto DB directamente.
    db = await connectToDatabase();
  } catch (e) {
    console.error("Database Connection Error (config):", e);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: (e as any).message || "Failed to connect to database.",
      }),
    };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // Usamos la Collection de MongoClient con tipado
    const collection: Collection<ConfigDocument> =
      db.collection(COLLECTION_NAME); // GET: Obtener la lista de fuentes de ingresos

    if (event.httpMethod === "GET") {
      // Buscamos el documento singleton por su ID fijo
      const config = await collection.findOne({ _id: DOCUMENT_ID } as any); // Extraemos solo las fuentes de ingresos o un array vacío si no existe el documento

      const sources = config ? config.incomeSources || [] : [];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sources),
      };
    } // POST: Guardar la lista de fuentes de ingresos

    if (event.httpMethod === "POST") {
      const sources = JSON.parse(event.body || "[]"); // Usamos updateOne con upsert: true y el _id fijo

      await collection.updateOne(
        { _id: DOCUMENT_ID }, // Al guardar, nos aseguramos de incluir el _id
        { $set: { incomeSources: sources, _id: DOCUMENT_ID } },
        { upsert: true }
      ); // Devolvemos las fuentes de ingresos guardadas

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(sources),
      };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error: any) {
    console.error("Error executing config function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
