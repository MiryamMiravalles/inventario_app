import { Handler } from "@netlify/functions";
// La importación de connectToDatabase debe ser correcta (asumo que se resolvió en db.ts)
import connectToDatabase from "./utils/data";
import { ConfigModel } from "./models";

// 🛑 CORRECCIÓN CLAVE: Cambiado de 'const handler' y 'export { handler }' a 'export const handler'
export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectToDatabase();
    console.log("Database connection established for config function.");
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
    // GET: Obtener la lista de fuentes de ingresos
    if (event.httpMethod === "GET") {
      // Usamos findOne para obtener el documento de configuración singleton
      const config = await (ConfigModel.findOne as any)({});
      const sources = config ? config.incomeSources || [] : [];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sources),
      };
    } // POST: Guardar la lista de fuentes de ingresos (Upsert)

    if (event.httpMethod === "POST") {
      const sources = JSON.parse(event.body || "[]"); // Encontrar y actualizar el documento de configuración, o crearlo si no existe

      const updatedConfig = await (ConfigModel.findOneAndUpdate as any)(
        {}, // Filtro vacío
        { incomeSources: sources },
        {
          new: true,
          upsert: true, // Crea el documento si no existe
          runValidators: true,
        }
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(updatedConfig.incomeSources),
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
