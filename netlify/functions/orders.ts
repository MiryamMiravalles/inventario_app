import { Handler } from '@netlify/functions';
import { connectToDatabase } from './utils/db';
import { PurchaseOrderModel } from './models';

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
      const orders = await PurchaseOrderModel.find().sort({ orderDate: -1 });
      return { statusCode: 200, headers, body: JSON.stringify(orders) };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      if (data.id && await PurchaseOrderModel.exists({ _id: data.id })) {
          const updated = await PurchaseOrderModel.findByIdAndUpdate(data.id, data, { new: true });
          return { statusCode: 200, headers, body: JSON.stringify(updated) };
      }
      const newOrder = await PurchaseOrderModel.create(data);
      return { statusCode: 201, headers, body: JSON.stringify(newOrder) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = event.queryStringParameters || {};
      await PurchaseOrderModel.findByIdAndDelete(id);
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted' }) };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};