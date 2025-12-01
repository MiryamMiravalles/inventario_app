import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  CashFlowSession,
  SupplierExpense,
  InventoryItem,
  PurchaseOrder,
  PurchaseOrderStatus,
  InventoryRecord,
  IncomeSource,
} from "./types";
import CashFlow from "./components/CashFlow";
import InventoryComponent from "./components/Inventory";
import { MenuIcon, XIcon } from "./components/icons";
import { INVENTORY_LOCATIONS } from "./constants";

// IMPORTANTE: Asegúrate de que este import sea correcto en tu entorno.
import { api } from "./src/api";

// Mock Data (Configuración Limpia)
const initialSessions: CashFlowSession[] = [];
const initialSupplierExpenses: SupplierExpense[] = [];
const defaultIncomeSources: IncomeSource[] = [
  { id: "barra1", label: "B1" },
  { id: "barra2", label: "B2" },
  { id: "barra3", label: "B3" },
  { id: "barra4", label: "B4" },
  { id: "restaurante", label: "Rest" },
  { id: "tickets", label: "Puerta" },
  { id: "vip", label: "Puerta VIP" },
  { id: "web", label: "Web" },
];

const initialStockByLocation = INVENTORY_LOCATIONS.reduce(
  (acc, loc) => ({ ...acc, [loc]: 0 }),
  {}
);

// Función para construir el stock: ahora siempre iniciará en 0, a menos que se fuerce una localización.
const buildStock = (mainLocationStock: number = 0, location = "Almacén") => ({
  ...initialStockByLocation,
  [location]: mainLocationStock,
});

