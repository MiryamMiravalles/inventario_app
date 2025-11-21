import React, { useMemo, useState } from 'react';
import { CashFlowSession, Employee, SupplierExpense, StructuralCost, EmployeeType } from '../types';
import { TrendingUpIcon, TrendingDownIcon, ScaleIcon, BreakdownIcon, CalendarIcon } from './icons';

interface DashboardProps {
    sessions: CashFlowSession[];
    employees: Employee[];
    supplierExpenses: SupplierExpense[];
    structuralCosts: StructuralCost[];
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; bgColorClass: string; iconClasses: string; }> = ({ title, value, icon, bgColorClass, iconClasses }) => (
    <div className={`${bgColorClass} rounded-lg shadow-lg p-5 flex items-center space-x-4`}>
        <div className={`rounded-full p-3 ${iconClasses}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-300 font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ sessions, employees, supplierExpenses, structuralCosts }) => {
    const [currentDate, setCurrentDate] = useState(new Date('2025-11-01'));

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const monthlyData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const filterByMonth = (dateStr: string) => {
            // Add a day to handle potential timezone issues with YYYY-MM-DD strings
            const date = new Date(dateStr + 'T00:00:00');
            return date.getFullYear() === year && date.getMonth() === month;
        };

        const filteredSessions = sessions.filter(s => filterByMonth(s.date));
        const filteredSupplierExpenses = supplierExpenses.filter(e => filterByMonth(e.date));
        const filteredStructuralCosts = structuralCosts.filter(c => filterByMonth(c.date));

        const totalIncome = filteredSessions.reduce((acc, session) => {
            // FIX: `Object.values` may return `unknown[]`, so ensure values are cast to number before summing.
            return acc + (Object.values(session.income) as number[]).reduce((sum, val) => sum + (val || 0), 0);
        }, 0);
        
        const personnelCostHourly = filteredSessions.reduce((acc, session) => {
            const cost = session.workedHours.reduce((sum, wh) => {
                const employee = employees.find(e => e.id === wh.employeeId);
                if (!employee || employee.type !== EmployeeType.Hourly) return sum;
                return sum + (wh.hours * (employee.hourlyRate || 0));
            }, 0);
            return acc + cost;
        }, 0);
        
        const personnelCostSalaried = employees.reduce((sum, emp) => {
            if(emp.type === EmployeeType.Salaried) {
                 return sum + (emp.salary || 0) + (emp.otherCosts || 0);
            }
            return sum;
        }, 0);

        const totalSupplierCost = filteredSupplierExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        const totalStructuralCost = filteredStructuralCosts.reduce((acc, cost) => acc + cost.amount, 0);

        const totalExpenses = personnelCostHourly + personnelCostSalaried + totalSupplierCost + totalStructuralCost;
        const netBenefit = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            netBenefit,
            personnelCostHourly,
            personnelCostSalaried,
            totalSupplierCost,
            totalStructuralCost
        };

    }, [sessions, employees, supplierExpenses, structuralCosts, currentDate]);
    
    const breakdownItems = [
        { label: 'Personal por Horas', value: monthlyData.personnelCostHourly, color: 'bg-orange-400' },
        { label: 'Personal Fijo', value: monthlyData.personnelCostSalaried, color: 'bg-purple-400' },
        { label: 'Gastos de Proveedores', value: monthlyData.totalSupplierCost, color: 'bg-blue-400' },
        { label: 'Gastos de Estructura', value: monthlyData.totalStructuralCost, color: 'bg-teal-400' },
    ];

    const totalBreakdownCost = breakdownItems.reduce((sum, item) => sum + item.value, 0);
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Add '-02' to prevent timezone issues where it might be interpreted as the previous month
        const date = new Date(e.target.value + '-02');
        setCurrentDate(date);
    };

    const monthYearDisplay = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate);

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white capitalize">Dashboard: Resumen de {monthYearDisplay}</h1>
                <div className="relative">
                    <input
                        type="month"
                        value={`${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`}
                        onChange={handleDateChange}
                        className="bg-slate-800 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Ingresos Totales" 
                    value={formatCurrency(monthlyData.totalIncome)} 
                    icon={<TrendingUpIcon />}
                    bgColorClass="bg-slate-800"
                    iconClasses="bg-green-500/20 text-green-400"
                />
                <StatCard 
                    title="Gastos Totales" 
                    value={formatCurrency(monthlyData.totalExpenses)} 
                    icon={<TrendingDownIcon />}
                    bgColorClass="bg-slate-800"
                    iconClasses="bg-red-500/20 text-red-400"
                />
                 <StatCard 
                    title="Beneficio Neto" 
                    value={formatCurrency(monthlyData.netBenefit)} 
                    icon={<ScaleIcon />}
                    bgColorClass="bg-green-800/80"
                    iconClasses="bg-green-900/80 text-green-300"
                />
            </div>

            <div className="bg-slate-800 rounded-lg shadow-lg p-6 space-y-4">
                <div className="flex items-center space-x-3">
                    <BreakdownIcon/>
                    <div>
                        <h2 className="text-xl font-bold text-white">Desglose de Gastos</h2>
                        <p className="text-xs text-slate-400">Los porcentajes en la lista se calculan en base a los ingresos totales del mes.</p>
                    </div>
                </div>
                <div className="space-y-3 pt-2">
                    {breakdownItems.map(item => (
                         <div key={item.label} className="flex justify-between items-center text-sm">
                            <div className="flex items-center">
                                <span className={`h-2.5 w-2.5 ${item.color} rounded-full mr-3`}></span>
                                <span className="text-slate-300">{item.label}</span>
                            </div>
                            <div className="font-medium">
                                <span className="text-white">{formatCurrency(item.value)}</span>
                                <span className="text-slate-400 w-20 inline-block text-right">
                                    ({monthlyData.totalIncome > 0 ? ((item.value / monthlyData.totalIncome) * 100).toFixed(1) : '0.0'}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-700 my-4"></div>
                 <div className="flex justify-between items-center font-bold">
                    <span className="text-base text-white">Coste Total del Desglose</span>
                    <span className="text-lg text-white">{formatCurrency(totalBreakdownCost)}</span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
