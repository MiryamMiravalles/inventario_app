import React, { useState, useMemo } from 'react';
import { StructuralCost, StructuralCostType } from '../types';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOfficeIcon } from './icons';

interface StructuralCostProps {
    structuralCosts: StructuralCost[];
    onSave: (cost: StructuralCost) => void;
    onDelete: (id: string) => void;
}

const emptyCost: Omit<StructuralCost, 'id'> = {
    name: '',
    amount: 0,
    type: StructuralCostType.Fixed,
    category: '',
    date: new Date().toISOString().split('T')[0],
};

const parseCurrency = (input: string): number => {
    if (typeof input !== 'string' || !input) return 0;
    const sanitized = input.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,/g, '.');
    const number = parseFloat(sanitized);
    return isNaN(number) ? 0 : number;
};

const StructuralCostComponent: React.FC<StructuralCostProps> = ({ structuralCosts, onSave, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCost, setCurrentCost] = useState<StructuralCost | Omit<StructuralCost, 'id'>>(emptyCost);

    const openModal = (cost?: StructuralCost) => {
        setCurrentCost(cost || emptyCost);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentCost(emptyCost);
    };

    const handleSave = () => {
        onSave({ id: (currentCost as StructuralCost).id || crypto.randomUUID(), ...currentCost });
        closeModal();
    };

    const handleChange = (field: keyof Omit<StructuralCost, 'id'>, value: string | number | StructuralCostType) => {
        setCurrentCost(prev => ({ ...prev, [field]: value }));
    };
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    const { monthlyTotal, fixedCosts, variableCosts } = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthlyCosts = structuralCosts.filter(cost => {
            // Add time to avoid timezone issues with YYYY-MM-DD strings
            const costDate = new Date(cost.date + 'T00:00:00');
            return costDate.getFullYear() === currentYear && costDate.getMonth() === currentMonth;
        });
        
        const total = monthlyCosts.reduce((sum, cost) => sum + cost.amount, 0);

        const fixed = structuralCosts.filter(c => c.type === StructuralCostType.Fixed);
        const variable = structuralCosts.filter(c => c.type === StructuralCostType.Variable);

        return { monthlyTotal: total, fixedCosts: fixed, variableCosts: variable };
    }, [structuralCosts]);

    const renderForm = () => (
        <div className="space-y-4">
            <input type="text" placeholder="Nombre del Gasto" value={currentCost.name} onChange={e => handleChange('name', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
            <input type="text" placeholder="Categoría" value={currentCost.category} onChange={e => handleChange('category', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
            <select value={currentCost.type} onChange={e => handleChange('type', e.target.value as StructuralCostType)} className="bg-gray-700 text-white rounded p-2 w-full">
                <option value={StructuralCostType.Fixed}>Fijo</option>
                <option value={StructuralCostType.Variable}>Variable</option>
            </select>
            <div className="relative">
                <input type="text" placeholder="Monto" value={currentCost.amount === 0 ? '' : String(currentCost.amount)} onChange={e => handleChange('amount', parseCurrency(e.target.value))} className="bg-gray-700 text-white rounded p-2 w-full pr-8" />
                 <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">€</span>
            </div>
            <input type="date" value={currentCost.date} onChange={e => handleChange('date', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
        </div>
    );

    const renderCostList = (costs: StructuralCost[], title: string) => (
        <div>
            <h3 className="text-lg font-semibold text-slate-200 mt-6 mb-3">{title}</h3>
            {costs.length > 0 ? (
                <ul className="space-y-3">
                    {costs.map(cost => (
                        <li key={cost.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg hover:bg-slate-700/50 transition-colors duration-200">
                            <div>
                                <p className="font-medium text-white">{cost.name}</p>
                                <p className="text-sm text-slate-400">{cost.date} - {cost.category}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-red-400 font-bold">{formatCurrency(cost.amount)}</span>
                                <button onClick={() => openModal(cost)} className="text-indigo-400 hover:text-indigo-300"><PencilIcon /></button>
                                <button onClick={() => window.confirm('¿Seguro que quieres eliminar este gasto?') && onDelete(cost.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-slate-500 italic mt-2">No hay gastos de este tipo.</p>
            )}
        </div>
    );

    return (
        <div className="p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Gastos de Estructura</h1>
                <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300">
                    <PlusIcon />
                    <span className="hidden sm:inline">Añadir Nuevo Gasto</span>
                </button>
            </div>

            <div className="bg-slate-800 shadow-xl rounded-lg p-6">
                <div className="flex items-center gap-4 border-b border-slate-700 pb-6 mb-6">
                     <div className="bg-slate-700 p-3 rounded-lg text-blue-400">
                        <BuildingOfficeIcon />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Coste Estructural Total (Mes Actual)</p>
                        <p className="text-3xl font-bold text-red-400">{formatCurrency(monthlyTotal)}</p>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold text-white">Historial de Gastos</h2>
                    {renderCostList(fixedCosts, 'Gastos Fijos')}
                    {renderCostList(variableCosts, 'Gastos Variables')}
                </div>
            </div>

            {isModalOpen && (
                <Modal title={('id' in currentCost) ? "Editar Gasto" : "Añadir Nuevo Gasto"} onClose={closeModal} onSave={handleSave}>
                    {renderForm()}
                </Modal>
            )}
        </div>
    );
};

export default StructuralCostComponent;