// netlify/functions/history.ts
import { Handler } from "@netlify/functions";
import connectToDatabase from "./utils/data";
import mongoose from "mongoose";
import { Collection, Document } from "mongodb";

const COLLECTION_NAME = "inventoryrecords";

interface InventoryRecordDocument extends Document {
  _id: string;
  date: string;
  label: string;
  type: string;
}

export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let db: any;

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
    const collection: Collection<InventoryRecordDocument> =
      db.collection(COLLECTION_NAME);

    const formatRecord = (record: InventoryRecordDocument | null) => {
      if (!record) return null;
      const _idString = record._id.toString();
      const { _id, ...rest } = record;
      return { id: _idString, ...rest };
    };

    if (event.httpMethod === "GET") {
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
        filterId = new mongoose.Types.ObjectId().toHexString();
      }

      recordToSave._id = filterId;
      delete recordToSave.id;

      if (!recordToSave.date) {
        recordToSave.date = new Date().toISOString();
      }

      await collection.updateOne(
        { _id: filterId },
        { $set: recordToSave },
        { upsert: true }
      );

      const newRecord = await collection.findOne({ _id: filterId });
      const formattedRecord = formatRecord(newRecord);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(formattedRecord),
      };
    }

    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters?.id;

      if (id) {
        // Borrar un solo registro
        await collection.deleteOne({ _id: id });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "Deleted single record" }),
        };
      } else {
        // Borrar TODOS los registros (borrado completo)
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
