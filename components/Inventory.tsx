
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, PurchaseOrder, PurchaseOrderStatus, OrderItem, InventoryRecord, InventoryRecordItem } from '../types';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, GoogleDriveIcon, ChevronDownIcon, ExportIcon, SearchIcon } from './icons';
import { INVENTORY_LOCATIONS } from '../constants';

interface InventoryProps {
    inventoryItems: InventoryItem[];
    purchaseOrders: PurchaseOrder[];
    suppliers: string[];
    inventoryHistory: InventoryRecord[];
    onSaveInventoryItem: (item: InventoryItem) => void;
    onDeleteInventoryItem: (id: string) => void;
    onSavePurchaseOrder: (order: PurchaseOrder) => void;
    onDeletePurchaseOrder: (id: string) => void;
    onBulkUpdateInventoryItems: (updates: { name: string, stock: number }[]) => void;
    onSaveInventoryRecord: (record: InventoryRecord) => void;
}

const emptyInventoryItem: Omit<InventoryItem, 'id' | 'stockByLocation'> = {
    name: '',
    category: '',
    unit: '',
};

const emptyPurchaseOrder: Omit<PurchaseOrder, 'id'> = {
    orderDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    items: [],
    status: PurchaseOrderStatus.Pending,
    totalAmount: 0,
};

// --- Mock Data for Drive Simulation ---
const mockDriveFiles: { id: string, name: string }[] = [
    { id: 'file1', name: 'Stock Semanal - Bebidas.csv' },
    { id: 'file2', name: 'Inventario General - Cocina.csv' },
    { id: 'file3', name: 'Control de Stock - Barra.csv' },
];

const mockFileContents: { [key: string]: string } = {
    file1: "Absolut, 60\nSchweppes Tonica, 300",
    file2: "Naranja, 150",
    file3: "Absolut, 55\nNaranja, 120\nSchweppes Tonica, 250",
};

const parseDecimal = (input: string): number => {
    if (typeof input !== 'string' || !input) return 0;
    const sanitized = input.replace(',', '.');
    const number = parseFloat(sanitized);
    return isNaN(number) ? 0 : number;
};

const parseCurrency = (input: string): number => {
    if (typeof input !== 'string' || !input) return 0;
    const sanitized = input.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,/g, '.');
    const number = parseFloat(sanitized);
    return isNaN(number) ? 0 : number;
};

// Custom Category Order
const CATEGORY_ORDER = [
    '🧊 Vodka',
    '🥥 Ron',
    '🥃 Whisky / Bourbon',
    '🍸 Ginebra',
    '🌵 Tequila',
    '🔥 Mezcal',
    '🍯 Licores y Aperitivos',
    '🍷 Vermut',
    '🥂 Vinos y espumosos',
    '🥤Refrescos y agua',
    '🍻 Cerveza'
];

// --- Local Components ---

