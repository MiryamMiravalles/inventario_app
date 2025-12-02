import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data"; // Ahora devuelve el objeto DB de MongoClient
// import { ConfigModel } from "./models"; // Ya no se usa Mongoose
import { Collection, Document } from "mongodb";

// Nombre de la colección donde se guarda la configuración (similar a un singleton)
const COLLECTION_NAME = "income_sources_config";
const DOCUMENT_ID = "main_config"; // Usamos un ID fijo para el documento único de configuración

// 🛑 Interfaz: Define el documento de configuración (con _id como string para compatibilidad)
interface ConfigDocument extends Document {
  _id: string;
  incomeSources: { id: string; label: string }[];
}

const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let db;

  try {
    db = await connectToDatabase();
  } catch (e) {
    console.error("Database Connection Error (config):", e);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      // Usamos el mensaje de error de la función connectToDatabase
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
    // 🛑 CAMBIO CLAVE: Usamos la Collection de MongoClient con tipado
    const collection: Collection<ConfigDocument> =
      db.collection(COLLECTION_NAME);

    // GET: Obtener la lista de fuentes de ingresos
    if (event.httpMethod === "GET") {
      // 🛑 CAMBIO: Usamos findOne nativo de MongoClient
      const config = await collection.findOne({ _id: DOCUMENT_ID });

      // Extraemos solo las fuentes de ingresos o un array vacío si no existe el documento
      const sources = config ? config.incomeSources || [] : [];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sources),
      };
    }

    // POST: Guardar la lista de fuentes de ingresos
    if (event.httpMethod === "POST") {
      const sources = JSON.parse(event.body || "[]");

      // 🛑 CAMBIO: Usamos updateOne con upsert: true y especificamos el _id fijo
      await collection.updateOne(
        { _id: DOCUMENT_ID },
        { $set: { incomeSources: sources } },
        { upsert: true }
      );

      // Devolvemos las fuentes de ingresos guardadas
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

export { handler };
