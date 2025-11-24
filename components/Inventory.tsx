import React, { useState, useMemo, useEffect } from "react";
import {
  InventoryItem,
  PurchaseOrder,
  PurchaseOrderStatus,
  OrderItem,
  InventoryRecord,
  InventoryRecordItem,
} from "../types";
import Modal from "./Modal";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GoogleDriveIcon,
  ChevronDownIcon,
  ExportIcon,
  SearchIcon,
  InventoryIcon,
} from "./icons";
import { INVENTORY_LOCATIONS } from "../constants";

interface InventoryProps {
  inventoryItems: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  suppliers: string[];
  inventoryHistory: InventoryRecord[];
  onSaveInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (id: string) => void;
  onSavePurchaseOrder: (order: PurchaseOrder) => void;
  onDeletePurchaseOrder: (id: string) => void;
  // MODIFICADO: Ahora acepta el parámetro mode
  onBulkUpdateInventoryItems: (
    updates: { name: string; stock: number }[],
    mode: "set" | "add"
  ) => void;
  onSaveInventoryRecord: (record: InventoryRecord) => void;
  onDeleteAllInventoryRecords: () => void;
}

const emptyInventoryItem: Omit<InventoryItem, "id" | "stockByLocation"> = {
  name: "",
  category: "",
  unit: "",
};

const emptyPurchaseOrder: Omit<PurchaseOrder, "id"> = {
  orderDate: new Date().toISOString().split("T")[0],
  supplierName: "",
  items: [],
  status: PurchaseOrderStatus.Pending,
  totalAmount: 0,
};

// --- Mock Data for Drive Simulation ---
const mockDriveFiles: { id: string; name: string }[] = [
  { id: "file1", name: "Stock Semanal - Bebidas.csv" },
  { id: "file2", name: "Inventario General - Cocina.csv" },
  { id: "file3", name: "Control de Stock - Barra.csv" },
];

const mockFileContents: { [key: string]: string } = {
  file1: "Absolut, 60\nSchweppes Tonica, 300",
  file2: "Naranja, 150",
  file3: "Absolut, 55\nNaranja, 120\nSchweppes Tonica, 250",
};

const parseDecimal = (input: string): number => {
  if (typeof input !== "string" || !input) return 0;
  const sanitized = input.replace(",", ".");
  const number = parseFloat(sanitized);
  return isNaN(number) ? 0 : number;
};

const parseCurrency = (input: string): number => {
  if (typeof input !== "string" || !input) return 0;
  const sanitized = input
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const number = parseFloat(sanitized);
  return isNaN(number) ? 0 : number;
};

// Custom Category Order
const CATEGORY_ORDER = [
  "🧊 Vodka",
  "🥥 Ron",
  "🥃 Whisky / Bourbon",
  "🍸 Ginebra",
  "🌵 Tequila",
  "🔥 Mezcal",
  "🍯 Licores y Aperitivos",
  "🍷 Vermut",
  "🥂 Vinos y espumosos",
  "🥤Refrescos y agua",
  "🍻 Cerveza",
];

// --- Local Components ---

