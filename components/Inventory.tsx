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
  ChevronDownIcon,
  SearchIcon,
  InventoryIcon,
  RefreshIcon,
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
  onBulkUpdateInventoryItems: (
    updates: { name: string; stock: number }[],
    mode: "set" | "add"
  ) => void;
  onSaveInventoryRecord: (record: InventoryRecord) => void;
  onDeleteAllInventoryRecords: () => void; // NUEVAS PROPS:
  formatUTCToLocal: (utcDateString: string | Date | undefined) => string;
  handleResetInventoryStocks: () => void;
}

const emptyInventoryItem: Omit<InventoryItem, "id" | "stockByLocation"> = {
  name: "",
  category: "",
};

const emptyPurchaseOrder: Omit<PurchaseOrder, "id"> = {
  orderDate: new Date().toISOString().split("T")[0],
  supplierName: "",
  items: [],
  status: PurchaseOrderStatus.Pending,
  totalAmount: 0,
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

// --- Local Components (Se mantienen) ---

interface CategoryAccordionProps {
  title: string;
  children: React.ReactNode;
  itemCount: number;
  initialOpen?: boolean;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  title,
  children,
  itemCount,
  initialOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg">
           {" "}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-bold text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
        aria-expanded={isOpen}
      >
               {" "}
        <div className="flex items-center gap-3">
                    <span>{title}</span>         {" "}
          <span className="text-xs font-normal bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                        {itemCount} items          {" "}
          </span>
                 {" "}
        </div>
               {" "}
        <ChevronDownIcon
          className={`h-6 w-6 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
             {" "}
      </button>
           {" "}
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
               {" "}
        <div className="overflow-hidden">
                   {" "}
          <div className="p-2 border-t border-slate-700">{children}</div>       {" "}
        </div>
             {" "}
      </div>
         {" "}
    </div>
  );
};

interface WeeklyConsumptionAnalysisProps {
  inventoryHistory: InventoryRecord[];
  formatUTCToLocal: (utcDateString: string | Date | undefined) => string;
}

const WeeklyConsumptionAnalysis: React.FC<WeeklyConsumptionAnalysisProps> = ({
  inventoryHistory,
  formatUTCToLocal,
}) => {
  const lastRecord = useMemo(() => {
    if (!inventoryHistory || inventoryHistory.length === 0) return null;

    return (inventoryHistory as InventoryRecord[]).find(
      (r) => r.type === "analysis"
    );
  }, [inventoryHistory]);

  if (!lastRecord) {
    return (
      <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-lg">
               {" "}
        <p>
                    Se necesita al menos **un registro de análisis** para
          mostrar el           análisis de consumo.        {" "}
        </p>
               {" "}
        <p className="text-sm mt-2">
                    Guarda el inventario actual en la pestaña de 'Análisis'.    
             {" "}
        </p>
             {" "}
      </div>
    );
  }

  const consumptionItems = lastRecord.items.filter(
    (item) => item.consumption > 0.001
  );

  return (
    <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto p-4 mb-6">
           {" "}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
               {" "}
        <h2 className="text-xl font-bold text-white">
                    Consumo de la Última Semana (Finalizado en:          {" "}
          {formatUTCToLocal(lastRecord.date)})        {" "}
        </h2>
             {" "}
      </div>
           {" "}
      {consumptionItems.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-700">
                   {" "}
          <thead className="bg-gray-700/50">
                       {" "}
            <tr>
                           {" "}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                Artículo              {" "}
              </th>
                           {" "}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                Cantidad Gastada              {" "}
              </th>
                         {" "}
            </tr>
                     {" "}
          </thead>
                   {" "}
          <tbody className="bg-gray-800 divide-y divide-gray-700">
                       {" "}
            {consumptionItems.map((item) => (
              <tr key={item.itemId} className="hover:bg-gray-700/50">
                               {" "}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                                    {item.name}               {" "}
                </td>
                               {" "}
                <td className="px-4 py-4 whitespace-nowrap text-lg font-bold text-red-400">
                                   {" "}
                  {item.consumption.toFixed(1).replace(".", ",")}               {" "}
                </td>
                             {" "}
              </tr>
            ))}
                     {" "}
          </tbody>
                 {" "}
        </table>
      ) : (
        <div className="text-center py-5 text-slate-500">
                   {" "}
          <p>No hay artículos con consumo registrado en este análisis.</p>     
           {" "}
        </div>
      )}
         {" "}
    </div>
  );
};

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
  onDeleteAllInventoryRecords,
  formatUTCToLocal,
  handleResetInventoryStocks,
}) => {
  const [activeTab, setActiveTab] = useState<
    "inventory" | "orders" | "analysis" | "history"
  >("inventory");

  const [isInventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [currentInventoryItem, setCurrentInventoryItem] =
    useState<Partial<InventoryItem>>(emptyInventoryItem);

  const [isOrderModalOpen, setOrderModalOpen] = useState(false);
  const [currentPurchaseOrder, setCurrentPurchaseOrder] = useState<
    PurchaseOrder | Omit<PurchaseOrder, "id">
  >(emptyPurchaseOrder);
  const [tempOrderQuantities, setTempOrderQuantities] = useState<
    Record<number, string>
  >({});

  const [tempStockValues, setTempStockValues] = useState<
    Record<string, string>
  >({});

  const [analysisDate, setAnalysisDate] = useState("");
  const [snapshotDate, setSnapshotDate] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [orderSearchTerm, setOrderSearchTerm] = useState("");

  const [viewingRecord, setViewingRecord] = useState<InventoryRecord | null>(
    null
  );

  const calculateTotalStock = (item: InventoryItem) => {
    if (!item.stockByLocation) return 0;
    return Object.values(item.stockByLocation).reduce(
      (sum, val) => sum + (Number(val) || 0),
      0
    );
  };

  const validInventoryHistory = useMemo(() => {
    return (Array.isArray(inventoryHistory) ? inventoryHistory : []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ) as InventoryRecord[];
  }, [inventoryHistory]);

  const stockInOrders = useMemo(() => {
    const pending: { [key: string]: number } = {};
    purchaseOrders
      .filter((o) => o.status === PurchaseOrderStatus.Completed)
      .forEach((o) => {
        o.items.forEach((item) => {
          pending[item.inventoryItemId] =
            (pending[item.inventoryItemId] || 0) + item.quantity;
        });
      });
    return pending;
  }, [purchaseOrders]);

  const lastRecord = useMemo(() => {
    const analysisRecord = validInventoryHistory.find(
      (r) => r.type === "analysis"
    );
    if (analysisRecord) return analysisRecord;

    const snapshotRecord = validInventoryHistory.find(
      (r) => r.type === "snapshot"
    );
    return snapshotRecord;
  }, [validInventoryHistory]);

  const initialStockMap = useMemo(() => {
    if (!lastRecord) return new Map<string, number>();

    return new Map<string, number>(
      lastRecord.items.map((item) => [
        item.itemId,
        item.endStock || item.initialStock || 0,
      ])
    );
  }, [lastRecord]);

  useEffect(() => {
    if (!isOrderModalOpen) return; // Asegurar que el totalAmount se resetee o se mantenga 0
    setCurrentPurchaseOrder((prev) => ({ ...prev, totalAmount: 0 }));
  }, [currentPurchaseOrder.items, isOrderModalOpen]);

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

  const analysisGroupedItems = useMemo(() => {
    const groups: { [key: string]: typeof inventoryItems } = {};

    inventoryItems.forEach((item) => {
      const category = item.category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });

    const sortedGroups = Object.entries(groups).sort(([catA], [catB]) => {
      const indexA = CATEGORY_ORDER.indexOf(catA);
      const indexB = CATEGORY_ORDER.indexOf(catB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return catA.localeCompare(catB);
    });

    return sortedGroups.map(([category, items]) => {
      const categoryTotalRelevantStock = items.reduce((sum, item) => {
        const currentStock = calculateTotalStock(item);
        const pendingStock = stockInOrders[item.id] || 0;
        return sum + currentStock + pendingStock;
      }, 0);
      return { category, items, categoryTotalRelevantStock };
    });
  }, [inventoryItems, stockInOrders]); // ---- Inventory Modal Handlers (Se mantienen) ----

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
  }; // ---- Order Modal Handlers ----

  const openOrderModal = (order?: PurchaseOrder) => {
    const initialOrder: PurchaseOrder | Omit<PurchaseOrder, "id"> = order
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
    setTempOrderQuantities({}); // Limpiar cantidades temporales
  }; // 🛑 CORRECCIÓN: Generar ID y asegurar el tipo final antes de guardar.

  const handleSaveOrder = () => {
    const hasValidItems = currentPurchaseOrder.items.every(
      (item) => item.quantity > 0.001 && item.inventoryItemId.trim() !== ""
    );
    const hasSupplierName = currentPurchaseOrder.supplierName.trim() !== "";

    if (!hasValidItems || !hasSupplierName) {
      alert(
        "Por favor, introduce el proveedor y asegúrate de que todos los artículos tienen cantidad positiva y están seleccionados."
      );
      return;
    }

    const orderToSave: PurchaseOrder = {
      ...currentPurchaseOrder,
      id: (currentPurchaseOrder as PurchaseOrder).id || crypto.randomUUID(),
      status: (currentPurchaseOrder as PurchaseOrder).id
        ? currentPurchaseOrder.status
        : PurchaseOrderStatus.Pending,
      totalAmount: 0,
    } as PurchaseOrder;

    onSavePurchaseOrder(orderToSave);

    alert(
      "Pedido guardado correctamente. Los artículos aparecerán en 'En Pedidos' hasta ser recibidos."
    );
    closeOrderModal();
  };

  const handleReceiveOrder = (order: PurchaseOrder) => {
    if (
      order.status === PurchaseOrderStatus.Completed ||
      order.status === PurchaseOrderStatus.Archived
    ) {
      alert("Este pedido ya fue recibido.");
      return;
    }

    if (
      !window.confirm(
        `¿Confirmar la recepción del pedido a ${order.supplierName} (${order.orderDate})? Esto actualizará el estado a 'Completed' y las cantidades AHORA se reflejarán en la columna \"En Pedidos\" del Análisis.`
      )
    ) {
      return;
    }

    onSavePurchaseOrder({
      ...order,
      status: PurchaseOrderStatus.Completed,
      deliveryDate: new Date().toISOString().split("T")[0],
    } as PurchaseOrder);
  };

  const handleOrderChange = (
    field: keyof Omit<PurchaseOrder, "id" | "items">,
    value: string | PurchaseOrderStatus
  ) => {
    setCurrentPurchaseOrder((prev) => ({ ...prev, [field]: value }));
  }; // ---- Order Items Handlers ---- // 🛑 CORRECCIÓN: Se asegura la actualización de quantities para el nuevo índice

  const handleAddProductFromSearch = (item: InventoryItem) => {
    const isAlreadyInOrder = currentPurchaseOrder.items.some(
      (oi) => oi.inventoryItemId === item.id
    );

    if (isAlreadyInOrder) return;

    const newItem: OrderItem = {
      inventoryItemId: item.id,
      quantity: 1,
      costAtTimeOfPurchase: 0,
    };

    setCurrentPurchaseOrder((prev) => {
      const newItemsList = [...prev.items, newItem];
      const newIndex = newItemsList.length - 1;

      setTempOrderQuantities((prevTemp) => ({
        ...prevTemp,
        [newIndex]: "1",
      }));
      return { ...prev, items: newItemsList };
    });

    setOrderSearchTerm("");
  }; // 🛑 CORRECCIÓN: Se asegura la actualización de quantities para el nuevo índice

  const addOrderItem = () => {
    const newItem: OrderItem = {
      inventoryItemId: "",
      quantity: 1,
      costAtTimeOfPurchase: 0,
    };
    const newIndex = currentPurchaseOrder.items.length;
    setCurrentPurchaseOrder((prev) => {
      const newItemsList = [...prev.items, newItem];
      setTempOrderQuantities((prevValues) => ({
        ...prevValues,
        [newIndex]: "1",
      }));
      return { ...prev, items: newItemsList };
    });
  }; // 🛑 CORRECCIÓN: Re-indexa tempOrderQuantities después de la eliminación.

  const removeOrderItem = (index: number) => {
    setCurrentPurchaseOrder((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      setTempOrderQuantities((prevTemp) => {
        const newTemp: Record<number, string> = {};
        newItems.forEach((item, newIndex) => {
          const oldIndex = prev.items.indexOf(item);
          newTemp[newIndex] =
            prevTemp[oldIndex] || String(item.quantity).replace(".", ",");
        });
        return newTemp;
      });
      return { ...prev, items: newItems };
    });
  };

  const handleOrderQuantityChange = (index: number, value: string) => {
    if (value && !/^\d*[,]?\d*$/.test(value)) {
      return;
    }
    setTempOrderQuantities((prev) => ({ ...prev, [index]: value }));

    const parsedQuantity = parseDecimal(value);
    setCurrentPurchaseOrder((prev) => {
      const newItems = [...prev.items]; // Corregido el acceso al array, asegurando que existe antes de actualizar
      if (newItems[index] && newItems[index].quantity !== parsedQuantity) {
        newItems[index] = { ...newItems[index], quantity: parsedQuantity };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleOrderItemChange = (
    index: number,
    field: "inventoryItemId",
    value: string
  ) => {
    // Validación para evitar duplicados si se selecciona manualmente
    const isAlreadyInOrder = currentPurchaseOrder.items.some(
      (oi, i) => i !== index && oi.inventoryItemId === value
    );

    if (isAlreadyInOrder) {
      alert("Este artículo ya ha sido añadido a la lista.");
      return;
    }

    const newItems = [...currentPurchaseOrder.items];
    const itemToUpdate = { ...newItems[index], [field]: value };
    newItems[index] = itemToUpdate;
    setCurrentPurchaseOrder((prev) => ({ ...prev, items: newItems }));
  }; // --- Guardar Inventario (Snapshot - Pestaña Inventario) ---

  const handleSaveInventorySnapshot = () => {
    if (inventoryItems.length === 0) {
      alert("No hay artículos en el inventario para guardar.");
      return;
    }

    const recordDate = new Date();

    const formattedDate = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const recordItems: InventoryRecordItem[] = inventoryItems.map((item) => {
      const totalStock = calculateTotalStock(item);
      const pendingStock = stockInOrders[item.id] || 0;

      return {
        itemId: item.id,
        name: item.name,
        currentStock: totalStock,
        pendingStock: pendingStock,
        initialStock: totalStock,
        endStock: totalStock,
        consumption: 0,
        stockByLocationSnapshot: item.stockByLocation || {},
      };
    });

    const newRecord: InventoryRecord = {
      id: crypto.randomUUID(),
      date: recordDate.toISOString(),
      label: `Inventario (${formattedDate})`,
      items: recordItems,
      type: "snapshot",
    };

    onSaveInventoryRecord(newRecord);

    alert(
      `Instantánea del inventario (${formattedDate}) guardada en el historial. El Stock Actual NO ha sido modificado.`
    );
  }; // --- Guardar Análisis de Consumo (Pestaña Análisis) --- // 🛑 CORRECCIÓN: Convertir a async y usar await en onBulkUpdateInventoryItems

  const handleSaveCurrentInventory = async () => {
    if (inventoryItems.length === 0) {
      alert("No hay artículos en el inventario para guardar.");
      return;
    }

    const recordDate = new Date();

    const recordItems: InventoryRecordItem[] = inventoryItems.map((item) => {
      const totalStock = calculateTotalStock(item);
      const pendingStock = stockInOrders[item.id] || 0;

      const previousEndStock = initialStockMap.get(item.id) || 0;
      const initialTotalStock = previousEndStock + pendingStock;

      const endStock = totalStock;
      const consumption = initialTotalStock - endStock;

      return {
        itemId: item.id,
        name: item.name,
        currentStock: totalStock,
        pendingStock: pendingStock,
        initialStock: initialTotalStock,
        endStock: endStock,
        consumption: consumption,
      };
    }); // Paso 2: Ejecutar el reseteo a 0

    const updatesForReset: { name: string; stock: number }[] =
      inventoryItems.map((item) => ({
        name: item.name,
        stock: 0,
      }));

    if (updatesForReset.length > 0) {
      // 🛑 AWAIT AÑADIDO: Esperamos a que la operación de reseteo termine antes de continuar
      await onBulkUpdateInventoryItems(updatesForReset, "set");
    } // Paso 3: Guardar el Análisis en el Historial

    const formattedDate = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const newRecord: InventoryRecord = {
      id: crypto.randomUUID(),
      date: recordDate.toISOString(),
      label: `Análisis de consumo (${formattedDate})`,
      items: recordItems,
      type: "analysis",
    };

    onSaveInventoryRecord(newRecord); // Paso 4: Archivar pedidos completados // 🛑 CORRECCIÓN: Usar Promise.all si onSavePurchaseOrder es asíncrona, o mantener forEach si es síncrona

    purchaseOrders
      .filter((o) => o.status === PurchaseOrderStatus.Completed)
      .forEach((order) => {
        onSavePurchaseOrder({
          ...order,
          status: PurchaseOrderStatus.Archived,
        } as PurchaseOrder);
      });

    alert(
      `Análisis de consumo (${formattedDate}) guardado. El stock físico actual ha sido reseteado a 0. Las cantidades contadas se han guardado en el historial de análisis.`
    );
  }; // --- FUNCIÓN DE RESETEO A 0 (Se mantiene la referencia a la prop) ---

  const handleResetInventory = handleResetInventoryStocks; // ---- HANDLER PARA BORRADO COMPLETO DEL HISTORIAL (Se mantiene) ----

  const handleDeleteAllHistory = () => {
    if (
      window.confirm(
        "¿Seguro que quieres borrar el historial completo de análisis e inventarios? ESTA ACCIÓN ES IRREVERSIBLE."
      )
    ) {
      onDeleteAllInventoryRecords();
    }
  }; // ---- RENDERIZADO DE DETALLES DEL HISTORIAL (Se mantiene) ----

  const closeRecordDetailModal = () => {
    setViewingRecord(null);
  };

  const openRecordDetailModal = (record: InventoryRecord) => {
    setViewingRecord(record);
  };

  const renderInventoryRecordDetailModal = () => {
    if (!viewingRecord) return null;

    const isAnalysis = viewingRecord.type === "analysis";

    const renderAnalysisTable = () => {
      const consumedItems = viewingRecord.items.filter(
        (item) => item.consumption > 0.001
      );

      if (consumedItems.length === 0) {
        return (
          <div className="text-center py-5 text-slate-500">
                       {" "}
            <p>No se registró consumo de artículos en este análisis.</p>       
             {" "}
          </div>
        );
      }

      return (
        <table className="min-w-full divide-y divide-gray-700">
                   {" "}
          <thead className="bg-gray-700/50">
                       {" "}
            <tr>
                           {" "}
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                Artículo              {" "}
              </th>
                           {" "}
              <th className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                                Pedidos              {" "}
              </th>
                           {" "}
              <th className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                                Stock Inicial              {" "}
              </th>
                           {" "}
              <th className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                                Stock Final              {" "}
              </th>
                           {" "}
              <th className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                                Consumo              {" "}
              </th>
                         {" "}
            </tr>
                     {" "}
          </thead>
                   {" "}
          <tbody className="bg-gray-800 divide-y divide-gray-700">
                       {" "}
            {consumedItems.map((item, itemIndex) => (
              <tr key={item.itemId || itemIndex}>
                               {" "}
                <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-white">
                                    {item.name}               {" "}
                </td>
                               {" "}
                <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-yellow-400">
                                   {" "}
                  {item.pendingStock !== undefined
                    ? item.pendingStock.toFixed(1).replace(".", ",")
                    : "0.0"}
                                 {" "}
                </td>
                               {" "}
                <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-blue-400">
                                   {" "}
                  {item.initialStock !== undefined
                    ? item.initialStock.toFixed(1).replace(".", ",")
                    : "-"}
                                 {" "}
                </td>
                               {" "}
                <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-yellow-400">
                                   {" "}
                  {item.endStock !== undefined
                    ? item.endStock.toFixed(1).replace(".", ",")
                    : "-"}
                                 {" "}
                </td>
                               {" "}
                <td
                  className={`px-2 py-2 whitespace-nowrap text-lg text-right font-bold text-red-400`}
                >
                                   {" "}
                  {item.consumption !== undefined
                    ? item.consumption.toFixed(1).replace(".", ",")
                    : "-"}
                                 {" "}
                </td>
                             {" "}
              </tr>
            ))}
                     {" "}
          </tbody>
                 {" "}
        </table>
      );
    };

    const renderSnapshotTable = () => {
      const itemsWithTotals = (viewingRecord!.items as InventoryRecordItem[])
        .map((item) => {
          const stockValues = Object.values(
            item.stockByLocationSnapshot || {}
          ) as number[];
          const total = stockValues.reduce(
            (sum, val) => sum + (Number(val) || 0),
            0
          );
          return { ...item, calculatedTotal: total };
        })
        .filter((item) => item.calculatedTotal > 0.001);

      if (itemsWithTotals.length === 0) {
        return (
          <div className="text-center py-5 text-slate-500">
                       {" "}
            <p>No se registraron artículos en stock en este inventario.</p>     
               {" "}
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
                   {" "}
          <table className="divide-y divide-gray-700 w-full table-fixed">
                       {" "}
            <thead className="bg-gray-700/50">
                           {" "}
              <tr>
                               {" "}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase w-[150px]">
                                    Artículo                {" "}
                </th>
                               {" "}
                {INVENTORY_LOCATIONS.map((loc) => (
                  <th
                    key={loc}
                    className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase w-[70px] whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ minWidth: "70px", maxWidth: "70px" }}
                  >
                                       {" "}
                    {loc.length > 8 ? loc.substring(0, 6) + "..." : loc}       
                             {" "}
                  </th>
                ))}
                               {" "}
                <th
                  className="px-2 py-3 text-right text-xs font-medium text-gray-300 uppercase w-[70px] whitespace-nowrap"
                  style={{ minWidth: "70px", maxWidth: "70px" }}
                >
                                    Total                {" "}
                </th>
                             {" "}
              </tr>
                         {" "}
            </thead>
                       {" "}
            <tbody className="bg-gray-800 divide-y divide-gray-700">
                           {" "}
              {itemsWithTotals.map((item, itemIndex) => {
                const calculatedTotal = item.calculatedTotal || 0;
                return (
                  <tr
                    key={item.itemId || itemIndex}
                    className="hover:bg-gray-700/50"
                  >
                                       {" "}
                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-white w-[150px]">
                                            {item.name}                   {" "}
                    </td>
                                       {" "}
                    {INVENTORY_LOCATIONS.map((loc) => {
                      const stockValue =
                        item.stockByLocationSnapshot?.[loc] || 0;
                      return (
                        <td
                          key={loc}
                          className={`px-2 py-2 whitespace-nowrap text-sm text-right w-[70px] overflow-hidden text-ellipsis ${
                            stockValue > 0.001
                              ? "text-green-400"
                              : "text-slate-400"
                          }`}
                        >
                                                   {" "}
                          {stockValue.toFixed(1).replace(".", ",")}             
                                   {" "}
                        </td>
                      );
                    })}
                                       {" "}
                    <td
                      className={`px-2 py-2 whitespace-nowrap text-lg text-right font-bold w-[70px] overflow-hidden text-ellipsis ${
                        calculatedTotal > 0.001
                          ? "text-green-400"
                          : "text-slate-400"
                      }`}
                    >
                                           {" "}
                      {calculatedTotal.toFixed(1).replace(".", ",")}           
                             {" "}
                    </td>
                                     {" "}
                  </tr>
                );
              })}
                         {" "}
            </tbody>
                     {" "}
          </table>
                 {" "}
        </div>
      );
    };

    return (
      <Modal
        title={`Detalle: ${viewingRecord.label}`}
        onClose={closeRecordDetailModal}
        onSave={closeRecordDetailModal}
        hideSaveButton={true}
        size="max-w-7xl"
      >
               {" "}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                   {" "}
          <p className="text-sm text-slate-400 mb-4">
                        Registrado el            {" "}
            {formatUTCToLocal(viewingRecord.date)}.          {" "}
          </p>
                    {isAnalysis ? renderAnalysisTable() : renderSnapshotTable()}
                 {" "}
        </div>
             {" "}
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
           {" "}
      <input
        type="text"
        placeholder="Nombre del Artículo"
        value={currentInventoryItem.name || ""}
        onChange={(e) => handleInventoryChange("name", e.target.value)}
        className="bg-gray-700 text-white rounded p-2 w-full"
      />
           {" "}
      <select
        value={currentInventoryItem.category || ""}
        onChange={(e) => handleInventoryChange("category", e.target.value)}
        className="bg-gray-700 text-white rounded p-2 w-full"
      >
               {" "}
        <option value="" disabled>
                    Seleccionar Categoría        {" "}
        </option>
               {" "}
        {CATEGORY_ORDER.map((category) => (
          <option key={category} value={category}>
                        {category}         {" "}
          </option>
        ))}
               {" "}
        {currentInventoryItem.category &&
          !CATEGORY_ORDER.includes(currentInventoryItem.category) && (
            <option
              key={currentInventoryItem.category}
              value={currentInventoryItem.category}
            >
                            {currentInventoryItem.category} (Custom)            {" "}
            </option>
          )}
             {" "}
      </select>
         {" "}
    </div>
  );

  const renderOrderForm = () => {
    // 🛑 CORRECCIÓN: Validamos que haya nombre de proveedor Y que todos los ítems tengan ID y cantidad > 0
    const hasValidItems = currentPurchaseOrder.items.every(
      (item) => item.quantity > 0.001 && item.inventoryItemId.trim() !== ""
    );
    const hasItemsWithQuantity = currentPurchaseOrder.items.some(
      (item) => item.quantity > 0.001
    );
    const hasSupplierName = currentPurchaseOrder.supplierName.trim() !== "";

    const canSave = hasValidItems && hasSupplierName;

    let disabledTitle = "Guardar pedido";

    if (!hasSupplierName) {
      disabledTitle = "Introduce el proveedor para guardar";
    } else if (!hasItemsWithQuantity) {
      disabledTitle =
        "Añade al menos un artículo con cantidad > 0 para guardar";
    } else if (!hasValidItems) {
      disabledTitle =
        "Asegúrate de que todos los artículos tienen cantidad y están seleccionados";
    }

    return (
      <div className="space-y-4">
               {" "}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {" "}
          <input
            type="date"
            value={currentPurchaseOrder.orderDate}
            onChange={(e) => handleOrderChange("orderDate", e.target.value)}
            className="bg-gray-700 text-white rounded p-2 w-full"
          />
                   {" "}
          <div className="relative">
                       {" "}
            <input
              type="text"
              list="supplier-list"
              placeholder="Proveedor"
              value={currentPurchaseOrder.supplierName}
              onChange={(e) =>
                handleOrderChange("supplierName", e.target.value)
              }
              className="bg-gray-700/50 text-white rounded p-2 w-full"
            />
                       {" "}
            <datalist id="supplier-list">
                           {" "}
              {suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
                         {" "}
            </datalist>
                     {" "}
          </div>
                 {" "}
        </div>
               {" "}
        <h3 className="text-lg font-bold text-white pt-4">
                    Artículos del Pedido        {" "}
        </h3>
               {" "}
        <div className="relative mb-4">
                   {" "}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <SearchIcon />         {" "}
          </div>
                   {" "}
          <input
            type="text"
            placeholder="Buscar producto para añadir..."
            value={orderSearchTerm}
            onChange={(e) => setOrderSearchTerm(e.target.value)}
            className="bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 w-full border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
          />
                 {" "}
        </div>
               {" "}
        {orderSearchTerm && filteredOrderItems.length > 0 && (
          <div className="bg-slate-900/50 rounded-md p-2 space-y-1">
                       {" "}
            {filteredOrderItems.slice(0, 5).map((item) => {
              const isAlreadyInOrder = currentPurchaseOrder.items.some(
                (oi) => oi.inventoryItemId === item.id
              );

              return (
                <div
                  key={item.id}
                  className={`flex justify-between items-center p-2 rounded-sm ${
                    isAlreadyInOrder
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                                   {" "}
                  <span className="text-white text-sm">{item.name}</span>       
                           {" "}
                  <button
                    onClick={() => handleAddProductFromSearch(item)}
                    className={`p-1 rounded text-white text-xs flex items-center gap-1 ${
                      isAlreadyInOrder
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    disabled={isAlreadyInOrder}
                  >
                                       {" "}
                    {isAlreadyInOrder ? "Añadido" : "✅ Añadir"}               
                     {" "}
                  </button>
                                 {" "}
                </div>
              );
            })}
                     {" "}
          </div>
        )}
               {" "}
        {currentPurchaseOrder.items.map((orderItem, index) => {
          const itemDetails = inventoryItems.find(
            (item) => item.id === orderItem.inventoryItemId
          ); // Artículos disponibles para el select (no deben estar ya en el pedido)
          const availableItems = inventoryItems.filter(
            (item) =>
              !currentPurchaseOrder.items.some(
                (oi, i) => i !== index && oi.inventoryItemId === item.id
              )
          );

          return (
            <div
              key={index}
              className="flex gap-2 items-center p-2 bg-gray-900/50 rounded-md"
            >
                           {" "}
              {orderItem.inventoryItemId && itemDetails ? (
                <span className="text-white w-1/3 flex-shrink-0">
                                    {itemDetails.name}               {" "}
                </span>
              ) : (
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
                                   {" "}
                  <option value="">Seleccionar Artículo</option>               
                   {" "}
                  {availableItems.map((i) => (
                    <option key={i.id} value={i.id}>
                                            {i.name}                   {" "}
                    </option>
                  ))}
                                 {" "}
                </select>
              )}
                           {" "}
              <input
                type="text"
                placeholder="Cantidad"
                value={tempOrderQuantities[index] ?? ""}
                onChange={(e) =>
                  handleOrderQuantityChange(index, e.target.value)
                }
                className="bg-gray-700 text-white rounded p-2 w-24"
              />
                           {" "}
              <div className="relative w-28 invisible">
                               {" "}
                <input
                  type="text"
                  disabled
                  className="bg-gray-700 text-white rounded p-2 w-full pr-8"
                  value={"0,00"}
                />
                               {" "}
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">
                                    €                {" "}
                </span>
                             {" "}
              </div>
                           {" "}
              <button
                onClick={() => removeOrderItem(index)}
                className="p-2 bg-red-600 rounded text-white"
              >
                                <TrashIcon />             {" "}
              </button>
                         {" "}
            </div>
          );
        })}
               {" "}
        <button
          onClick={addOrderItem}
          className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
        >
                    + Añadir Artículo (manualmente)        {" "}
        </button>
               {" "}
        <div className="flex justify-end p-4 border-t border-gray-700 rounded-b-lg mt-4 bg-gray-800">
                   {" "}
          <button
            onClick={closeOrderModal}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg mr-2 transition duration-300"
          >
                        Cancelar          {" "}
          </button>
                   {" "}
          <button
            onClick={handleSaveOrder}
            disabled={!canSave}
            className={`font-bold py-2 px-4 rounded-lg transition duration-300 ${
              canSave
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
            title={disabledTitle}
          >
                        Guardar          {" "}
          </button>
                 {" "}
        </div>
             {" "}
      </div>
    );
  };

  return (
    <div className="p-4 animate-fade-in">
           {" "}
      <div className="flex justify-between items-center mb-6">
               {" "}
        <h1 className="text-3xl font-bold text-white">Gestión de Inventario</h1>
               {" "}
        <div className="flex gap-2">
                   {" "}
          <div className="bg-gray-800 p-1 rounded-lg flex space-x-1">
                       {" "}
            <button
              onClick={() => setActiveTab("inventory")}
              className={tabClasses("inventory")}
            >
                            Inventario            {" "}
            </button>
                       {" "}
            <button
              onClick={() => setActiveTab("orders")}
              className={tabClasses("orders")}
            >
                            Pedidos            {" "}
            </button>
                       {" "}
            <button
              onClick={() => setActiveTab("analysis")}
              className={tabClasses("analysis")}
            >
                            Análisis            {" "}
            </button>
                       {" "}
            <button
              onClick={() => setActiveTab("history")}
              className={tabClasses("history")}
            >
                            Historial            {" "}
            </button>
                     {" "}
          </div>
                 {" "}
        </div>
             {" "}
      </div>
           {" "}
      {activeTab === "inventory" && (
        <div className="space-y-6">
                   {" "}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                       {" "}
            <div className="relative w-full md:max-w-xs">
                           {" "}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <SearchIcon />             {" "}
              </div>
                           {" "}
              <input
                type="text"
                placeholder="Buscar bebida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 w-full border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
              />
                         {" "}
            </div>
                       {" "}
            <div className="flex justify-end items-center gap-2 flex-wrap w-full md:w-auto">
                           {" "}
              <button
                onClick={handleResetInventory}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
              >
                                <RefreshIcon />               {" "}
                <span className="hidden sm:inline">Resetear Inventario</span>   
                         {" "}
              </button>
                           {" "}
              <button
                onClick={handleSaveInventorySnapshot}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
              >
                                <InventoryIcon />                {" "}
                <span className="hidden sm:inline">Guardar Inventario</span>   
                         {" "}
              </button>
                           {" "}
              <button
                onClick={() => openInventoryModal(undefined)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
              >
                                <PlusIcon />                {" "}
                <span className="hidden sm:inline">Nuevo Artículo</span>       
                     {" "}
              </button>
                         {" "}
            </div>
                     {" "}
          </div>
                   {" "}
          <div className="space-y-4">
                       {" "}
            {Object.entries(groupedItems)
              .sort(([catA], [catB]) => {
                const indexA = CATEGORY_ORDER.indexOf(catA);
                const indexB = CATEGORY_ORDER.indexOf(catB);

                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;

                return catA.localeCompare(catB);
              })
              .map(([category, items]) => (
                <CategoryAccordion
                  key={category}
                  title={category}
                  itemCount={items.length}
                  initialOpen={true} // ABRIR POR DEFECTO EN INVENTARIO
                >
                                   {" "}
                  <div className="overflow-x-auto">
                                       {" "}
                    <table className="min-w-full">
                                           {" "}
                      <thead>
                                               {" "}
                        <tr>
                                                   {" "}
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-300 uppercase sticky left-0 bg-slate-800 z-10 w-[180px]">
                                                        NOMBRE                  
                                   {" "}
                          </th>
                                                   {" "}
                          {INVENTORY_LOCATIONS.map((loc) => (
                            <th
                              className="px-2 py-1 text-center text-[10px] font-medium text-gray-300 uppercase w-[70px] whitespace-nowrap overflow-hidden text-ellipsis"
                              key={loc}
                            >
                                                           {" "}
                              {loc.length > 8
                                ? loc.substring(0, 7).toUpperCase()
                                : loc.toUpperCase()}
                                                         {" "}
                            </th>
                          ))}
                                                   {" "}
                          <th className="px-2 py-1 text-center text-xs font-medium text-gray-300 uppercase w-20">
                                                        TOTAL                  
                                   {" "}
                          </th>
                                                   {" "}
                          <th className="px-2 py-1 text-right text-xs font-medium text-gray-300 uppercase w-20">
                                                        ACCIONES                
                                     {" "}
                          </th>
                                                 {" "}
                        </tr>
                                             {" "}
                      </thead>
                                           {" "}
                      <tbody className="divide-y divide-gray-700/50">
                                               {" "}
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-700/50">
                                                       {" "}
                            <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-white sticky left-0 bg-slate-800 z-10 w-[180px]">
                                                            {item.name}         
                                               {" "}
                            </td>
                                                       {" "}
                            {INVENTORY_LOCATIONS.map((loc) => (
                              <td
                                key={loc}
                                className="px-2 py-1 whitespace-nowrap w-[70px]"
                              >
                                                               {" "}
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
                                  className="bg-slate-700 text-white rounded p-0.5 w-14 text-center text-sm border border-slate-600"
                                  placeholder="0"
                                />
                                                             {" "}
                              </td>
                            ))}
                                                       {" "}
                            <td className="px-4 py-2 whitespace-nowrap text-lg font-bold w-20">
                                                           {" "}
                              <span
                                className={
                                  calculateTotalStock(item) > 0.001
                                    ? "text-green-400"
                                    : "text-slate-400"
                                }
                              >
                                                               {" "}
                                {calculateTotalStock(item)
                                  .toFixed(1)
                                  .replace(".", ",")}
                                                             {" "}
                              </span>
                                                         {" "}
                            </td>
                                                       {" "}
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm w-20">
                                                           {" "}
                              <button
                                onClick={() => openInventoryModal(item)}
                                className="text-indigo-400 mr-1"
                              >
                                                                <PencilIcon /> 
                                                           {" "}
                              </button>
                                                           {" "}
                              <button
                                onClick={() =>
                                  window.confirm(
                                    "¿Seguro que quieres eliminar este artículo?"
                                  ) && onDeleteInventoryItem(item.id)
                                }
                                className="text-red-500"
                              >
                                                                <TrashIcon />   
                                                         {" "}
                              </button>
                                                         {" "}
                            </td>
                                                     {" "}
                          </tr>
                        ))}
                                             {" "}
                      </tbody>
                                         {" "}
                    </table>
                                     {" "}
                  </div>
                                 {" "}
                </CategoryAccordion>
              ))}
                     {" "}
          </div>
                 {" "}
        </div>
      )}
           {" "}
      {activeTab === "orders" && (
        <div>
                   {" "}
          <div className="text-right mb-4">
                       {" "}
            <button
              onClick={() => openOrderModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300 ml-auto"
            >
                            <PlusIcon />              {" "}
              <span className="hidden sm:inline">Nuevo Pedido</span>           {" "}
            </button>
                       {" "}
          </div>
                   {" "}
          <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
                       {" "}
            <table className="min-w-full divide-y divide-gray-700">
                           {" "}
              <thead className="bg-gray-700/50">
                               {" "}
                <tr>
                                   {" "}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        Fecha Pedido                  {" "}
                  </th>
                                   {" "}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        Proveedor                  {" "}
                  </th>
                                   {" "}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                        Estado                  {" "}
                  </th>
                                   {" "}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">
                                        Completado                  {" "}
                  </th>
                                   {" "}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                                        Acciones                  {" "}
                  </th>
                                 {" "}
                </tr>
                             {" "}
              </thead>
                           {" "}
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                               {" "}
                {purchaseOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-700/50">
                                       {" "}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {order.orderDate}                   {" "}
                    </td>
                                       {" "}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                            {order.supplierName}               
                         {" "}
                    </td>
                                       {" "}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                           {" "}
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === PurchaseOrderStatus.Completed ||
                          order.status === PurchaseOrderStatus.Archived
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                                                {order.status}                 
                           {" "}
                      </span>
                                         {" "}
                    </td>
                                       {" "}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                           {" "}
                      {order.status === PurchaseOrderStatus.Pending && (
                        <button
                          onClick={() => handleReceiveOrder(order)}
                          className="px-2 py-1 bg-green-600/30 text-green-400 hover:bg-green-600 hover:text-white rounded text-xs font-bold transition duration-300"
                        >
                                                    Recibir                    
                             {" "}
                        </button>
                      )}
                                           {" "}
                      {(order.status === PurchaseOrderStatus.Completed ||
                        order.status === PurchaseOrderStatus.Archived) && (
                        <span className="text-green-400 font-bold">OK</span>
                      )}
                                         {" "}
                    </td>
                                       {" "}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                           {" "}
                      <button
                        onClick={() => openOrderModal(order)}
                        className="text-indigo-400 mr-4"
                      >
                                                <PencilIcon />                 
                           {" "}
                      </button>
                                           {" "}
                      <button
                        onClick={() =>
                          window.confirm(
                            "¿Seguro que quieres eliminar este pedido?"
                          ) && onDeletePurchaseOrder(order.id)
                        }
                        className="text-red-500"
                      >
                                                <TrashIcon />                   
                         {" "}
                      </button>
                                         {" "}
                    </td>
                                     {" "}
                  </tr>
                ))}
                             {" "}
              </tbody>
                         {" "}
            </table>
                     {" "}
          </div>
                 {" "}
        </div>
      )}
           {" "}
      {activeTab === "analysis" && (
        <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto p-4">
                   {" "}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                       {" "}
            <h2 className="text-xl font-bold text-white">
                            Análisis de Consumo Semanal            {" "}
            </h2>
                       {" "}
            <div className="flex items-center gap-2 flex-wrap">
                           {" "}
              <button
                onClick={handleSaveCurrentInventory}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
              >
                                Guardar Análisis de Consumo              {" "}
              </button>
                         {" "}
            </div>
                     {" "}
          </div>
                   {" "}
          <div className="space-y-4">
                                   {" "}
            {analysisGroupedItems.map(
              ({ category, items, categoryTotalRelevantStock }) => (
                <CategoryAccordion
                  key={category}
                  title={category}
                  itemCount={items.length}
                  initialOpen={true}
                >
                                   {" "}
                  <div className="overflow-x-auto">
                                       {" "}
                    <table className="min-w-full divide-y divide-gray-700">
                                           {" "}
                      <thead className="bg-gray-700/50">
                                               {" "}
                        <tr>
                                                   {" "}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                                        Artículo                
                                     {" "}
                          </th>
                                                   {" "}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                                        Stock Actual            
                                         {" "}
                          </th>
                                                   {" "}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                                        En Pedidos              
                                       {" "}
                          </th>
                                                   {" "}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                                        Stock Semana Anterior  
                                                   {" "}
                          </th>
                                                   {" "}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                                        Stock Inicial Total    
                                                 {" "}
                          </th>
                                                   {" "}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                                                        Consumo                
                                     {" "}
                          </th>
                                                 {" "}
                        </tr>
                                             {" "}
                      </thead>
                                           {" "}
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                                               {" "}
                        {items.map((item) => {
                          const totalStock = calculateTotalStock(item);
                          const pendingStock = stockInOrders[item.id] || 0;
                          const previousEndStock =
                            initialStockMap.get(item.id) || 0;
                          const initialTotalStock =
                            previousEndStock + pendingStock;
                          const endStock = totalStock;
                          const consumption = initialTotalStock - endStock;

                          return (
                            <tr key={item.id} className="hover:bg-gray-700/50">
                                                           {" "}
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                                                                {item.name}     
                                                       {" "}
                              </td>
                                                           {" "}
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                                                               {" "}
                                {totalStock.toFixed(1).replace(".", ",")}       
                                                     {" "}
                              </td>
                                                           {" "}
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400">
                                                               {" "}
                                {pendingStock.toFixed(1).replace(".", ",")}     
                                                       {" "}
                              </td>
                                                           {" "}
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                                                               {" "}
                                {previousEndStock.toFixed(1).replace(".", ",")} 
                                                           {" "}
                              </td>
                                                           {" "}
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-400 font-bold">
                                                               {" "}
                                {initialTotalStock.toFixed(1).replace(".", ",")}
                                                             {" "}
                              </td>
                                                           {" "}
                              <td
                                className={`px-4 py-4 whitespace-nowrap text-sm font-bold ${
                                  consumption >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                                               {" "}
                                {consumption.toFixed(1).replace(".", ",")}     
                                                       {" "}
                              </td>
                                                         {" "}
                            </tr>
                          );
                        })}
                                             {" "}
                      </tbody>
                                         {" "}
                    </table>
                                     {" "}
                  </div>
                                 {" "}
                </CategoryAccordion>
              )
            )}
                     {" "}
          </div>
                 {" "}
        </div>
      )}
           {" "}
      {activeTab === "history" && (
        <div className="bg-gray-800 shadow-xl rounded-lg p-6">
                   {" "}
          <div className="flex justify-between items-center mb-4">
                       {" "}
            <h2 className="text-2xl font-bold text-white">
                            Historial de Inventarios Guardados 📊            {" "}
            </h2>
                       {" "}
            <button
              onClick={handleDeleteAllHistory}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
            >
                            <TrashIcon /> Borrar Historial Completo            {" "}
            </button>
                     {" "}
          </div>
                   {" "}
          <WeeklyConsumptionAnalysis
            inventoryHistory={validInventoryHistory}
            formatUTCToLocal={formatUTCToLocal}
          />
                   {" "}
          <h3 className="text-xl font-bold text-white mb-3 mt-8 border-t border-gray-700 pt-4">
                        Registros Anteriores          {" "}
          </h3>
                   {" "}
          {validInventoryHistory.length > 0 ? (
            <ul className="space-y-3">
                           {" "}
              {validInventoryHistory.map((record: InventoryRecord) => (
                <li
                  key={record.id}
                  className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors"
                >
                                   {" "}
                  <div>
                                       {" "}
                    <p className="font-semibold text-white">{record.label}</p> 
                                     {" "}
                    <p className="text-sm text-slate-400">
                                            {formatUTCToLocal(record.date)}     
                                   {" "}
                    </p>
                                     {" "}
                  </div>
                                   {" "}
                  <div className="flex gap-3">
                                       {" "}
                    <button
                      onClick={() => openRecordDetailModal(record)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
                    >
                                            Ver Detalles                    {" "}
                    </button>
                                     {" "}
                  </div>
                                 {" "}
                </li>
              ))}
                         {" "}
            </ul>
          ) : (
            <div className="text-center py-10 text-slate-500">
                            <p>No hay análisis guardados en el historial.</p>   
                       {" "}
              <p className="text-sm mt-2">
                                Ve a la pestaña de 'Análisis' para guardar el
                estado actual del                 inventario.              {" "}
              </p>
                         {" "}
            </div>
          )}
                 {" "}
        </div>
      )}
           {" "}
      {isInventoryModalOpen && (
        <Modal
          title={currentInventoryItem.id ? "Editar Artículo" : "Nuevo Artículo"}
          onClose={closeInventoryModal}
          onSave={handleSaveInventory}
        >
                    {renderInventoryForm()}       {" "}
        </Modal>
      )}
           {" "}
      {isOrderModalOpen && (
        <Modal
          title={
            "id" in currentPurchaseOrder ? "Editar Pedido" : "Nuevo Pedido"
          }
          onClose={closeOrderModal}
          hideSaveButton={true}
        >
                    {renderOrderForm()}       {" "}
        </Modal>
      )}
            {viewingRecord && renderInventoryRecordDetailModal()}   {" "}
    </div>
  );
};

export default InventoryComponent;