// 💥 CORRECCIÓN: Todos los items se inicializan a 0 usando buildStock(0)
const initialInventoryItems: InventoryItem[] = [
  // Vodka
  {
    id: "a1",
    name: "Absolut",
    category: "🧊 Vodka",
    stockByLocation: buildStock(0),
  },
  {
    id: "a2",
    name: "Beluga",
    category: "🧊 Vodka",
    stockByLocation: buildStock(0),
  },
  {
    id: "a3",
    name: "Belvedere",
    category: "🧊 Vodka",
    stockByLocation: buildStock(0),
  },
  {
    id: "a4",
    name: "Grey Goose",
    category: "🧊 Vodka",
    stockByLocation: buildStock(0),
  },
  {
    id: "a5",
    name: "Vozca Negro",
    category: "🧊 Vodka",
    stockByLocation: buildStock(0),
  },
  // Ron
  {
    id: "a6",
    name: "Bacardi 8",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a7",
    name: "Bacardi Carta Blanca 1Lt",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a8",
    name: "Bumbu Original",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a9",
    name: "Brugal",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a10",
    name: "Havana Club",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a11",
    name: "Malibu",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a12",
    name: "Sta Teresa Gran Reserva",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a13",
    name: "Sta Teresa 1796",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a14",
    name: "Zacapa 23",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  {
    id: "a15",
    name: "Zacapa XO",
    category: "🥥 Ron",
    stockByLocation: buildStock(0),
  },
  // Whisky / Bourbon
  {
    id: "a16",
    name: "Ballantines",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a17",
    name: "Ballantines 10",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a18",
    name: "Bullet",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a19",
    name: "Chivas 12",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a20",
    name: "Chivas 15",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a21",
    name: "Carlos I",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a22",
    name: "Dewars Whait label",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a23",
    name: "Four Roses",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a24",
    name: "Hennesy",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a25",
    name: "JB",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a26",
    name: "J. Walker Black Label",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a27",
    name: "J. Walker Gold Label Reserve",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a28",
    name: "J. Walker White",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a29",
    name: "J.Walcker E.Black 0.7 Luxe",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a30",
    name: "Jack Daniel’s",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a31",
    name: "Jameson",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a32",
    name: "Lagavulin",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a33",
    name: "Macallan 12 años double cask",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  {
    id: "a34",
    name: "Torres 10",
    category: "🥃 Whisky / Bourbon",
    stockByLocation: buildStock(0),
  },
  // Ginebra
  {
    id: "a35",
    name: "Beefeater",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a36",
    name: "Beefeater 0%",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a37",
    name: "Beefeater Black",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a38",
    name: "Beefeater Pink",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a39",
    name: "Beefeater Pink 20%",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a40",
    name: "Beefeater Pink Premium",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a41",
    name: "Bombay Saphire",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a42",
    name: "G’Vine",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a43",
    name: "Gin Mare",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a44",
    name: "Hendricks",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a45",
    name: "Malfy Limón",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a46",
    name: "Monkey 47",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a47",
    name: "Seagrams",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a48",
    name: "Seagrams 0%",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  {
    id: "a49",
    name: "Tanqueray Ten",
    category: "🍸 Ginebra",
    stockByLocation: buildStock(0),
  },
  // Tequila
  {
    id: "a50",
    name: "Cazadores",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a51",
    name: "Código Blanco",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a52",
    name: "Código Reposado",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a53",
    name: "Código Rosa",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a54",
    name: "Jose Cuervo (tequila)",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a55",
    name: "Patrón Reposado",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a56",
    name: "Patrón Silver",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a57",
    name: "Tequila Clase Azul Reposado",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a58",
    name: "Tequila Don Julio 1942",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a59",
    name: "Tequila Don Julio Blanco",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a60",
    name: "Tequila Don Julio Reposado 0.7",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a61",
    name: "Tequila Olmeca",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  {
    id: "a62",
    name: "Tequifresi",
    category: "🌵 Tequila",
    stockByLocation: buildStock(0),
  },
  // Mezcal
  {
    id: "a63",
    name: "Mezcal Bhanes",
    category: "🔥 Mezcal",
    stockByLocation: buildStock(0),
  },
  {
    id: "a64",
    name: "Mezcal Joven Casamigos",
    category: "🔥 Mezcal",
    stockByLocation: buildStock(0),
  },
  {
    id: "a65",
    name: "Sarajishviu",
    category: "🔥 Mezcal",
    stockByLocation: buildStock(0),
  },
  // Licores y Aperitivos
  {
    id: "a66",
    name: "Aperitivo (Petroni)",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a67",
    name: "Aperol",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a68",
    name: "Baileys 1 Lt",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a69",
    name: "Blue Coraçao",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a70",
    name: "Cachaça (Vhelo Barreiro)",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a71",
    name: "Campari",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a72",
    name: "Caiman Love Almendras",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a73",
    name: "Cointreau",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a74",
    name: "Cordial de Lima (Caiman)",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a75",
    name: "Cordial de Grosella (Caiman)",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a76",
    name: "Disaronno",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a77",
    name: "Fernet",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a78",
    name: "Frangelico",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a79",
    name: "Hiervas Ibiza Mary Mayans",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a80",
    name: "Jagermeister",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a81",
    name: "Jet Wild Fruits",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a82",
    name: "Kalhua",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a83",
    name: "Licor 43",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a84",
    name: "Licor de Cassís",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a85",
    name: "Limoncello (Villa Massa)",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a86",
    name: "Midori",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a87",
    name: "Passoa",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a88",
    name: "Patxaran",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a89",
    name: "Pisco",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a90",
    name: "Rua Vieja (crema)",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a91",
    name: "Rua Vieja aguardiente",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a92",
    name: "Rua Vieja café",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a93",
    name: "Rua Vieja (Licor de hierbas)",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a94",
    name: "Saint Germain",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a95",
    name: "Santa Fe Grosella",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a96",
    name: "Ratafia",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a97",
    name: "Triple Sec (Caiman)",
    category: "🍯 Licores y Aperitivos",
    stockByLocation: buildStock(0),
  },
  // Vermut
  {
    id: "a98",
    name: "Martini Blanco",
    category: "🍷 Vermut",
    stockByLocation: buildStock(0),
  },
  {
    id: "a99",
    name: "Martini Fiero",
    category: "🍷 Vermut",
    stockByLocation: buildStock(0),
  },
  {
    id: "a100",
    name: "Martini Rosso",
    category: "🍷 Vermut",
    stockByLocation: buildStock(0),
  },
  {
    id: "a101",
    name: "Martini Reserva",
    category: "🍷 Vermut",
    stockByLocation: buildStock(0),
  },
  {
    id: "a102",
    name: "UNIQ Vermut",
    category: "🍷 Vermut",
    stockByLocation: buildStock(0),
  },
  {
    id: "a103",
    name: "Vermut Negro",
    category: "🍷 Vermut",
    stockByLocation: buildStock(0),
  },
  {
    id: "a104",
    name: "Vermut Miró blanco",
    category: "🍷 Vermut",
    stockByLocation: buildStock(0),
  },
  {
    id: "a105",
    name: "Vermut Miró negro",
    category: "🍷 Vermut",
    stockByLocation: buildStock(0),
  },
  // Vinos y espumosos
  {
    id: "a106",
    name: "Plana d'en fonoll (Sauvignon)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a107",
    name: "Piedra (Verdejo)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a108",
    name: "Bicicletas y Peces (Verdejo)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a109",
    name: "Maricel (Malvasia de Sitges)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a110",
    name: "Mar de Frades (Albariño)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a111",
    name: "El Fanio 2022 (Xarel-lo)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a112",
    name: "Albariño LAMEESPIÑAS",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a113",
    name: "MarT",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a114",
    name: "Savinat",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a115",
    name: "Malvasia Sitges",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a116",
    name: "Fenomenal",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a117",
    name: "Llagrimes (Gartnatxa)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a118",
    name: "Maison Sainte Marguerite",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a119",
    name: "Sospechoso",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a120",
    name: "Sospechoso MAGNUM",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a121",
    name: "Miraval",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a122",
    name: "M Minuty",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a123",
    name: "Convento Oreja ( Ribera del Duero)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a124",
    name: "Corbatera (Montsant)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a125",
    name: "Plana d'en fonoll (Cabernet-Sauvignon)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a126",
    name: "Azpilicueta",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a127",
    name: "Lagrimas de Maria (Tempranillo-Crianza)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a128",
    name: "Pago Carrovejas",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a129",
    name: "Pruno",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a130",
    name: "Finca Villacreces",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a131",
    name: "Predicador",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a132",
    name: "El hombre bala",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a133",
    name: "Corimbo",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a134",
    name: "Corral de Campanas (TINTA DE TORO)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a135",
    name: "Quinta Quietud (TINTA DE TORO)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a136",
    name: "La MULA ( TINTA DE TORO)",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a137",
    name: "Castell de Ribes (CAVA) Rosado",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a138",
    name: "Castell de Ribes (CAVA) Blanco",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a139",
    name: "CAVA Gramona LUSTROS",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a140",
    name: "MUM CHAMPAGNE BRUT",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a141",
    name: "MUM CHAMPAGNE ROSE",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a142",
    name: "MUM CHAMPAGNE ICE",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a143",
    name: "MOET CHANDON BRUT",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a144",
    name: "MOET CHANDON ROSE",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a145",
    name: "MOET CHANDON ICE",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a146",
    name: "VEUVE CLICQUOT",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  {
    id: "a147",
    name: "DOM PERIGNON",
    category: "🥂 Vinos y espumosos",
    stockByLocation: buildStock(0),
  },
  // Refrescos y agua
  {
    id: "a148",
    name: "Agua con Gas",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a149",
    name: "Agua sin gas 33",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a150",
    name: "Agua con gas 75",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a151",
    name: "Aquabona 33",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a152",
    name: "Aquabona 75",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a153",
    name: "Aquarius",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a154",
    name: "Aquarius Naranja",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a155",
    name: "Arandanos 1 Lt",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a156",
    name: "Bitter Kas",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a157",
    name: "Coca Cola",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a158",
    name: "Coca Cola Zero",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a159",
    name: "Granini Naranja 1 Lt",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a160",
    name: "Lipton",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a161",
    name: "Minute Maid Tomate",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a162",
    name: "Minute Maid Naranja",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a163",
    name: "Minute Maid Piña",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a164",
    name: "Red Bull",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a165",
    name: "Red Bull Sin Azucar",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a166",
    name: "Red Bull Rojo",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a167",
    name: "Pepsi",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a168",
    name: "Pepsi sin azucar",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a169",
    name: "Pomelo 1 Lt",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a170",
    name: "Schweppes Ginger Ale",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a171",
    name: "Schweppes Ginger Beer",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a172",
    name: "Schweppes Limon",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a173",
    name: "Schweppes Naranja",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a174",
    name: "Schweppes Pomelo",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a175",
    name: "Schweppes soda",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a176",
    name: "Schweppes Tonica",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a177",
    name: "Schweppes Tonica 0%",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a178",
    name: "Sprite",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a179",
    name: "Tomate 1 Lt",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  {
    id: "a180",
    name: "7up",
    category: "🥤Refrescos y agua",
    stockByLocation: buildStock(0),
  },
  // Cerveza
  {
    id: "a181",
    name: "Moritz 7",
    category: "🍻 Cerveza",
    stockByLocation: buildStock(0),
  },
  {
    id: "a182",
    name: "Moritz EPIDOR",
    category: "🍻 Cerveza",
    stockByLocation: buildStock(0),
  },
  {
    id: "a183",
    name: "Moritz 0%",
    category: "🍻 Cerveza",
    stockByLocation: buildStock(0),
  },
  {
    id: "a184",
    name: "Ambar Gluten free",
    category: "🍻 Cerveza",
    stockByLocation: buildStock(0),
  },
  {
    id: "a185",
    name: "Ambar Triple 0 Tostada",
    category: "🍻 Cerveza",
    stockByLocation: buildStock(0),
  },
  {
    id: "a186",
    name: "Barril Moritz 30Lt",
    category: "🍻 Cerveza",
    stockByLocation: buildStock(0),
  },
  {
    id: "a187",
    name: "Barril Moritz Radler 30 Lt",
    category: "🍻 Cerveza",
    stockByLocation: buildStock(0),
  },
  {
    id: "a188",
    name: "BARRIL 500LT",
    category: "🍻 Cerveza",
    stockByLocation: buildStock(0),
  },
];

const initialPurchaseOrders: PurchaseOrder[] = [];

// --- FUNCIÓN DE UTILIDAD: Convierte UTC a la hora local (Definida en App.tsx) ---
const formatUTCToLocal = (utcDateString: string | Date | undefined): string => {
  if (!utcDateString) return "N/A";

  return new Date(utcDateString).toLocaleString("es-ES", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// --- COMPONENTE PRINCIPAL ---
const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>("inventory");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [sessions, setSessions] = useState<CashFlowSession[]>(initialSessions);
  const [supplierExpenses, setSupplierExpenses] = useState<SupplierExpense[]>(
    initialSupplierExpenses
  );

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(
    initialInventoryItems
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(
    initialPurchaseOrders
  );
  const [inventoryHistory, setInventoryHistory] = useState<InventoryRecord[]>(
    () => {
      try {
        const saved = localStorage.getItem("inventoryHistory");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error("Failed to load inventory history from localStorage", e);
        return [];
      }
    }
  );

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(() => {
    try {
      const saved = localStorage.getItem("incomeSources");
      return saved ? JSON.parse(saved) : defaultIncomeSources;
    } catch (e) {
      return defaultIncomeSources;
    }
  });

  // --- EFECTOS DE PERSISTENCIA (LocalStorage) ---
  useEffect(() => {
    try {
      localStorage.setItem(
        "inventoryHistory",
        JSON.stringify(inventoryHistory)
      );
    } catch (e) {
      console.error("Failed to save inventory history to localStorage", e);
    }
  }, [inventoryHistory]);

  useEffect(() => {
    try {
      localStorage.setItem("incomeSources", JSON.stringify(incomeSources));
    } catch (e) {
      console.error("Failed to save income sources to localStorage", e);
    }
  }, [incomeSources]);

  // --- CÁLCULOS Y HELPERS ---
  const navItems: { id: View; label: string }[] = [
    { id: "inventory", label: "Inventario" },
    { id: "cashflow", label: "Caja" },
  ];

  const uniqueSuppliers = useMemo(() => {
    const expenseSuppliers = supplierExpenses.map((exp) => exp.supplierName);
    const orderSuppliers = purchaseOrders.map((ord) => ord.supplierName);
    const all = new Set([...expenseSuppliers, ...orderSuppliers]);
    return Array.from(all).filter((s) => s.trim() !== "");
  }, [supplierExpenses, purchaseOrders]);

  const addOrUpdate = useCallback(
    <T extends { id: string; name?: string }>( // <<-- Añado 'name' para tipado de InventoryItem
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      item: T
    ) => {
      setter((prev) => {
        const index = prev.findIndex((i) => i.id === item.id);
        let updatedList: T[];
        const itemWithId = { ...item, id: item.id || crypto.randomUUID() };

        if (index > -1) {
          updatedList = [...prev];
          updatedList[index] = itemWithId;
        } else {
          updatedList = [itemWithId, ...prev];
        }

        // 💥 LÓGICA DE ORDENACIÓN ALFABÉTICA
        // Ordena si el tipo de elemento tiene la propiedad 'name' (como InventoryItem)
        if ((updatedList[0] as any).name !== undefined) {
          return updatedList.sort((a, b) =>
            (a as any).name.localeCompare((b as any).name)
          );
        }

        return updatedList;
      });
    },
    []
  );

  const deleteItem = useCallback(
    <T extends { id: string }>(
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      id: string
    ) => {
      setter((prev) => prev.filter((item) => item.id !== id));
    },
    []
  );

  // --- API Handlers para Pedidos ---
  const handleSavePurchaseOrder = useCallback(
    async (order: PurchaseOrder) => {
      try {
        // Lógica de guardado en API (Netlify Function)
        const savedOrder = await api.orders.save(order);
        addOrUpdate(setPurchaseOrders, savedOrder as PurchaseOrder);
      } catch (e) {
        console.error("Error saving order:", e);
        alert(
          `Error al guardar el pedido: ${
            e instanceof Error ? e.message : "Error desconocido"
          }`
        );
      }
    },
    [addOrUpdate]
  );

  const handleDeletePurchaseOrder = useCallback(
    async (id: string) => {
      try {
        await api.orders.delete(id);
        deleteItem(setPurchaseOrders, id);
      } catch (e) {
        console.error("Error deleting order:", e);
        alert(
          `Error al eliminar el pedido: ${
            e instanceof Error ? e.message : "Error desconocido"
          }`
        );
      }
    },
    [deleteItem]
  );

  // --- API Handler para Borrar Todo el Historial ---
  const handleDeleteAllHistoryRecords = useCallback(async () => {
    try {
      if (
        !window.confirm(
          "ADVERTENCIA: ¿Está seguro de que desea eliminar TODO el historial de inventario y análisis de consumo? Esta acción es irreversible."
        )
      ) {
        return;
      }
      await api.history.deleteAll();
      setInventoryHistory([]);
      alert("Historial eliminado correctamente.");
    } catch (e) {
      console.error("Error deleting all history:", e);
      alert(
        `Error al eliminar todo el historial: ${
          e instanceof Error ? e.message : "Error desconocido"
        }`
      );
    }
  }, []);

  const handleSaveInventoryRecord = useCallback(
    (record: InventoryRecord) => {
      addOrUpdate(setInventoryHistory, record);
    },
    [addOrUpdate]
  );

  const handleBulkUpdateInventoryItems = useCallback(
    (updates: { name: string; stock: number }[], mode: "set" | "add") => {
      const updateMap = new Map(
        updates.map((u) => [u.name.toLowerCase(), u.stock])
      );
      const zeroedStock = INVENTORY_LOCATIONS.reduce(
        (acc, loc) => ({ ...acc, [loc]: 0 }),
        {}
      );

      setInventoryItems((prevItems) => {
        return prevItems.map((item) => {
          const newStockValue = updateMap.get(item.name.toLowerCase());
          if (newStockValue !== undefined) {
            const currentStockInAlmacen = item.stockByLocation["Almacén"] || 0;

            let finalStock;
            if (mode === "set") {
              // Si mode es 'set' (ej: reseteo o sync), establecemos el nuevo valor
              finalStock = newStockValue;
            } else {
              // Si mode es 'add', sumamos
              finalStock = currentStockInAlmacen + newStockValue;
            }

            const newStockByLocation = { ...zeroedStock, Almacén: finalStock };
            return { ...item, stockByLocation: newStockByLocation };
          }
          return item;
        });
      });
    },
    []
  );

  // --- FUNCIÓN DE UTILIDAD: Resetear a 0 el stock FÍSICO (Definida en App.tsx) ---
  const handleResetInventoryStocks = useCallback(() => {
    if (
      !window.confirm(
        "ADVERTENCIA: Esta acción pondrá TODO el stock físico (en todas las ubicaciones) a 0. ¿Desea continuar?"
      )
    ) {
      return;
    }

    const updatesToReset: { name: string; stock: number }[] =
      inventoryItems.map((item) => ({
        name: item.name,
        stock: 0,
      }));

    if (updatesToReset.length > 0) {
      handleBulkUpdateInventoryItems(updatesToReset, "set");
      alert(
        "Stock físico reseteado a 0. Puede comenzar el nuevo conteo físico."
      );
    } else {
      alert("No hay artículos en el inventario para resetear.");
    }
  }, [inventoryItems, handleBulkUpdateInventoryItems]);

  const renderContent = () => {
    switch (activeView) {
      case "cashflow":
        return (
          <CashFlow
            sessions={sessions}
            incomeSources={incomeSources}
            onUpdateIncomeSources={setIncomeSources}
            onSave={(session) => addOrUpdate(setSessions, session)}
            onDelete={(id) => deleteItem(setSessions, id)}
          />
        );
      case "inventory":
        return (
          <InventoryComponent
            inventoryItems={inventoryItems}
            purchaseOrders={purchaseOrders}
            suppliers={uniqueSuppliers}
            onSaveInventoryItem={(item) => addOrUpdate(setInventoryItems, item)}
            onDeleteInventoryItem={(id) => deleteItem(setInventoryItems, id)}
            onSavePurchaseOrder={handleSavePurchaseOrder}
            onDeletePurchaseOrder={handleDeletePurchaseOrder}
            onBulkUpdateInventoryItems={handleBulkUpdateInventoryItems}
            inventoryHistory={inventoryHistory}
            onSaveInventoryRecord={handleSaveInventoryRecord}
            onDeleteAllInventoryRecords={handleDeleteAllHistoryRecords}
            // PASAMOS LAS FUNCIONES DE UTILIDAD:
            formatUTCToLocal={formatUTCToLocal}
            handleResetInventoryStocks={handleResetInventoryStocks}
          />
        );
      default:
        return (
          <CashFlow
            sessions={sessions}
            incomeSources={incomeSources}
            onUpdateIncomeSources={setIncomeSources}
            onSave={(session) => addOrUpdate(setSessions, session)}
            onDelete={(id) => deleteItem(setSessions, id)}
          />
        );
    }
  };

  const navClasses = (view: View) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      activeView === view
        ? "bg-violet-600 text-white shadow-lg"
        : "text-slate-300 hover:bg-slate-700 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <nav className="bg-slate-900/80 backdrop-blur-sm shadow-lg sticky top-0 z-10 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0 text-violet-400 font-bold text-2xl">
              Control de Stock y Cajas
            </div>

            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={navClasses(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                type="button"
                className="bg-slate-800 inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? <XIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`${navClasses(item.id)} block w-full text-left`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {renderContent()}
        </div>
      </main>

      <footer className="bg-slate-900 text-center py-6 text-slate-500 text-sm border-t border-slate-800">
        © 2025 App Inventary. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