interface CategoryAccordionProps {
  title: string;
  children: React.ReactNode;
  itemCount: number;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  title,
  children,
  itemCount,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-bold text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <span>{title}</span>
          <span className="text-xs font-normal bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
            {itemCount} items
          </span>
        </div>
        <ChevronDownIcon
          className={`h-6 w-6 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-2 border-t border-slate-700">{children}</div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE DE ANÁLISIS SEMANAL ---
interface WeeklyConsumptionAnalysisProps {
  inventoryHistory: InventoryRecord[];
  // exportInventoryRecordToCSV se elimina de props
}

const WeeklyConsumptionAnalysis: React.FC<WeeklyConsumptionAnalysisProps> = ({
  inventoryHistory,
}) => {
  // Obtiene el registro de análisis más reciente
  const lastRecord = useMemo(() => {
    if (!inventoryHistory || inventoryHistory.length === 0) return null;
    return inventoryHistory.find((r) => r.type === "analysis");
  }, [inventoryHistory]);

  if (!lastRecord) {
    return (
      <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-lg">
        <p>
          Se necesita al menos **un registro de inventario** para mostrar el
          análisis de consumo.
        </p>
        <p className="text-sm mt-2">
          Guarda el inventario actual en la pestaña de 'Análisis'.
        </p>
      </div>
    );
  }

  // Filtra los artículos que tuvieron un consumo (gasto) superior a cero
  const consumptionItems = lastRecord.items.filter(
    (item) => item.consumption > 0.001
  );

  return (
    <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto p-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-xl font-bold text-white">
          Consumo de la Última Semana (Finalizado en:{" "}
          {new Date(lastRecord.date).toLocaleDateString("es-ES")})
        </h2>
        {/* Se eliminó el botón de Exportar Análisis */}
      </div>

      {consumptionItems.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Artículo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Cantidad Gastada
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Unidad
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {consumptionItems.map((item) => (
              <tr key={item.itemId} className="hover:bg-gray-700/50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {item.name}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-lg font-bold text-red-400">
                  {item.consumption.toFixed(1).replace(".", ",")}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                  {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-5 text-slate-500">
          <p>No hay artículos con consumo registrado en este análisis.</p>
        </div>
      )}
    </div>
  );
};
// --- FIN COMPONENTE DE ANÁLISIS SEMANAL ---

const InventoryComponent: React.FC<InventoryProps> = ({
  inventoryItems,
  purchaseOrders,
  suppliers,
  inventoryHistory,
  onSaveInventoryItem,
  onDeleteInventoryItem,
  onSavePurchaseOrder,
  onDeletePurchaseOrder,
  onBulkUpdateInventoryItems,
  onSaveInventoryRecord,
  onDeleteAllInventoryRecords, // Propiedad de borrado total
}) => {
  const [activeTab, setActiveTab] = useState<
    "inventory" | "orders" | "analysis" | "history"
  >("inventory");

  const [isInventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [currentInventoryItem, setCurrentInventoryItem] =
    useState<Partial<InventoryItem>>(emptyInventoryItem);

  const [isOrderModalOpen, setOrderModalOpen] = useState(false);
  // Inicialización del pedido sin costes
  const [currentPurchaseOrder, setCurrentPurchaseOrder] = useState<
    PurchaseOrder | Omit<PurchaseOrder, "id">
  >(emptyPurchaseOrder);
  const [tempOrderQuantities, setTempOrderQuantities] = useState<
    Record<number, string>
  >({});

  const [isDriveModalOpen, setDriveModalOpen] = useState(false);
  const [connectedFile, setConnectedFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [tempStockValues, setTempStockValues] = useState<
    Record<string, string>
  >({});
  const [endOfWeekStock, setEndOfWeekStock] = useState<{
    [key: string]: string;
  }>({});

  // Estado para la fecha del análisis
  const [analysisDate, setAnalysisDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Estado para la búsqueda en la pestaña Inventario
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para la búsqueda de productos en el modal de Pedido
  const [orderSearchTerm, setOrderSearchTerm] = useState("");

  // NUEVO ESTADO: Registro de historial seleccionado para ver detalles
  const [viewingRecord, setViewingRecord] = useState<InventoryRecord | null>(
    null
  );

  // Asegura que el historial esté en un array válido y ordenado por fecha descendente (más reciente primero)
  const validInventoryHistory = useMemo(() => {
    return (Array.isArray(inventoryHistory) ? inventoryHistory : []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ) as InventoryRecord[];
  }, [inventoryHistory]);

  // Recalculate total amount for order form whenever items change (siempre 0 porque eliminamos el coste)
  useEffect(() => {
    if (!isOrderModalOpen) return;
    // Forzamos totalAmount a 0
    setCurrentPurchaseOrder((prev) => ({ ...prev, totalAmount: 0 }));
  }, [currentPurchaseOrder.items, isOrderModalOpen]);

  // Al abrir el modal de pedido, reseteamos el buscador
  useEffect(() => {
    if (isOrderModalOpen) {
      setOrderSearchTerm("");
    }
  }, [isOrderModalOpen]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return inventoryItems;
    const lowerTerm = searchTerm.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerTerm) ||
        item.category.toLowerCase().includes(lowerTerm)
    );
  }, [inventoryItems, searchTerm]);

  // Artículos de inventario filtrados para el modal de Pedido
  const filteredOrderItems = useMemo(() => {
    if (!orderSearchTerm) return inventoryItems;
    const lowerTerm = orderSearchTerm.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerTerm) ||
        item.category.toLowerCase().includes(lowerTerm)
    );
  }, [inventoryItems, orderSearchTerm]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as { [key: string]: InventoryItem[] });
  }, [filteredItems]);

  // ---- Inventory Modal Handlers ----
  const openInventoryModal = (item?: InventoryItem) => {
    setCurrentInventoryItem(item || emptyInventoryItem);
    setInventoryModalOpen(true);
  };
  const closeInventoryModal = () => {
    setInventoryModalOpen(false);
    setCurrentInventoryItem(emptyInventoryItem);
  };
  const handleSaveInventory = () => {
    const itemToSave: Partial<InventoryItem> = { ...currentInventoryItem };

    if (!itemToSave.id) {
      // It's a new item
      const initialStock = INVENTORY_LOCATIONS.reduce(
        (acc, loc) => ({ ...acc, [loc]: 0 }),
        {}
      );
      itemToSave.stockByLocation = initialStock;
    }

    onSaveInventoryItem({
      ...itemToSave,
      id: itemToSave.id || crypto.randomUUID(),
    } as InventoryItem);
    closeInventoryModal();
  };
  const handleInventoryChange = (
    field: keyof Omit<InventoryItem, "id" | "stockByLocation">,
    value: string | number
  ) => {
    setCurrentInventoryItem((prev) => ({ ...prev, [field]: value }));
  };

  const handleStockInputChange = (
    itemId: string,
    location: string,
    value: string
  ) => {
    // Allow only digits and a single comma followed by at most one digit
    if (value && !/^\d*([,]\d{0,1})?$/.test(value)) {
      return;
    }
    setTempStockValues((prev) => ({
      ...prev,
      [`${itemId}-${location}`]: value,
    }));
  };

  const handleStockInputBlur = (item: InventoryItem, location: string) => {
    const tempValue = tempStockValues[`${item.id}-${location}`];
    if (tempValue !== undefined) {
      const newStock = parseDecimal(tempValue);
      const currentStock = item.stockByLocation[location] || 0;

      if (newStock !== currentStock) {
        const updatedStockByLocation = {
          ...item.stockByLocation,
          [location]: newStock,
        };
        onSaveInventoryItem({
          ...item,
          stockByLocation: updatedStockByLocation,
        });
      }

      setTempStockValues((prev) => {
        const newTemp = { ...prev };
        delete newTemp[`${item.id}-${location}`];
        return newTemp;
      });
    }
  };

  const calculateTotalStock = (item: InventoryItem) => {
    if (!item.stockByLocation) return 0;
    return Object.values(item.stockByLocation).reduce(
      (sum, val) => sum + (Number(val) || 0),
      0
    );
  };

  // ---- Order Modal Handlers ----
  const openOrderModal = (order?: PurchaseOrder) => {
    // Asegura que el coste sea 0
    const initialOrder = order
      ? {
          ...order,
          items: order.items.map((item) => ({
            ...item,
            costAtTimeOfPurchase: 0,
          })),
        }
      : emptyPurchaseOrder;

    setCurrentPurchaseOrder(initialOrder);

    const tempQs: Record<number, string> = {};
    initialOrder.items.forEach((item, index) => {
      tempQs[index] = item.quantity
        ? String(item.quantity).replace(".", ",")
        : "";
    });
    setTempOrderQuantities(tempQs);
    setOrderModalOpen(true);
  };
  const closeOrderModal = () => {
    setOrderModalOpen(false);
    setCurrentPurchaseOrder(emptyPurchaseOrder);
  };

  // MODIFICADO: handleSaveOrder
  const handleSaveOrder = () => {
    // 1. Prepara la Orden a Guardar (coste/total a 0). MANTENEMOS EL STATUS PENDING.
    const orderToSave = {
      ...currentPurchaseOrder,
      items: currentPurchaseOrder.items.map((item) => ({
        ...item,
        costAtTimeOfPurchase: 0,
      })),
      totalAmount: 0,
      status: PurchaseOrderStatus.Pending, // Mantiene el estado PENDING
    };

    // 2. Guarda el Pedido de Compra (a historial)
    onSavePurchaseOrder({
      id: (currentPurchaseOrder as PurchaseOrder).id || crypto.randomUUID(),
      ...orderToSave,
    });

    // 3. NO ACTUALIZAMOS EL STOCK AQUÍ. Solo se actualiza al recibir.

    alert(
      "Pedido guardado correctamente. Los artículos aparecerán en 'En Pedidos' hasta ser recibidos."
    );
    closeOrderModal();
  };

  // NUEVA FUNCIÓN: Recibir Pedido y Actualizar Stock
  const handleReceiveOrder = (order: PurchaseOrder) => {
    if (order.status === PurchaseOrderStatus.Completed) {
      alert("Este pedido ya fue recibido.");
      return;
    }

    if (
      !window.confirm(
        `¿Confirmar la recepción del pedido a ${order.supplierName} (${order.orderDate})? Esto sumará los artículos al stock de Almacén.`
      )
    ) {
      return;
    }

    // 1. Prepara la actualización del stock (sumar)
    const updatesForInventory: { name: string; stock: number }[] = order.items
      .map((orderItem) => {
        const itemDetails = inventoryItems.find(
          (item) => item.id === orderItem.inventoryItemId
        );
        if (!itemDetails || orderItem.quantity <= 0) return null;

        // Usamos la cantidad del pedido como el valor a sumar al stock
        return {
          name: itemDetails.name,
          stock: orderItem.quantity,
        };
      })
      .filter((u): u is { name: string; stock: number } => u !== null);

    // 2. Actualiza el stock (modo "add")
    if (updatesForInventory.length > 0) {
      onBulkUpdateInventoryItems(updatesForInventory, "add"); // <<< SUMA AL STOCK DE ALMACÉN
    }

    // 3. Actualiza el estado del pedido a Completado
    onSavePurchaseOrder({
      ...order,
      status: PurchaseOrderStatus.Completed,
      deliveryDate: new Date().toISOString().split("T")[0],
    });

    alert(
      `Pedido de ${order.supplierName} recibido y stock actualizado en Almacén.`
    );
  };

  const handleOrderChange = (
    field: keyof Omit<PurchaseOrder, "id" | "items">,
    value: string | PurchaseOrderStatus
  ) => {
    setCurrentPurchaseOrder((prev) => ({ ...prev, [field]: value }));
  };

  // ---- Order Items Handlers ----
  const addOrderItem = () => {
    // Inicializa costAtTimeOfPurchase a 0.
    // Importante: inventoryItemId se deja vacío ('') para que el renderOrderForm muestre el selector
    const newItem: OrderItem = {
      inventoryItemId: "",
      quantity: 1,
      costAtTimeOfPurchase: 0,
    };
    setCurrentPurchaseOrder((prev) => ({
      ...prev.items,
      items: [...prev.items, newItem],
    }));
  };

  const removeOrderItem = (index: number) => {
    setCurrentPurchaseOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleOrderQuantityChange = (index: number, value: string) => {
    if (value && !/^\d*[,]?\d*$/.test(value)) {
      return;
    }
    setTempOrderQuantities((prev) => ({ ...prev, [index]: value }));

    const newItems = [...currentPurchaseOrder.items];
    const parsedQuantity = parseDecimal(value);
    if (newItems[index].quantity !== parsedQuantity) {
      newItems[index] = { ...newItems[index], quantity: parsedQuantity };
      setCurrentPurchaseOrder((prev) => ({ ...prev, items: newItems }));
    }
  };

  const handleOrderItemChange = (
    index: number,
    field: "inventoryItemId",
    value: string
  ) => {
    const newItems = [...currentPurchaseOrder.items];
    const itemToUpdate = { ...newItems[index], [field]: value };
    newItems[index] = itemToUpdate;
    setCurrentPurchaseOrder((prev) => ({ ...prev, items: newItems }));
  };

  // ---- Google Drive Simulation Handlers ----
  const handleFileSelect = (file: { id: string; name: string }) => {
    setConnectedFile(file);
    setDriveModalOpen(false);
  };

  const handleSync = () => {
    if (!connectedFile) return;

    setIsSyncing(true);
    // Simulate network delay
    setTimeout(() => {
      const fileContent = mockFileContents[connectedFile.id];
      const lines = fileContent
        .split("\n")
        .filter((line) => line.trim() !== "");
      const updates = lines
        .map((line) => {
          const [name, stockStr] = line.split(",").map((s) => s.trim());
          const stock = parseFloat(stockStr);
          return { name, stock: isNaN(stock) ? 0 : stock };
        })
        .filter((u) => u.name);

      if (updates.length > 0) {
        onBulkUpdateInventoryItems(updates, "set");
      }
      setIsSyncing(false);
    }, 1000);
  };

  // ---- Analysis Handlers ----
  const stockInOrders = useMemo(() => {
    const pending: { [key: string]: number } = {};
    // MODIFICADO: Solo se consideran pedidos PENDIENTES para la columna "En Pedidos"
    purchaseOrders
      .filter((o) => o.status === PurchaseOrderStatus.Pending)
      .forEach((o) => {
        o.items.forEach((item) => {
          pending[item.inventoryItemId] =
            (pending[item.inventoryItemId] || 0) + item.quantity;
        });
      });
    return pending;
  }, [purchaseOrders]);

  const handleEndStockChange = (itemId: string, value: string) => {
    // Allow only digits and a single comma followed by at most one digit
    if (value && !/^\d*([,]\d{0,1})?$/.test(value)) {
      return;
    }
    setEndOfWeekStock((prev) => ({ ...prev, [itemId]: value }));
  };

  // --- Guardar Análisis de Consumo (Pestaña Análisis) ---
  const handleSaveCurrentInventory = () => {
    if (inventoryItems.length === 0) {
      alert("No hay artículos en el inventario para guardar.");
      return;
    }

    if (!analysisDate) {
      alert("Por favor, selecciona la fecha del análisis.");
      return;
    }

    const updatesForInventory: { name: string; stock: number }[] = [];

    const recordItems: InventoryRecordItem[] = inventoryItems.map((item) => {
      const totalStock = calculateTotalStock(item);
      const pendingStock = stockInOrders[item.id] || 0;
      const initialTotalStock = totalStock + pendingStock;
      const endStock = parseDecimal(endOfWeekStock[item.id] || "0");
      const consumption = initialTotalStock - endStock;

      // 1. Prepara la actualización del stock principal (Solo si se introdujo un valor)
      if (
        endOfWeekStock[item.id] !== undefined &&
        endOfWeekStock[item.id].length > 0
      ) {
        updatesForInventory.push({
          name: item.name,
          stock: endStock, // El stock final observado (endStock) se convierte en el nuevo stock de Almacén
        });
      }

      return {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        currentStock: totalStock,
        pendingStock: pendingStock,
        initialStock: initialTotalStock,
        endStock: endStock,
        consumption: consumption,
      };
    });

    // 2. Guarda el nuevo estado del inventario (actualiza el stock real)
    if (updatesForInventory.length > 0) {
      onBulkUpdateInventoryItems(updatesForInventory, "set"); // Modo "set" para establecer el stock
    }

    // 3. Guarda el Análisis en el Historial con la etiqueta específica
    const formattedDate = new Date(analysisDate).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const newRecord: InventoryRecord = {
      id: crypto.randomUUID(),
      date: new Date(analysisDate).toISOString(),
      label: `Análisis de consumo (${formattedDate})`, // ETIQUETA: Análisis de Consumo
      items: recordItems,
      type: "analysis", // Añadido para diferenciar
    };

    onSaveInventoryRecord(newRecord);
    alert(
      `Análisis de consumo (${formattedDate}) guardado y el stock actualizado correctamente.`
    );

    // 4. Resetear los valores de entrada para la próxima semana
    setEndOfWeekStock({});
  };

  // --- Guardar Inventario (Snapshot - Pestaña Inventario) ---
  const handleSaveInventorySnapshot = () => {
    if (inventoryItems.length === 0) {
      alert("No hay artículos en el inventario para guardar.");
      return;
    }

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Items para resetear el stock
    const updatesToReset: { name: string; stock: number }[] = [];

    // 1. CREAMOS EL REGISTRO (con el stock actual)
    const recordItems: InventoryRecordItem[] = inventoryItems.map((item) => {
      const totalStock = calculateTotalStock(item);
      const pendingStock = stockInOrders[item.id] || 0;

      // Prepara la actualización para resetear el stock a 0
      // Nota: solo reseteamos el stock del almacén (ubicación principal) si está siendo usado
      updatesToReset.push({
        name: item.name,
        stock: 0,
      });

      // Capturamos el estado actual por ubicación
      return {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        currentStock: totalStock,
        pendingStock: pendingStock,
        initialStock: totalStock,
        endStock: totalStock,
        consumption: 0,
        stockByLocationSnapshot: item.stockByLocation || {}, // Capturamos el detalle por ubicación
      };
    });

    const newRecord: InventoryRecord = {
      id: crypto.randomUUID(),
      date: currentDate.toISOString(),
      label: `Inventario (${formattedDate})`, // ETIQUETA: Inventario (Snapshot)
      items: recordItems,
      type: "snapshot", // Añadido para diferenciar
    };

    // 2. Guarda la instantánea en el historial
    onSaveInventoryRecord(newRecord);

    // 3. Resetea el stock del Almacén de todos los artículos a 0
    if (updatesToReset.length > 0) {
      onBulkUpdateInventoryItems(updatesToReset, "set");
    }

    alert(
      `Instantánea del inventario (${formattedDate}) guardada en el historial y stocks reseteados a 0.`
    );
  };

  // ---- HANDLER PARA BORRADO COMPLETO DEL HISTORIAL ----
  const handleDeleteAllHistory = () => {
    if (validInventoryHistory.length === 0) {
      alert("El historial ya está vacío.");
      return;
    }

    if (
      window.confirm(
        "ADVERTENCIA: ¿Está seguro de que desea eliminar TODO el historial de inventario y análisis de consumo? Esta acción es irreversible."
      )
    ) {
      onDeleteAllInventoryRecords();
      alert("Historial eliminado correctamente.");
    }
  };

  // ---- RENDERIZADO DE DETALLES DEL HISTORIAL (FIX de Issue 2) ----
  const closeRecordDetailModal = () => {
    setViewingRecord(null);
  };

  const openRecordDetailModal = (record: InventoryRecord) => {
    setViewingRecord(record);
  };

  const renderInventoryRecordDetailModal = () => {
    if (!viewingRecord) return null;

    const isAnalysis = viewingRecord.type === "analysis";

    // Tabla para Análisis de Consumo (Stock Inicial, Stock Final, Consumo)
    const renderAnalysisTable = () => (
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700/50">
          <tr>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase">
              Artículo
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase">
              Stock Inicial
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase">
              Stock Final
            </th>
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase">
              Consumo
            </th>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase">
              Unidad
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {viewingRecord.items.map((item, itemIndex) => (
            <tr key={item.itemId || itemIndex}>
              <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-white">
                {item.name}
              </td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-blue-400">
                {item.initialStock !== undefined
                  ? item.initialStock.toFixed(1).replace(".", ",")
                  : "-"}
              </td>
              <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-yellow-400">
                {item.endStock !== undefined
                  ? item.endStock.toFixed(1).replace(".", ",")
                  : "-"}
              </td>
              <td
                className={`px-2 py-2 whitespace-nowrap text-sm text-right font-bold ${
                  item.consumption !== undefined && item.consumption >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {item.consumption !== undefined
                  ? item.consumption.toFixed(1).replace(".", ",")
                  : "-"}
              </td>
              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-400">
                {item.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );

    // Tabla para Instantánea (Desglose por Ubicación)
    const renderSnapshotTable = () => (
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700/50">
          <tr>
            <th className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase sticky left-0 bg-gray-700/50 z-10">
              Artículo
            </th>
            {INVENTORY_LOCATIONS.map((loc) => (
              <th
                key={loc}
                className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase"
              >
                {loc.replace("Office Rest", "Office R")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {viewingRecord.items.map((item, itemIndex) => (
            <tr key={item.itemId || itemIndex} className="hover:bg-gray-700/50">
              <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-white sticky left-0 bg-gray-800 z-10">
                {item.name}
              </td>
              {INVENTORY_LOCATIONS.map((loc) => (
                <td
                  key={loc}
                  className="px-2 py-2 whitespace-nowrap text-sm text-right text-white"
                >
                  {item.stockByLocationSnapshot?.[loc] !== undefined
                    ? item.stockByLocationSnapshot[loc]
                        .toFixed(1)
                        .replace(".", ",")
                    : "0.0"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );

    return (
      <Modal
        title={`Detalle: ${viewingRecord.label}`}
        onClose={closeRecordDetailModal}
        onSave={closeRecordDetailModal}
        hideSaveButton={true}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <p className="text-sm text-slate-400 mb-4">
            Registrado el{" "}
            {new Date(viewingRecord.date).toLocaleString("es-ES", {
              dateStyle: "long",
              timeStyle: "short",
            })}
            .
          </p>
          <div className="overflow-x-auto">
            {isAnalysis ? renderAnalysisTable() : renderSnapshotTable()}
          </div>
        </div>
      </Modal>
    );
  };

  const tabClasses = (
    tabName: "inventory" | "orders" | "analysis" | "history"
  ) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
      activeTab === tabName
        ? "bg-indigo-600 text-white"
        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
    }`;

  const renderInventoryForm = () => (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Nombre del Artículo"
        value={currentInventoryItem.name || ""}
        onChange={(e) => handleInventoryChange("name", e.target.value)}
        className="bg-gray-700 text-white rounded p-2 w-full"
      />
      <input
        type="text"
        placeholder="Categoría"
        value={currentInventoryItem.category || ""}
        onChange={(e) => handleInventoryChange("category", e.target.value)}
        className="bg-gray-700 text-white rounded p-2 w-full"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Unidad (kg, l, uds.)"
          value={currentInventoryItem.unit || ""}
          onChange={(e) => handleInventoryChange("unit", e.target.value)}
          className="bg-gray-700 text-white rounded p-2 w-full"
        />
      </div>
    </div>
  );

  const renderOrderForm = () => {
    const isNewOrder = !("id" in currentPurchaseOrder);
    return (
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Se mantiene solo la fecha del pedido */}
          <input
            type="date"
            value={currentPurchaseOrder.orderDate}
            onChange={(e) => handleOrderChange("orderDate", e.target.value)}
            className="bg-gray-700 text-white rounded p-2 w-full"
          />
          <div className="relative">
            <input
              type="text"
              list="supplier-list"
              placeholder="Proveedor"
              value={currentPurchaseOrder.supplierName}
              onChange={(e) =>
                handleOrderChange("supplierName", e.target.value)
              }
              className="bg-gray-700 text-white rounded p-2 w-full"
            />
            <datalist id="supplier-list">
              {suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          {/* Se eliminó el campo de fecha de entrega y estado */}
        </div>

        <h3 className="text-lg font-bold text-white pt-4">
          Artículos del Pedido
        </h3>

        {/* Buscador de productos */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Buscar producto para añadir..."
            value={orderSearchTerm}
            onChange={(e) => setOrderSearchTerm(e.target.value)}
            className="bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 w-full border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
          />
        </div>

        {/* Resultado de búsqueda / Quick-Add */}
        {orderSearchTerm && filteredOrderItems.length > 0 && (
          <div className="bg-slate-900/50 rounded-md p-2 space-y-1">
            {filteredOrderItems.slice(0, 5).map((item) => {
              // Verifica si el artículo ya está en el pedido
              const isAlreadyInOrder = currentPurchaseOrder.items.some(
                (oi) => oi.inventoryItemId === item.id
              );

              // Si ya está en el pedido, no ofrecemos el botón de añadir.
              if (isAlreadyInOrder) return null;

              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-2 hover:bg-slate-700/50 rounded-sm"
                >
                  <span className="text-white text-sm">
                    {item.name} ({item.unit})
                  </span>
                  <button
                    onClick={() => {
                      const newItem: OrderItem = {
                        inventoryItemId: item.id,
                        quantity: 1,
                        costAtTimeOfPurchase: 0,
                      };
                      setCurrentPurchaseOrder((prev) => ({
                        ...prev,
                        items: [...prev.items, newItem],
                      }));
                      setOrderSearchTerm(""); // Limpia el buscador al añadir
                    }}
                    className="p-1 bg-indigo-600 hover:bg-indigo-700 rounded text-white text-xs"
                  >
                    Añadir
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Mapea los artículos actualmente en el pedido (incluyendo los añadidos manualmente) */}
        {currentPurchaseOrder.items.map((orderItem, index) => {
          const itemDetails = inventoryItems.find(
            (item) => item.id === orderItem.inventoryItemId
          );

          return (
            <div
              key={index}
              className="flex gap-2 items-center p-2 bg-gray-900/50 rounded-md"
            >
              {orderItem.inventoryItemId && itemDetails ? (
                // Muestra el nombre y la unidad si el ID está seleccionado
                <span className="text-white w-1/3 flex-shrink-0">
                  {itemDetails.name} ({itemDetails.unit})
                </span>
              ) : (
                // Muestra el selector si el ID está vacío (recién añadido manualmente)
                <select
                  value={orderItem.inventoryItemId}
                  onChange={(e) =>
                    handleOrderItemChange(
                      index,
                      "inventoryItemId",
                      e.target.value
                    )
                  }
                  className="bg-gray-700 text-white rounded p-2 flex-grow"
                >
                  <option value="">Seleccionar Artículo</option>
                  {inventoryItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Campo de cantidad */}
              <input
                type="text"
                placeholder="Cantidad"
                value={tempOrderQuantities[index] ?? ""}
                onChange={(e) =>
                  handleOrderQuantityChange(index, e.target.value)
                }
                className="bg-gray-700 text-white rounded p-2 w-24"
              />

              {/* Campo de coste invisible */}
              <div className="relative w-28 invisible">
                <input
                  type="text"
                  disabled
                  className="bg-gray-700 text-white rounded p-2 w-full pr-8"
                  value={"0,00"}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">
                  €
                </span>
              </div>

              {/* Botón de eliminar */}
              <button
                onClick={() => removeOrderItem(index)}
                className="p-2 bg-red-600 rounded text-white"
              >
                <TrashIcon />
              </button>
            </div>
          );
        })}

        {/* Botón para añadir una fila de selección manual */}
        <button
          onClick={addOrderItem}
          className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
        >
          + Añadir Artículo (manualmente)
        </button>
      </div>
    );
  };

  const renderDriveModal = () => (
    <div className="space-y-3">
      <p className="text-gray-300">
        Seleccione el archivo de Google Sheets para sincronizar el stock.
      </p>
      <div className="space-y-2">
        {mockDriveFiles.map((file) => (
          <button
            key={file.id}
            onClick={() => handleFileSelect(file)}
            className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-3"
          >
            <GoogleDriveIcon />
            {file.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Gestión de Inventario</h1>
        <div className="flex gap-2">
          <div className="bg-gray-800 p-1 rounded-lg flex space-x-1">
            <button
              onClick={() => setActiveTab("inventory")}
              className={tabClasses("inventory")}
            >
              Inventario
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={tabClasses("orders")}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
              className={tabClasses("analysis")}
            >
              Análisis
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={tabClasses("history")}
            >
              Historial
            </button>
          </div>
        </div>
      </div>

      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            {/* Search Bar */}
            <div className="relative w-full md:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar bebida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 w-full border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
              />
            </div>

            <div className="flex justify-end items-center gap-2 flex-wrap w-full md:w-auto">
              {/* --- Drive Integration UI --- */}
              {!connectedFile ? (
                <button
                  onClick={() => setDriveModalOpen(true)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
                >
                  <GoogleDriveIcon />{" "}
                  <span className="hidden sm:inline">Conectar Drive</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-gray-800 p-1 rounded-lg">
                  <span className="text-green-400 text-sm px-2">
                    Conectado:{" "}
                    <span className="font-semibold">{connectedFile.name}</span>
                  </span>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded text-sm flex items-center gap-2 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSyncing ? "..." : "Sincronizar"}
                  </button>
                  <button
                    onClick={() => setConnectedFile(null)}
                    className="bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-sm font-bold"
                  >
                    X
                  </button>
                </div>
              )}
              <button
                onClick={handleSaveInventorySnapshot}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
              >
                <InventoryIcon />{" "}
                <span className="hidden sm:inline">Guardar Inventario</span>
              </button>
              <button
                onClick={() => openInventoryModal(undefined)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
              >
                <PlusIcon />{" "}
                <span className="hidden sm:inline">Nuevo Artículo</span>
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(groupedItems)
              .sort(([catA], [catB]) => {
                const indexA = CATEGORY_ORDER.indexOf(catA);
                const indexB = CATEGORY_ORDER.indexOf(catB);

                // If both are in the custom order list, sort by that order
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // If only A is in the list, it comes first
                if (indexA !== -1) return -1;
                // If only B is in the list, it comes first
                if (indexB !== -1) return 1;

                // If neither are in the list, sort alphabetically
                return catA.localeCompare(catB);
              })
              .map(([category, items]) => (
                <CategoryAccordion
                  key={category}
                  title={category}
                  itemCount={items.length}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase sticky left-0 bg-slate-800 z-10">
                            Nombre
                          </th>
                          {INVENTORY_LOCATIONS.map((loc) => (
                            <th
                              className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase"
                              key={loc}
                            >
                              {loc}
                            </th>
                          ))}
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">
                            Total
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-700/50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-white sticky left-0 bg-slate-800 z-10">
                              {item.name}
                            </td>
                            {INVENTORY_LOCATIONS.map((loc) => (
                              <td
                                key={loc}
                                className="px-2 py-1 whitespace-nowrap"
                              >
                                <input
                                  type="text"
                                  value={
                                    tempStockValues[`${item.id}-${loc}`] !==
                                    undefined
                                      ? tempStockValues[`${item.id}-${loc}`]
                                      : item.stockByLocation?.[loc]
                                      ? String(
                                          item.stockByLocation[loc]
                                        ).replace(".", ",")
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleStockInputChange(
                                      item.id,
                                      loc,
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => handleStockInputBlur(item, loc)}
                                  className="bg-slate-700 text-white rounded p-1 w-20 text-center border border-slate-600"
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td className="px-4 py-2 whitespace-nowrap text-2xl text-green-400 font-bold">
                              {calculateTotalStock(item)
                                .toFixed(1)
                                .replace(".", ",")}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm">
                              <button
                                onClick={() => openInventoryModal(item)}
                                className="text-indigo-400 mr-4"
                              >
                                <PencilIcon />
                              </button>
                              <button
                                onClick={() =>
                                  window.confirm(
                                    "¿Seguro que quieres eliminar este artículo?"
                                  ) && onDeleteInventoryItem(item.id)
                                }
                                className="text-red-500"
                              >
                                <TrashIcon />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CategoryAccordion>
              ))}
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div>
          <div className="text-right mb-4">
            <button
              onClick={() => openOrderModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300 ml-auto"
            >
              <PlusIcon />{" "}
              <span className="hidden sm:inline">Nuevo Pedido</span>
            </button>
          </div>
          <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Fecha Pedido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                    Acciones
                  </th>{" "}
                  {/* MONTO TOTAL ELIMINADO */}
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {purchaseOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {order.orderDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {order.supplierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === PurchaseOrderStatus.Completed
                            ? "bg-green-500/20 text-green-400"
                            : order.status === PurchaseOrderStatus.Pending
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {order.status}
                      </span>
                      {/* NUEVO BOTÓN RECIBIR */}
                      {order.status === PurchaseOrderStatus.Pending && (
                        <button
                          onClick={() => handleReceiveOrder(order)}
                          className="ml-4 px-2 py-1 bg-green-600/30 text-green-400 hover:bg-green-600 hover:text-white rounded text-xs font-bold transition duration-300"
                        >
                          Recibir
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => openOrderModal(order)}
                        className="text-indigo-400 mr-4"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() =>
                          window.confirm(
                            "¿Seguro que quieres eliminar este pedido?"
                          ) && onDeletePurchaseOrder(order.id)
                        }
                        className="text-red-500"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "analysis" && (
        <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold text-white">
              Análisis de Consumo Semanal
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <label
                htmlFor="analysisDate"
                className="text-sm font-medium text-gray-300"
              >
                Fecha:
              </label>
              <input
                id="analysisDate"
                type="date"
                value={analysisDate}
                onChange={(e) => setAnalysisDate(e.target.value)}
                className="bg-gray-700 text-white rounded p-2 w-40 border border-gray-600"
              />
              <button
                onClick={handleSaveCurrentInventory}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
              >
                Guardar Análisis en Historial
              </button>
            </div>
          </div>
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Artículo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Stock Actual
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  En Pedidos
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Stock Inicial Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Stock Fin de Semana
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Consumo
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {inventoryItems.map((item) => {
                const totalStock = calculateTotalStock(item);
                const pendingStock = stockInOrders[item.id] || 0;
                const initialTotalStock = totalStock + pendingStock;
                const endStock = parseDecimal(endOfWeekStock[item.id] || "0");
                const consumption = initialTotalStock - endStock;

                return (
                  <tr key={item.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {totalStock.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400">
                      {pendingStock.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-400 font-bold">
                      {initialTotalStock.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <input
                        type="text"
                        value={endOfWeekStock[item.id] || ""}
                        onChange={(e) =>
                          handleEndStockChange(item.id, e.target.value)
                        }
                        className="bg-gray-700 text-white rounded p-2 w-28 border border-gray-600"
                        placeholder="0"
                      />
                    </td>
                    <td
                      className={`px-4 py-4 whitespace-nowrap text-sm font-bold ${
                        consumption >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {consumption.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-gray-800 shadow-xl rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">
              Historial de Inventarios Guardados 📊
            </h2>
            <button
              onClick={handleDeleteAllHistory}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
            >
              <TrashIcon /> Borrar Historial Completo
            </button>
          </div>

          {/* Componente de análisis semanal */}
          <WeeklyConsumptionAnalysis inventoryHistory={validInventoryHistory} />

          <h3 className="text-xl font-bold text-white mb-3 mt-8 border-t border-gray-700 pt-4">
            Registros Anteriores
          </h3>

          {validInventoryHistory.length > 0 ? (
            <ul className="space-y-3">
              {validInventoryHistory.map((record: InventoryRecord) => (
                <li
                  key={record.id}
                  className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors"
                >
                  <div>
                    {/* Utiliza la etiqueta guardada */}
                    <p className="font-semibold text-white">{record.label}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(record.date).toLocaleString("es-ES", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openRecordDetailModal(record)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10 text-slate-500">
              <p>No hay análisis guardados en el historial.</p>
              <p className="text-sm mt-2">
                Ve a la pestaña de 'Análisis' para guardar el estado actual del
                inventario.
              </p>
            </div>
          )}
        </div>
      )}

      {isInventoryModalOpen && (
        <Modal
          title={currentInventoryItem.id ? "Editar Artículo" : "Nuevo Artículo"}
          onClose={closeInventoryModal}
          onSave={handleSaveInventory}
        >
          {renderInventoryForm()}
        </Modal>
      )}

      {isOrderModalOpen && (
        <Modal
          title={
            "id" in currentPurchaseOrder ? "Editar Pedido" : "Nuevo Pedido"
          }
          onClose={closeOrderModal}
          onSave={handleSaveOrder}
        >
          {renderOrderForm()}
        </Modal>
      )}

      {/* Modal para mostrar los detalles del historial */}
      {viewingRecord && renderInventoryRecordDetailModal()}

      {isDriveModalOpen && (
        <Modal
          title="Conectar con Google Drive"
          onClose={() => setDriveModalOpen(false)}
          onSave={() => {}}
        >
          {renderDriveModal()}
        </Modal>
      )}
    </div>
  );
};

export default InventoryComponent;
