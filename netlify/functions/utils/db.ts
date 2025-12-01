import mongoose from "mongoose";

// Variable de estado para reutilizar la conexión
let cachedDb: any = null;

// La URI de la base de datos debería estar configurada en Netlify
const MONGO_URI = process.env.MONGO_URI;

/**
 * Conecta a la base de datos o reutiliza la conexión en caché.
 */
// Exportamos la función como default para que coincida con: import connectToDatabase from './utils/db';
const connectToDatabase = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable not set.");
  }

  // 1. Reutilizar la conexión si ya está en caché
  if (cachedDb) {
    console.log("Using existing database connection.");
    return cachedDb;
  }

  // 2. Conectar a la BD si no está en caché
  console.log("Connecting to database...");
  try {
    const db = await mongoose.connect(MONGO_URI, {
      // Estas opciones son para evitar advertencias de deprecación de Mongoose,
      // pero pueden ser opcionales dependiendo de la versión.
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    // 3. Almacenar la conexión en caché
    cachedDb = db;
    console.log("Successfully connected and cached database.");
    return cachedDb;
  } catch (error) {
    console.error("Error connecting to database:", error);
    // Relanzar el error para que la función de Netlify falle.
    throw new Error("Database connection failed.");
  }
};

// 🛑 EXPORTACIÓN CLAVE: Exportación por defecto
export default connectToDatabase;
