import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data"; // Ahora devuelve el objeto DB de MongoClient
import { Collection, Document } from "mongodb";
import mongoose from "mongoose"; // 🛑 CORRECCIÓN: Reintroducimos la importación para usar mongoose.Types.ObjectId

// Nombre de la colección donde se guardan las sesiones. Mongoose pluraliza 'Session' a 'sessions'.
const COLLECTION_NAME = "sessions";

// 🛑 Interfaz: Define el documento de sesión con _id como string para compatibilidad UUID
interface SessionDocument extends Document {
  _id: string;
  date: string;
  description: string;
  // ... el resto de campos (income, expenses, etc.)
}

const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let db;

  try {
    db = await connectToDatabase();
  } catch (e) {
    console.error("Database Connection Error (sessions):", e);
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
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // 🛑 CAMBIO CLAVE: Usamos la Collection de MongoClient con tipado
    const collection: Collection<SessionDocument> =
      db.collection(COLLECTION_NAME);

    // Función auxiliar para mapear el ID de MongoDB al formato de frontend
    const formatSession = (session: SessionDocument | null) => {
      if (!session) return null;
      // _id ya es un string gracias a la interfaz
      const _idString = session._id.toString();
      const { _id, ...rest } = session;
      return { id: _idString, ...rest };
    };

    if (event.httpMethod === "GET") {
      // 🛑 CAMBIO: Usar find() nativo con toArray()
      const sessions = await collection.find().sort({ date: -1 }).toArray();
      const formattedSessions = sessions.map(formatSession);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(formattedSessions),
      };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const sessionToSave: any = { ...data };

      let filterId = sessionToSave.id || null;

      if (!filterId) {
        // Si es una creación, usamos el generador de IDs string de Mongoose para compatibilidad
        filterId = new mongoose.Types.ObjectId().toHexString();
      }

      // Mapeo de ID
      sessionToSave._id = filterId;
      delete sessionToSave.id;

      // 🛑 CAMBIO: Usar updateOne con upsert (crea si no existe, actualiza si sí)
      await collection.updateOne(
        { _id: filterId },
        { $set: sessionToSave },
        { upsert: true }
      );

      // Leer el documento guardado para devolverlo al frontend
      const updatedSession = await collection.findOne({ _id: filterId });
      const formattedSession = formatSession(updatedSession);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(formattedSession),
      };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};
      // 🛑 CAMBIO: Usar deleteOne nativo
      await collection.deleteOne({ _id: id });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" }),
      };
    }

    return { statusCode: 405, headers, body: "Method Not Allowed" };
  } catch (error: any) {
    console.error("Error executing sessions function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};

export { handler };
