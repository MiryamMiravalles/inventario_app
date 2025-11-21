import { Handler } from '@netlify/functions';
import { connectToDatabase } from './utils/db';
import { InventoryRecordModel } from './models';

export const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectToDatabase();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const history = await InventoryRecordModel.find().sort({ date: -1 });
      return { statusCode: 200, headers, body: JSON.stringify(history) };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const newRecord = await InventoryRecordModel.create(data);
      return { statusCode: 201, headers, body: JSON.stringify(newRecord) };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};