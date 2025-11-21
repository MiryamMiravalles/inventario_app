import { Handler } from '@netlify/functions';
import { connectToDatabase } from './utils/db';
import { SessionModel } from './models';

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
      const sessions = await SessionModel.find().sort({ date: -1 });
      return { statusCode: 200, headers, body: JSON.stringify(sessions) };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      // If id exists, update; otherwise create
      if (data.id && await SessionModel.exists({ _id: data.id })) {
         const updated = await SessionModel.findByIdAndUpdate(data.id, data, { new: true });
         return { statusCode: 200, headers, body: JSON.stringify(updated) };
      }
      const newSession = await SessionModel.create(data);
      return { statusCode: 201, headers, body: JSON.stringify(newSession) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = event.queryStringParameters || {};
      await SessionModel.findByIdAndDelete(id);
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted' }) };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};