interface CategoryAccordionProps {
    title: string;
    children: React.ReactNode;
    itemCount: number;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({ title, children, itemCount }) => {
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
                    <span className="text-xs font-normal bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{itemCount} items</span>
                </div>
                <ChevronDownIcon className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="p-2 border-t border-slate-700">
                        {children}
                    </div>
                </div>
            </div>
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
    onSaveInventoryRecord
}) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'analysis' | 'history'>('inventory');
    
    const [isInventoryModalOpen, setInventoryModalOpen] = useState(false);
    const [currentInventoryItem, setCurrentInventoryItem] = useState<Partial<InventoryItem>>(emptyInventoryItem);
    
    const [isOrderModalOpen, setOrderModalOpen] = useState(false);
    const [currentPurchaseOrder, setCurrentPurchaseOrder] = useState<PurchaseOrder | Omit<PurchaseOrder, 'id'>>(emptyPurchaseOrder);
    const [tempOrderQuantities, setTempOrderQuantities] = useState<Record<number, string>>({});
    const [tempOrderCosts, setTempOrderCosts] = useState<Record<number, string>>({});

    const [isDriveModalOpen, setDriveModalOpen] = useState(false);
    const [connectedFile, setConnectedFile] = useState<{ id: string, name: string } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [tempStockValues, setTempStockValues] = useState<Record<string, string>>({});
    const [endOfWeekStock, setEndOfWeekStock] = useState<{ [key: string]: string }>({});

    const [searchTerm, setSearchTerm] = useState('');

    // Ensure inventoryHistory is always a valid array before rendering
    const validInventoryHistory = useMemo(() => {
        return (Array.isArray(inventoryHistory) ? inventoryHistory : []) as InventoryRecord[];
    }, [inventoryHistory]);

    // Recalculate total amount for order form whenever items change
    useEffect(() => {
        if (!isOrderModalOpen) return;
        const total = currentPurchaseOrder.items.reduce((sum, item) => sum + (item.quantity * item.costAtTimeOfPurchase), 0);
        setCurrentPurchaseOrder(prev => ({...prev, totalAmount: total}));
    }, [currentPurchaseOrder.items, isOrderModalOpen]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return inventoryItems;
        const lowerTerm = searchTerm.toLowerCase();
        return inventoryItems.filter(item => 
            item.name.toLowerCase().includes(lowerTerm) || 
            item.category.toLowerCase().includes(lowerTerm)
        );
    }, [inventoryItems, searchTerm]);
    
    const groupedItems = useMemo(() => {
        return filteredItems.reduce((acc, item) => {
            const category = item.category || 'Uncategorized';
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

        if (!itemToSave.id) { // It's a new item
            const initialStock = INVENTORY_LOCATIONS.reduce((acc, loc) => ({ ...acc, [loc]: 0 }), {});
            itemToSave.stockByLocation = initialStock;
        }

        onSaveInventoryItem({ ...itemToSave, id: itemToSave.id || crypto.randomUUID() } as InventoryItem);
        closeInventoryModal();
    };
    const handleInventoryChange = (field: keyof Omit<InventoryItem, 'id' | 'stockByLocation'>, value: string | number) => {
        setCurrentInventoryItem(prev => ({...prev, [field]: value}));
    };

    const handleStockInputChange = (itemId: string, location: string, value: string) => {
        // Allow only digits and a single comma followed by at most one digit
        if (value && !/^\d*([,]\d{0,1})?$/.test(value)) {
            return;
        }
        setTempStockValues(prev => ({ ...prev, [`${itemId}-${location}`]: value }));
    };

    const handleStockInputBlur = (item: InventoryItem, location: string) => {
        const tempValue = tempStockValues[`${item.id}-${location}`];
        if (tempValue !== undefined) {
            const newStock = parseDecimal(tempValue);
            const currentStock = item.stockByLocation[location] || 0;

            if(newStock !== currentStock) {
                const updatedStockByLocation = {
                    ...item.stockByLocation,
                    [location]: newStock,
                };
                onSaveInventoryItem({ ...item, stockByLocation: updatedStockByLocation });
            }

            setTempStockValues(prev => {
                const newTemp = { ...prev };
                delete newTemp[`${item.id}-${location}`];
                return newTemp;
            });
        }
    };


    const calculateTotalStock = (item: InventoryItem) => {
        if (!item.stockByLocation) return 0;
        return Object.values(item.stockByLocation).reduce((sum, val) => sum + (Number(val) || 0), 0);
    };

    // ---- Order Modal Handlers ----
    const openOrderModal = (order?: PurchaseOrder) => {
        const initialOrder = order || emptyPurchaseOrder;
        setCurrentPurchaseOrder(initialOrder);

        const tempQs: Record<number, string> = {};
        const tempCs: Record<number, string> = {};
        initialOrder.items.forEach((item, index) => {
            tempQs[index] = item.quantity ? String(item.quantity).replace('.', ',') : '';
            tempCs[index] = item.costAtTimeOfPurchase ? String(item.costAtTimeOfPurchase).replace('.', ',') : '';
        });
        setTempOrderQuantities(tempQs);
        setTempOrderCosts(tempCs);

        setOrderModalOpen(true);
    };
    const closeOrderModal = () => {
        setOrderModalOpen(false);
        setCurrentPurchaseOrder(emptyPurchaseOrder);
    };
    const handleSaveOrder = () => {
        onSavePurchaseOrder({ id: (currentPurchaseOrder as PurchaseOrder).id || crypto.randomUUID(), ...currentPurchaseOrder });
        closeOrderModal();
    };
    const handleOrderChange = (field: keyof Omit<PurchaseOrder, 'id' | 'items'>, value: string | PurchaseOrderStatus) => {
        setCurrentPurchaseOrder(prev => ({...prev, [field]: value}));
    };
    
    // ---- Order Items Handlers ----
    const addOrderItem = () => {
        const newItem: OrderItem = { inventoryItemId: '', quantity: 1, costAtTimeOfPurchase: 0 };
        setCurrentPurchaseOrder(prev => ({ ...prev, items: [...prev.items, newItem] }));
    };

    const removeOrderItem = (index: number) => {
        setCurrentPurchaseOrder(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const handleOrderQuantityChange = (index: number, value: string) => {
        if (value && !/^\d*[,]?\d*$/.test(value)) {
            return;
        }
        setTempOrderQuantities(prev => ({ ...prev, [index]: value }));

        const newItems = [...currentPurchaseOrder.items];
        const parsedQuantity = parseDecimal(value);
        if (newItems[index].quantity !== parsedQuantity) {
            newItems[index] = { ...newItems[index], quantity: parsedQuantity };
            setCurrentPurchaseOrder(prev => ({ ...prev, items: newItems }));
        }
    };

    const handleOrderCostChange = (index: number, value: string) => {
         if (value && !/^[0-9]*[,]?\d*$/.test(value)) {
            return;
        }
        setTempOrderCosts(prev => ({ ...prev, [index]: value }));
        
        const newItems = [...currentPurchaseOrder.items];
        const parsedCost = parseCurrency(value);
        if(newItems[index].costAtTimeOfPurchase !== parsedCost) {
            newItems[index] = { ...newItems[index], costAtTimeOfPurchase: parsedCost };
            setCurrentPurchaseOrder(prev => ({ ...prev, items: newItems }));
        }
    }

    const handleOrderItemChange = (index: number, field: 'inventoryItemId', value: string) => {
        const newItems = [...currentPurchaseOrder.items];
        const itemToUpdate = { ...newItems[index], [field]: value };
        newItems[index] = itemToUpdate;
        setCurrentPurchaseOrder(prev => ({ ...prev, items: newItems }));
    };
    
    // ---- Google Drive Simulation Handlers ----
    const handleFileSelect = (file: { id: string, name: string }) => {
        setConnectedFile(file);
        setDriveModalOpen(false);
    };

    const handleSync = () => {
        if (!connectedFile) return;

        setIsSyncing(true);
        // Simulate network delay
        setTimeout(() => {
            const fileContent = mockFileContents[connectedFile.id];
            const lines = fileContent.split('\n').filter(line => line.trim() !== '');
            const updates = lines.map(line => {
                const [name, stockStr] = line.split(',').map(s => s.trim());
                const stock = parseFloat(stockStr);
                return { name, stock: isNaN(stock) ? 0 : stock };
            }).filter(u => u.name);

            if (updates.length > 0) {
                onBulkUpdateInventoryItems(updates);
            }
            setIsSyncing(false);
        }, 1000);
    };
    
    // ---- Analysis Handlers ----
    const stockInOrders = useMemo(() => {
        const pending: { [key: string]: number } = {};
        purchaseOrders
            .filter(o => o.status === PurchaseOrderStatus.Pending)
            .forEach(o => {
                o.items.forEach(item => {
                    pending[item.inventoryItemId] = (pending[item.inventoryItemId] || 0) + item.quantity;
                });
            });
        return pending;
    }, [purchaseOrders]);

    const handleEndStockChange = (itemId: string, value: string) => {
        // Allow only digits and a single comma followed by at most one digit
        if (value && !/^\d*([,]\d{0,1})?$/.test(value)) {
            return;
        }
        setEndOfWeekStock(prev => ({ ...prev, [itemId]: value }));
    };

    const handleSaveCurrentInventory = () => {
        if (inventoryItems.length === 0) {
            alert('No hay artículos en el inventario para guardar.');
            return;
        }

        const recordItems: InventoryRecordItem[] = inventoryItems.map(item => {
            const totalStock = calculateTotalStock(item);
            const pendingStock = stockInOrders[item.id] || 0;
            const initialTotalStock = totalStock + pendingStock;
            const endStock = parseDecimal(endOfWeekStock[item.id] || '0');
            const consumption = initialTotalStock - endStock;

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

        const newRecord: InventoryRecord = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            items: recordItems,
        };

        onSaveInventoryRecord(newRecord);
        alert('Análisis de inventario guardado correctamente en el historial.');
    };

    const exportCurrentInventoryToCSV = () => {
        if (!inventoryItems || inventoryItems.length === 0) {
            alert("No hay artículos en el inventario para exportar.");
            return;
        }
    
        const headers = [
            'Categoría', 
            'Artículo', 
            ...INVENTORY_LOCATIONS, 
            'Stock Total', 
            'Unidad', 
        ];
        
        const sortedRows = inventoryItems
            .sort((a, b) => {
                const catComp = a.category.localeCompare(b.category);
                if (catComp !== 0) return catComp;
                return a.name.localeCompare(b.name);
            })
            .map(item => {
                const totalStock = calculateTotalStock(item);
                const locationStocks = INVENTORY_LOCATIONS.map(loc => 
                    (item.stockByLocation?.[loc] || 0).toString().replace('.', ',')
                );

                const rowData = [
                    `"${item.category.replace(/"/g, '""')}"`,
                    `"${item.name.replace(/"/g, '""')}"`,
                    ...locationStocks,
                    totalStock.toString().replace('.', ','),
                    item.unit,
                ];
                return rowData.join(';');
            });
    
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(';'), ...sortedRows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        const dateStr = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inventario_actual_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportInventoryRecordToCSV = (record: InventoryRecord) => {
        const headers = ['Artículo', 'Unidad', 'Stock Actual', 'En Pedidos', 'Stock Inicial', 'Stock Final', 'Consumo'];
        const rows = (record.items as any[]).map(item => { // Using 'as any[]' for safety with casting earlier
             // Ensure item has correct shape if record structure varies
             if (!item) return "";
            return [
                `"${item.name ? item.name.replace(/"/g, '""') : ''}"`,
                item.unit,
                item.currentStock,
                item.pendingStock,
                item.initialStock,
                item.endStock,
                item.consumption ? item.consumption.toFixed(2).replace('.', ',') : '0',
            ].join(';');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(';'), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        const dateStr = new Date(record.date).toLocaleDateString('es-ES').replace(/\//g, '-');
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inventario_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const tabClasses = (tabName: 'inventory' | 'orders' | 'analysis' | 'history') => 
        `px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
        activeTab === tabName ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;
    
    const renderInventoryForm = () => (
        <div className="space-y-4">
            <input type="text" placeholder="Nombre del Artículo" value={currentInventoryItem.name || ''} onChange={e => handleInventoryChange('name', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
            <input type="text" placeholder="Categoría" value={currentInventoryItem.category || ''} onChange={e => handleInventoryChange('category', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Unidad (kg, l, uds.)" value={currentInventoryItem.unit || ''} onChange={e => handleInventoryChange('unit', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
            </div>
        </div>
    );
    
    const renderOrderForm = () => {
        const isNewOrder = !('id' in currentPurchaseOrder);
        return (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" value={currentPurchaseOrder.orderDate} onChange={e => handleOrderChange('orderDate', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full"/>
                <div className="relative">
                    <input 
                        type="text" 
                        list="supplier-list"
                        placeholder="Proveedor" 
                        value={currentPurchaseOrder.supplierName} 
                        onChange={e => handleOrderChange('supplierName', e.target.value)} 
                        className="bg-gray-700 text-white rounded p-2 w-full" 
                    />
                    <datalist id="supplier-list">
                        {suppliers.map(s => <option key={s} value={s} />)}
                    </datalist>
                </div>
                <input type="date" value={currentPurchaseOrder.deliveryDate || ''} onChange={e => handleOrderChange('deliveryDate', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
                {!isNewOrder && (
                    <select value={currentPurchaseOrder.status} onChange={e => handleOrderChange('status', e.target.value as PurchaseOrderStatus)} className="bg-gray-700 text-white rounded p-2 w-full">
                        {Object.values(PurchaseOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                )}
            </div>
            
            <h3 className="text-lg font-bold text-white pt-4">Artículos del Pedido</h3>
            {currentPurchaseOrder.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center p-2 bg-gray-900/50 rounded-md">
                    <select value={item.inventoryItemId} onChange={e => handleOrderItemChange(index, 'inventoryItemId', e.target.value)} className="bg-gray-700 text-white rounded p-2 flex-grow">
                        <option value="">Seleccionar Artículo</option>
                        {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input type="text" placeholder="Cantidad" value={tempOrderQuantities[index] ?? ''} onChange={e => handleOrderQuantityChange(index, e.target.value)} className="bg-gray-700 text-white rounded p-2 w-24" />
                    <div className="relative w-28">
                         <input type="text" placeholder="Coste" value={tempOrderCosts[index] ?? ''} onChange={e => handleOrderCostChange(index, e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full pr-8" />
                         <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">€</span>
                    </div>
                    <button onClick={() => removeOrderItem(index)} className="p-2 bg-red-600 rounded text-white"><TrashIcon/></button>
                </div>
            ))}
            <button onClick={addOrderItem} className="text-indigo-400 hover:text-indigo-300 text-sm">+ Añadir Artículo</button>
        </div>
    )};
    
    const renderDriveModal = () => (
        <div className="space-y-3">
            <p className="text-gray-300">Seleccione el archivo de Google Sheets para sincronizar el stock.</p>
            <div className="space-y-2">
                {mockDriveFiles.map(file => (
                    <button 
                        key={file.id} 
                        onClick={() => handleFileSelect(file)}
                        className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-3"
                    >
                        <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg>
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
                        <button onClick={() => setActiveTab('inventory')} className={tabClasses('inventory')}>Inventario</button>
                        <button onClick={() => setActiveTab('orders')} className={tabClasses('orders')}>Pedidos</button>
                        <button onClick={() => setActiveTab('analysis')} className={tabClasses('analysis')}>Análisis</button>
                        <button onClick={() => setActiveTab('history')} className={tabClasses('history')}>Historial</button>
                    </div>
                </div>
            </div>
            
            {activeTab === 'inventory' && (
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
                                <button onClick={() => setDriveModalOpen(true)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300">
                                    <GoogleDriveIcon /> <span className="hidden sm:inline">Conectar Drive</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 bg-gray-800 p-1 rounded-lg">
                                        <span className="text-green-400 text-sm px-2">Conectado: <span className="font-semibold">{connectedFile.name}</span></span>
                                        <button onClick={handleSync} disabled={isSyncing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded text-sm flex items-center gap-2 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isSyncing ? '...' : 'Sincronizar'}
                                        </button>
                                        <button onClick={() => setConnectedFile(null)} className="bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-sm font-bold">
                                        X
                                        </button>
                                </div>
                            )}
                            <button onClick={exportCurrentInventoryToCSV} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300">
                                <ExportIcon />
                                <span className="hidden sm:inline">Exportar a Excel</span>
                            </button>
                            <button onClick={() => openInventoryModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300">
                                <PlusIcon /> <span className="hidden sm:inline">Nuevo Artículo</span>
                            </button>
                        </div>
                    </div>
                     <div className="space-y-4">
                        {Object.entries(groupedItems).sort(([catA], [catB]) => {
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
                        }).map(([category, items]) => (
                            <CategoryAccordion key={category} title={category} itemCount={items.length}>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase sticky left-0 bg-slate-800 z-10">Nombre</th>
                                                {INVENTORY_LOCATIONS.map(loc => <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase" key={loc}>{loc}</th>)}
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Total</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {items.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-700/50">
                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-white sticky left-0 bg-slate-800 z-10">{item.name}</td>
                                                 {INVENTORY_LOCATIONS.map(loc => (
                                                    <td key={loc} className="px-2 py-1 whitespace-nowrap">
                                                        <input 
                                                            type="text"
                                                            value={
                                                                tempStockValues[`${item.id}-${loc}`] !== undefined
                                                                    ? tempStockValues[`${item.id}-${loc}`]
                                                                    : (item.stockByLocation?.[loc] ? String(item.stockByLocation[loc]).replace('.', ',') : '')
                                                            }
                                                            onChange={e => handleStockInputChange(item.id, loc, e.target.value)}
                                                            onBlur={() => handleStockInputBlur(item, loc)}
                                                            className="bg-slate-700 text-white rounded p-1 w-20 text-center border border-slate-600"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2 whitespace-nowrap text-2xl text-green-400 font-bold">{calculateTotalStock(item).toFixed(1).replace('.', ',')}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right text-sm">
                                                    <button onClick={() => openInventoryModal(item)} className="text-indigo-400 mr-4"><PencilIcon/></button>
                                                    <button onClick={() => window.confirm('¿Seguro que quieres eliminar este artículo?') && onDeleteInventoryItem(item.id)} className="text-red-500"><TrashIcon/></button>
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
            
            {activeTab === 'orders' && (
                 <div>
                    <div className="text-right mb-4">
                        <button onClick={() => openOrderModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300 ml-auto">
                            <PlusIcon /> <span className="hidden sm:inline">Nuevo Pedido</span>
                        </button>
                    </div>
                    <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
                       <table className="min-w-full divide-y divide-gray-700">
                             <thead className="bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Fecha Pedido</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Proveedor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Monto Total</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {purchaseOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.orderDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{order.supplierName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            order.status === PurchaseOrderStatus.Completed ? 'bg-green-500/20 text-green-400' :
                                            order.status === PurchaseOrderStatus.Pending ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                                        }`}>{order.status}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">{order.totalAmount.toFixed(2)}€</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button onClick={() => openOrderModal(order)} className="text-indigo-400 mr-4"><PencilIcon/></button>
                                        <button onClick={() => window.confirm('¿Seguro que quieres eliminar este pedido?') && onDeletePurchaseOrder(order.id)} className="text-red-500"><TrashIcon/></button>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'analysis' && (
                <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto p-4">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Análisis de Consumo Semanal</h2>
                        <button 
                            onClick={handleSaveCurrentInventory} 
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
                        >
                            Guardar Análisis en Historial
                        </button>
                    </div>
                    <table className="min-w-full divide-y divide-gray-700">
                         <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Artículo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Stock Actual</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">En Pedidos</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Stock Inicial Total</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Stock Fin de Semana</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Consumo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {inventoryItems.map(item => {
                                const totalStock = calculateTotalStock(item);
                                const pendingStock = stockInOrders[item.id] || 0;
                                const initialTotalStock = totalStock + pendingStock;
                                const endStock = parseDecimal(endOfWeekStock[item.id] || '0');
                                const consumption = initialTotalStock - endStock;

                                return (
                                    <tr key={item.id} className="hover:bg-gray-700/50">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">{item.name}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{totalStock.toFixed(1)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-400">{pendingStock.toFixed(1)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-400 font-bold">{initialTotalStock.toFixed(1)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <input 
                                                type="text"
                                                value={endOfWeekStock[item.id] || ''}
                                                onChange={e => handleEndStockChange(item.id, e.target.value)}
                                                className="bg-gray-700 text-white rounded p-2 w-28 border border-gray-600"
                                                placeholder='0'
                                            />
                                        </td>
                                        <td className={`px-4 py-4 whitespace-nowrap text-sm font-bold ${consumption >= 0 ? 'text-green-400' : 'text-red-400'}`}>{consumption.toFixed(1)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-gray-800 shadow-xl rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Historial de Inventarios Guardados</h2>
                    {validInventoryHistory.length > 0 ? (
                        <ul className="space-y-3">
                            {validInventoryHistory.map((record: InventoryRecord) => (
                                <li key={record.id} className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                                    <div>
                                        <p className="font-semibold text-white">Análisis de Inventario Guardado</p>
                                        <p className="text-sm text-slate-400">
                                            {new Date(record.date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => exportInventoryRecordToCSV(record)}
                                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
                                    >
                                        <ExportIcon />
                                        Exportar a CSV
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-10 text-slate-500">
                            <p>No hay análisis guardados en el historial.</p>
                            <p className="text-sm mt-2">Ve a la pestaña de 'Análisis' para guardar el estado actual del inventario.</p>
                        </div>
                    )}
                </div>
            )}
            
            {isInventoryModalOpen && (
                <Modal title={currentInventoryItem.id ? "Editar Artículo" : "Nuevo Artículo"} onClose={closeInventoryModal} onSave={handleSaveInventory}>
                    {renderInventoryForm()}
                </Modal>
            )}

            {isOrderModalOpen && (
                <Modal title={('id' in currentPurchaseOrder) ? "Editar Pedido" : "Nuevo Pedido"} onClose={closeOrderModal} onSave={handleSaveOrder}>
                    {renderOrderForm()}
                </Modal>
            )}
            
            {isDriveModalOpen && (
                 <Modal title="Conectar con Google Drive" onClose={() => setDriveModalOpen(false)} onSave={() => {}}>
                    {renderDriveModal()}
                </Modal>
            )}

        </div>
    );
};

export default InventoryComponent;
