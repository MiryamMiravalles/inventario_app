// netlify/functions/sessions.ts
import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data";
import { SessionModel } from "./models";
import mongoose from "mongoose";

// Implementación de la función para el endpoint /sessions (Sesiones de Caja)
export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Aseguramos la conexión a la base de datos
    await connectToDatabase();
    console.log("Database connection established for sessions function.");
  } catch (dbError) {
    console.error("Database Connection Error (sessions):", dbError);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
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
    const collection = SessionModel;

    if (event.httpMethod === "GET") {
      // Obtener todas las sesiones ordenadas por fecha descendente
      const sessions = await (collection.find as any)().sort({ date: -1 });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sessions),
      };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const sessionToSave: any = { ...data };

      if (!sessionToSave.id) {
        // Si es una nueva sesión sin ID, Mongoose generará el ObjectId automáticamente
        const newSession = await (collection.create as any)(sessionToSave);
        console.log(`Session created successfully: ${newSession._id}`);
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newSession),
        };
      } else {
        // Para actualizaciones o inserción con ID (upsert)
        sessionToSave._id = sessionToSave.id;
        delete sessionToSave.id;

        const updatedSession = await (collection.findOneAndUpdate as any)(
          { _id: sessionToSave._id },
          sessionToSave,
          { new: true, upsert: true, runValidators: true }
        );

        console.log(`Session processed successfully: ${updatedSession._id}`);
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(updatedSession),
        };
      }
    }

    if (event.httpMethod === "DELETE") {
      const { id } = event.queryStringParameters || {};

      // findByIdAndDelete debe recibir el ObjectId para el modelo de Sesión
      await (collection.findByIdAndDelete as any)(id);

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
