import React, { useState, useMemo } from 'react';
import { CashFlowSession, Employee, SupplierExpense, StructuralCost, EmployeeType } from '../types';
import { TrendingUpIcon, TrendingDownIcon, TowerBalanceIcon, CalendarIcon, ChevronDownIcon } from './icons';

// Accordion Component
interface AccordionProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    icon?: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, isOpen, onToggle, icon }) => {
    return (
        <div className="bg-slate-800 rounded-lg shadow-lg">
            <button
                onClick={onToggle}
                className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
                aria-expanded={isOpen}
            >
                <span className="flex items-center gap-3">
                    {icon}
                    {title}
                </span>
                <ChevronDownIcon className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div 
                className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="p-4 border-t border-slate-700">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Stat Card
interface AnnualStatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    iconBgColor: string;
    bgColor?: string;
}

const AnnualStatCard: React.FC<AnnualStatCardProps> = ({ title, value, icon, iconBgColor, bgColor = 'bg-slate-800' }) => (
    <div className={`${bgColor} rounded-lg shadow-lg p-5 flex items-center justify-between`}>
        <div>
            <p className="text-sm text-slate-300 font-medium">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${iconBgColor}`}>
            {icon}
        </div>
    </div>
);


interface AnnualSummaryProps {
    sessions: CashFlowSession[];
    employees: Employee[];
    supplierExpenses: SupplierExpense[];
    structuralCosts: StructuralCost[];
}

const AnnualSummary: React.FC<AnnualSummaryProps> = ({ sessions, employees, supplierExpenses, structuralCosts }) => {
    
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        sessions.forEach(s => years.add(new Date(s.date + 'T00:00:00').getFullYear()));
        supplierExpenses.forEach(e => years.add(new Date(e.date + 'T00:00:00').getFullYear()));
        structuralCosts.forEach(c => years.add(new Date(c.date + 'T00:00:00').getFullYear()));
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        if (sortedYears.length === 0) return [new Date().getFullYear()];
        return sortedYears;
    }, [sessions, supplierExpenses, structuralCosts]);
    
    const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] || new Date().getFullYear());
    const [isBreakdownOpen, setBreakdownOpen] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const annualData = useMemo(() => {
        const filterByYear = (dateStr: string) => new Date(dateStr + 'T00:00:00').getFullYear() === selectedYear;

        const filteredSessions = sessions.filter(s => filterByYear(s.date));
        const filteredSupplierExpenses = supplierExpenses.filter(e => filterByYear(e.date));
        const filteredStructuralCosts = structuralCosts.filter(c => filterByYear(c.date));

        const totalIncome = filteredSessions.reduce((acc, session) => {
            // FIX: `Object.values` may return `unknown[]`, so we must cast values to number before summing.
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
        
        const uniqueMonthsWithActivity = new Set(
          [...sessions, ...supplierExpenses, ...structuralCosts]
            .filter(item => filterByYear(item.date))
            .map(item => new Date(item.date + 'T00:00:00').getMonth())
        );

        const personnelCostSalaried = employees
            .filter(e => e.type === EmployeeType.Salaried)
            .reduce((sum, emp) => {
                return sum + (emp.salary || 0) * uniqueMonthsWithActivity.size + (emp.otherCosts || 0) * uniqueMonthsWithActivity.size;
            }, 0);

        const totalSupplierCost = filteredSupplierExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        const totalStructuralCost = filteredStructuralCosts.reduce((acc, cost) => acc + cost.amount, 0);

        const totalExpenses = personnelCostHourly + personnelCostSalaried + totalSupplierCost + totalStructuralCost;
        const netBenefit = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            netBenefit
        };
    }, [selectedYear, sessions, employees, supplierExpenses, structuralCosts]);
    
     const monthlyBreakdown = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => ({
            name: new Date(selectedYear, i).toLocaleString('es-ES', { month: 'long' }),
            income: 0,
            expenses: 0,
        }));

        const filterByMonth = (dateStr: string, month: number) => {
            const date = new Date(dateStr + 'T00:00:00');
            return date.getFullYear() === selectedYear && date.getMonth() === month;
        };
        
        for (let i = 0; i < 12; i++) {
            const monthSessions = sessions.filter(s => filterByMonth(s.date, i));
            const monthSuppliers = supplierExpenses.filter(s => filterByMonth(s.date, i));
            const monthStructural = structuralCosts.filter(s => filterByMonth(s.date, i));

            // FIX: `Object.values` can return `unknown[]`, so we must cast values to number before summing.
            months[i].income = monthSessions.reduce((acc, session) => acc + (Object.values(session.income) as number[]).reduce((sum, v) => sum + (v || 0), 0), 0);

            const hourly = monthSessions.reduce((acc, session) => acc + session.workedHours.reduce((sum, wh) => {
                const emp = employees.find(e => e.id === wh.employeeId);
                return sum + (wh.hours * (emp?.hourlyRate || 0));
            }, 0), 0);

            const hasActivity = monthSessions.length > 0 || monthSuppliers.length > 0 || monthStructural.length > 0;
            const salaried = hasActivity
                ? employees.filter(e => e.type === EmployeeType.Salaried).reduce((sum, emp) => sum + (emp.salary || 0) + (emp.otherCosts || 0), 0)
                : 0;

            const suppliers = monthSuppliers.reduce((sum, e) => sum + e.amount, 0);
            const structural = monthStructural.reduce((sum, c) => sum + c.amount, 0);
            
            months[i].expenses = hourly + suppliers + structural + salaried;
        }
        
        return months;
    }, [selectedYear, sessions, employees, supplierExpenses, structuralCosts]);


    return (
        <div className="p-4 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-100">Resumen Anual: {selectedYear}</h1>
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon />
                    </div>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AnnualStatCard 
                    title="Ingresos Totales"
                    value={formatCurrency(annualData.totalIncome)}
                    icon={<TrendingUpIcon />}
                    iconBgColor="bg-green-500/80 text-white"
                />
                 <AnnualStatCard 
                    title="Gastos Totales"
                    value={formatCurrency(annualData.totalExpenses)}
                    icon={<TrendingDownIcon />}
                    iconBgColor="bg-red-500/80 text-white"
                />
                 <AnnualStatCard 
                    title="Beneficio Neto Anual"
                    value={formatCurrency(annualData.netBenefit)}
                    icon={<TowerBalanceIcon />}
                    iconBgColor="bg-emerald-800 text-emerald-300"
                    bgColor="bg-emerald-900/60"
                />
            </div>
            
             <div>
                <Accordion 
                    title="Desglose Mensual" 
                    isOpen={isBreakdownOpen} 
                    onToggle={() => setBreakdownOpen(!isBreakdownOpen)}
                    icon={<svg className="h-6 w-6 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                >
                     <div className="bg-slate-900/50 shadow-inner rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Mes</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Ingresos</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Gastos</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Neto</th>
                                </tr>
                            </thead>
                            <tbody className="bg-slate-800 divide-y divide-slate-700">
                                {monthlyBreakdown.map(month => {
                                    const net = month.income - month.expenses;
                                    const hasData = month.income > 0 || month.expenses > 0;
                                    return (
                                        <tr key={month.name} className={`${hasData ? 'hover:bg-slate-700/50' : 'opacity-50'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white capitalize">{month.name}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${hasData ? 'text-green-400' : 'text-slate-400'}`}>{formatCurrency(month.income)}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${hasData ? 'text-red-400' : 'text-slate-400'}`}>{formatCurrency(month.expenses)}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'} ${!hasData && 'text-slate-400'}`}>{formatCurrency(net)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Accordion>
            </div>
        </div>
    );
};

export default AnnualSummary;
