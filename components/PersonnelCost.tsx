import React, { useState, useEffect } from 'react';
import { Employee, EmployeeType } from '../types';
import Modal from './Modal';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';

interface PersonnelCostProps {
    employees: Employee[];
    onSave: (employee: Employee) => void;
    onDelete: (id: string) => void;
}

const emptyEmployee: Omit<Employee, 'id'> = {
    name: '',
    type: EmployeeType.Hourly,
    hourlyRate: 0,
    salary: 0,
    otherCosts: 0
};

const parseCurrency = (input: string): number => {
    if (typeof input !== 'string' || !input) return 0;
    const sanitized = input.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,/g, '.');
    const number = parseFloat(sanitized);
    return isNaN(number) ? 0 : number;
};

const PersonnelCost: React.FC<PersonnelCostProps> = ({ employees, onSave, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState<Employee | Omit<Employee, 'id'>>(emptyEmployee);

    useEffect(() => {
        if(currentEmployee.type === EmployeeType.Salaried) {
            setCurrentEmployee(e => ({...e, hourlyRate: 0}));
        } else {
            setCurrentEmployee(e => ({...e, salary: 0}));
        }
    }, [currentEmployee.type]);

    const openModal = (employee?: Employee) => {
        setCurrentEmployee(employee || emptyEmployee);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentEmployee(emptyEmployee);
    };

    const handleSave = () => {
        onSave({ id: (currentEmployee as Employee).id || crypto.randomUUID(), ...currentEmployee });
        closeModal();
    };
    
    const handleChange = (field: keyof Omit<Employee, 'id'>, value: string | number | EmployeeType) => {
        setCurrentEmployee(prev => ({...prev, [field]: value}));
    };

    const renderForm = () => (
        <div className="space-y-4">
            <input type="text" placeholder="Nombre" value={currentEmployee.name} onChange={e => handleChange('name', e.target.value)} className="bg-gray-700 text-white rounded p-2 w-full" />
            <select value={currentEmployee.type} onChange={e => handleChange('type', e.target.value as EmployeeType)} className="bg-gray-700 text-white rounded p-2 w-full">
                <option value={EmployeeType.Hourly}>Por Hora</option>
                <option value={EmployeeType.Salaried}>Asalariado</option>
            </select>
            {currentEmployee.type === EmployeeType.Hourly ? (
                <div className="relative">
                    <input type="text" placeholder="Tarifa por Hora" value={currentEmployee.hourlyRate === 0 ? '' : currentEmployee.hourlyRate} onChange={e => handleChange('hourlyRate', parseCurrency(e.target.value))} className="bg-gray-700 text-white rounded p-2 w-full pr-10" />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">€/h</span>
                </div>
            ) : (
                <div className="relative">
                    <input type="text" placeholder="Salario Mensual" value={currentEmployee.salary === 0 ? '' : currentEmployee.salary} onChange={e => handleChange('salary', parseCurrency(e.target.value))} className="bg-gray-700 text-white rounded p-2 w-full pr-8" />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">€</span>
                </div>
            )}
            <div className="relative">
                <input type="text" placeholder="Otros Costos (beneficios, etc.)" value={currentEmployee.otherCosts === 0 ? '' : currentEmployee.otherCosts} onChange={e => handleChange('otherCosts', parseCurrency(e.target.value))} className="bg-gray-700 text-white rounded p-2 w-full pr-8" />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none">€</span>
            </div>
        </div>
    );
    
    return (
        <div className="p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Gestión de Personal</h1>
                <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300">
                    <PlusIcon />
                    <span className="hidden sm:inline">Nuevo Empleado</span>
                </button>
            </div>

            <div className="bg-gray-800 shadow-xl rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tarifa / Salario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Otros Costos</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {employees.map(employee => (
                                <tr key={employee.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{employee.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{employee.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{employee.type === EmployeeType.Hourly ? `${employee.hourlyRate}€/h` : `${employee.salary}€/mes`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{employee.otherCosts}€</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openModal(employee)} className="text-indigo-400 hover:text-indigo-300 mr-4"><PencilIcon /></button>
                                        <button onClick={() => window.confirm('¿Seguro que quieres eliminar a este empleado?') && onDelete(employee.id)} className="text-red-500 hover:text-red-400"><TrashIcon /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <Modal title={('id' in currentEmployee) ? "Editar Empleado" : "Nuevo Empleado"} onClose={closeModal} onSave={handleSave}>
                    {renderForm()}
                </Modal>
            )}
        </div>
    );
};

export default PersonnelCost;