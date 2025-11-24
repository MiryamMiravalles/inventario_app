import { Handler } from "@netlify/functions";
import { connectToDatabase } from "./utils/db";
import { IncomeSourceModel } from "./models";

export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectToDatabase();

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    if (event.httpMethod === "GET") {
      const sources = await IncomeSourceModel.find();
      return { statusCode: 200, headers, body: JSON.stringify(sources) };
    }

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "[]");
      // Replace all sources logic
      await IncomeSourceModel.deleteMany({});
      // Ensure we don't try to insert with empty IDs if they come from frontend logic that uses custom string IDs
      // But MongoDB will generate _id. We should trust the frontend IDs if they are important, but usually simple strings.
      // We map 'id' to '_id' if present or let mongo generate.
      const formattedData = data.map((item: any) => ({
        ...item,
        _id: item.id || undefined,
      }));
      const created = await IncomeSourceModel.insertMany(formattedData);
      return { statusCode: 201, headers, body: JSON.stringify(created) };
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
