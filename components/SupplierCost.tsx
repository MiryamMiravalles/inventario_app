import React, { useState, useMemo } from 'react';
import { SupplierExpense } from '../types';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, CogIcon, TrendingDownIcon, ArrowPathIcon, DocumentDuplicateIcon } from './icons';

interface SupplierCostProps {
    supplierExpenses: SupplierExpense[];
    onSave: (expense: SupplierExpense) => void;
    onDelete: (id: string) => void;
}

const emptyExpense: Omit<SupplierExpense, 'id'> = {
    supplierName: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
};

const parseCurrency = (input: string): number => {
    if (typeof input !== 'string' || !input) return 0;
    const sanitized = input.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,/g, '.');
    const number = parseFloat(sanitized);
    
    if (isNaN(number)) {
        if (input.trim().length > 0) {
            console.warn(`Invalid number format provided: "${input}". The value has been reset to 0.`);
        }
        return 0;
    }
    return number;
};

const SupplierCost: React.FC<SupplierCostProps> = ({ supplierExpenses, onSave, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<SupplierExpense | Omit<SupplierExpense, 'id'>>(emptyExpense);

    const openModal = (expense?: SupplierExpense) => {
        setCurrentExpense(expense || emptyExpense);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentExpense(emptyExpense);
    };

    const handleSave = () => {
        onSave({ id: (currentExpense as SupplierExpense).id || crypto.randomUUID(), ...currentExpense });
        closeModal();
    };

    const handleChange = (field: keyof Omit<SupplierExpense, 'id'>, value: string | number) => {
        setCurrentExpense(prev => ({ ...prev, [field]: value }));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const totalExpense = useMemo(() => {
        return supplierExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, [supplierExpenses]);

    const expenseBySupplier = useMemo(() => {
        const bySupplier: { [key: string]: number } = {};
        supplierExpenses.forEach(exp => {
            bySupplier[exp.supplierName] = (bySupplier[exp.supplierName] || 0) + exp.amount;
        });
        return Object.entries(bySupplier)
            .sort(([, a], [, b]) => b - a)
            .map(([name, amount]) => ({ name, amount }));
    }, [supplierExpenses]);

    const renderForm = () => (
        <div className="space-y-4">
            <input type="text" placeholder="Nombre Proveedor" value={currentExpense.supplierName} onChange={e => handleChange('supplierName', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
            <input type="text" placeholder="Descripción" value={currentExpense.description} onChange={e => handleChange('description', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
            <div className="relative">
                <input type="text" placeholder="Monto" value={currentExpense.amount === 0 ? '' : currentExpense.amount} onChange={e => handleChange('amount', parseCurrency(e.target.value))} className="bg-gray-700 text-white rounded p-2 w-full pr-8" />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">€</span>
            </div>
            <input type="date" value={currentExpense.date} onChange={e => handleChange('date', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
        </div>
    );

    return (
        <div className="p-4 animate-fade-in space-y-6 text-slate-300">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Gestión de Proveedores</h1>
                <div className="flex items-center gap-4">
                    <button className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300">
                        <CogIcon />
                        <span className="hidden sm:inline">Gestionar</span>
                    </button>
                    <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300">
                        <PlusIcon />
                        <span className="hidden sm:inline">Añadir Gasto</span>
                    </button>
                </div>
            </div>

            {/* Total Expense Card */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-slate-400">Gasto Total en Proveedores</p>
                        <p className="text-4xl font-bold text-red-400 mt-2">{formatCurrency(totalExpense)}</p>
                    </div>
                    <div className="text-red-500">
                        <TrendingDownIcon />
                    </div>
                </div>
            </div>
            
            {/* Expense by Supplier Card */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <ArrowPathIcon />
                    <h2 className="text-xl font-bold text-white">Gasto Total por Proveedor</h2>
                </div>
                {expenseBySupplier.length > 0 ? (
                   <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                       {expenseBySupplier.map(s => (
                           <li key={s.name} className="flex justify-between items-center text-sm">
                               <span className="font-medium text-slate-300">{s.name}</span>
                               <span className="font-bold text-red-400">{formatCurrency(s.amount)}</span>
                           </li>
                       ))}
                   </ul>
                ) : (
                     <p className="text-slate-500 italic">No hay gastos para mostrar.</p>
                )}
            </div>
            
            {/* History Card */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg min-h-[300px] flex flex-col">
                <h2 className="text-xl font-bold text-white mb-4">Historial de Gastos</h2>
                {supplierExpenses.length > 0 ? (
                    <ul className="space-y-3 overflow-y-auto pr-2 flex-grow">
                        {supplierExpenses.map(expense => (
                            <li key={expense.id} className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                                <div>
                                    <p className="font-semibold text-white">{expense.supplierName}</p>
                                    <p className="text-sm text-slate-400">{expense.description}</p>
                                    <p className="text-xs text-slate-500">{expense.date}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="font-bold text-red-400">{formatCurrency(expense.amount)}</span>
                                    <button onClick={() => openModal(expense)} className="text-indigo-400 hover:text-indigo-300"><PencilIcon /></button>
                                    <button onClick={() => window.confirm('¿Seguro que quieres eliminar este gasto?') && onDelete(expense.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-grow text-center">
                        <DocumentDuplicateIcon />
                        <p className="font-semibold text-slate-400 mt-4">No hay gastos de proveedores</p>
                        <p className="text-sm text-slate-500">Añade un nuevo gasto para empezar a llevar el control.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <Modal title={('id' in currentExpense) ? "Editar Gasto" : "Nuevo Gasto"} onClose={closeModal} onSave={handleSave}>
                    {renderForm()}
                </Modal>
            )}
        </div>
    );
};

export default SupplierCost;
