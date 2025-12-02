import { MongoClient } from "mongodb";

// La URI de la base de datos debería estar configurada en Netlify.
const MONGO_URI = process.env.MONGO_URI;

// Nombre de la base de datos (extraído de la URI o especificado por si la URI no lo tiene)
const DB_NAME_DEFAULT = "inventory_app"; // Nombre de la DB confirmado por ti.

// Caching del cliente y la base de datos
let cachedClient: MongoClient | null = null;
let cachedDb: any = null; // Usaremos 'any' ya que es el objeto de la base de datos de MongoClient

/**
 * Conecta a la base de datos o reutiliza la conexión en caché usando MongoClient.
 * Esta aproximación es más estable en entornos Serverless que Mongoose.
 */
const connectToDatabase = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable not set.");
  }

  // 1. Reutilizar la conexión si ya está en caché.
  // Eliminamos isConnected() que no existe en las versiones recientes.
  // Confiamos en que si el cliente está en caché, la conexión es viable.
  if (cachedDb && cachedClient) {
    console.log("Using existing database connection (MongoClient Cached).");
    return cachedDb;
  }

  // 2. Conectar a la BD si no está conectado.
  console.log("Connecting to database using MongoClient...");
  try {
    // Extraer el nombre de la DB de la URI
    const match = MONGO_URI.match(/\/([^/?]+)\?/);
    const dbName = match ? match[1] : DB_NAME_DEFAULT;

    // Se recomienda pasar el objeto de opciones para la configuración Serverless,
    // aunque MongoClient moderno es bastante inteligente.
    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    } as any); // Usamos 'as any' para evitar problemas de tipado con la versión de Node/TS

    // Conectar el cliente
    await client.connect();

    const db = client.db(dbName);

    // 3. Almacenar la conexión en caché
    cachedClient = client;
    cachedDb = db;

    console.log(`Successfully connected to database: ${dbName}`);
    return db;
  } catch (error) {
    console.error("Error connecting to database:", error);
    // Relanzar un error que será capturado por la función Netlify.
    throw new Error(
      "Database connection failed (MongoClient). Check MONGO_URI, password, and IP access in MongoDB Atlas."
    );
  }
};

// 🛑 EXPORTACIÓN CLAVE: Exportación por defecto
export default connectToDatabase;
