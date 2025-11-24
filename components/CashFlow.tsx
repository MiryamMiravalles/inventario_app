import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  CashFlowSession,
  Income,
  Expense,
  PaymentBreakdown,
  PaymentMethodSplit,
  IncomeSource,
} from "../types";
import {
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  FileIcon,
  MoneyBagIcon,
  CogIcon,
  PlusIcon,
  GoogleDriveIcon,
} from "./icons";
import Modal from "./Modal";

// Accordion Component
interface AccordionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  children,
  isOpen,
  onToggle,
}) => {
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-bold text-slate-200 hover:bg-slate-700/50 rounded-t-lg transition-colors"
        aria-expanded={isOpen}
      >
        <span>{title}</span>
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
          <div className="p-4 border-t border-slate-700">{children}</div>
        </div>
      </div>
    </div>
  );
};

interface CashFlowProps {
  sessions: CashFlowSession[];
  incomeSources: IncomeSource[];
  onUpdateIncomeSources: (sources: IncomeSource[]) => void;
  onSave: (session: CashFlowSession) => void;
  onDelete: (id: string) => void;
}

const mockDriveFiles = [
  { id: "cf_file1", name: "Cierre_Caja_Noviembre.csv" },
  { id: "cf_file2", name: "Historial_Ventas_2025.xlsx" },
];

const parseCurrency = (input: string): number => {
  if (typeof input !== "string" || !input) return 0;
  const sanitized = input.replace(",", ".");
  const number = parseFloat(sanitized);
  return isNaN(number) ? 0 : number;
};

const formatLocaleCurrency = (num: number) => {
  return num.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const CashFlow: React.FC<CashFlowProps> = ({
  sessions,
  incomeSources,
  onUpdateIncomeSources,
  onSave,
  onDelete,
}) => {
  const [isAddSessionOpen, setAddSessionOpen] = useState(true);
  const [isHistoryOpen, setHistoryOpen] = useState(true);

  // Dynamic initialization based on incomeSources
  const createEmptySession = (): Omit<CashFlowSession, "id"> => {
    const initialIncome: Income = {};
    const initialPayment: PaymentBreakdown = {};
    incomeSources.forEach((source) => {
      initialIncome[source.id] = 0;
      initialPayment[source.id] = { cash: 0, card: 0 };
    });

    return {
      date: new Date().toISOString().split("T")[0],
      description: "",
      income: initialIncome,
      expenses: [],
      paymentBreakdown: initialPayment,
      workedHours: [],
    };
  };

  const [currentSession, setCurrentSession] = useState<
    CashFlowSession | Omit<CashFlowSession, "id">
  >(createEmptySession());
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [formInputValues, setFormInputValues] = useState<
    Record<string, { cash: string; card: string }>
  >({});
  const [expenseInputValues, setExpenseInputValues] = useState<
    Record<number, string>
  >({});

  // Concepts Management State
  const [isConceptsModalOpen, setConceptsModalOpen] = useState(false);
  const [tempIncomeSources, setTempIncomeSources] = useState<IncomeSource[]>(
    []
  );

  // Drive State
  const [isDriveModalOpen, setDriveModalOpen] = useState(false);
  const [connectedFile, setConnectedFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const addSessionRef = useRef<HTMLDivElement>(null);

  const initializeForm = (session?: CashFlowSession) => {
    const s = session ? { ...session } : createEmptySession();

    // Ensure all current income sources exist in the session object for editing
    incomeSources.forEach((source) => {
      if (!s.income[source.id]) s.income[source.id] = 0;
      if (!s.paymentBreakdown[source.id])
        s.paymentBreakdown[source.id] = { cash: 0, card: 0 };
    });

    setCurrentSession(s);

    const initialFormValues: Record<string, { cash: string; card: string }> =
      {};
    incomeSources.forEach(({ id }) => {
      const breakdown = s.paymentBreakdown[id] || { cash: 0, card: 0 };
      initialFormValues[id] = {
        cash:
          breakdown.cash === 0 ? "" : String(breakdown.cash).replace(".", ","),
        card:
          breakdown.card === 0 ? "" : String(breakdown.card).replace(".", ","),
      };
    });
    setFormInputValues(initialFormValues);

    const initialExpenseValues: Record<number, string> = {};
    s.expenses.forEach((exp, index) => {
      initialExpenseValues[index] =
        exp.amount === 0 ? "" : String(exp.amount).replace(".", ",");
    });
    setExpenseInputValues(initialExpenseValues);
  };

  const handleEditClick = (session: CashFlowSession) => {
    initializeForm(session);
    setAddSessionOpen(true);
    setTimeout(
      () => addSessionRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleToggleAddSession = () => {
    if (!isAddSessionOpen) {
      initializeForm();
    }
    setAddSessionOpen(!isAddSessionOpen);
  };

  const handleCancel = () => {
    initializeForm();
    setAddSessionOpen(false);
  };

  const handleSave = () => {
    onSave({
      id: (currentSession as CashFlowSession).id || crypto.randomUUID(),
      ...currentSession,
    });
    handleCancel();
  };

  const handleInputChange = <K extends keyof CashFlowSession>(
    field: K,
    value: CashFlowSession[K]
  ) => {
    setCurrentSession((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentBreakdownChange = (
    source: string,
    method: "cash" | "card",
    value: string
  ) => {
    // Allow only digits and a single comma followed by up to 2 digits
    if (value && !/^\d*([,]\d{0,2})?$/.test(value)) return;

    setFormInputValues((prev) => ({
      ...prev,
      [source]: { ...prev[source], [method]: value },
    }));
    const numericValue = parseCurrency(value);
    setCurrentSession((prev) => {
      const newBreakdown = {
        ...prev.paymentBreakdown,
        [source]: { ...prev.paymentBreakdown[source], [method]: numericValue },
      };
      const { cash, card } = newBreakdown[source];
      const newIncome = { ...prev.income, [source]: cash + card };
      return { ...prev, paymentBreakdown: newBreakdown, income: newIncome };
    });
  };

  const handleArrayChange = (
    section: "expenses",
    index: number,
    field: keyof Expense,
    value: any
  ) => {
    setCurrentSession((prev) => {
      const newArray = [...prev.expenses];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, expenses: newArray };
    });
  };

  const handleExpenseAmountChange = (index: number, value: string) => {
    // Allow only digits and a single comma followed by up to 2 digits
    if (value && !/^\d*([,]\d{0,2})?$/.test(value)) return;

    setExpenseInputValues((prev) => ({ ...prev, [index]: value }));

    const numericValue = parseCurrency(value);
    setCurrentSession((prev) => {
      const newArray = [...prev.expenses];
      newArray[index] = { ...newArray[index], amount: numericValue };
      return { ...prev, expenses: newArray };
    });
  };

  const addArrayItem = (section: "expenses") => {
    const newItem = { description: "", amount: 0 };
    setCurrentSession((prev) => {
      const updatedExpenses = [...prev.expenses, newItem];
      // Initialize the input value for the new item
      setExpenseInputValues((prevValues) => ({
        ...prevValues,
        [updatedExpenses.length - 1]: "",
      }));
      return { ...prev, expenses: updatedExpenses };
    });
  };

  const removeArrayItem = (section: "expenses", index: number) => {
    setCurrentSession((prev) => {
      const updatedExpenses = prev.expenses.filter((_, i) => i !== index);

      // Shift the input values
      setExpenseInputValues((prevValues) => {
        const newValues: Record<number, string> = {};
        updatedExpenses.forEach((_, i) => {
          if (i < index) {
            newValues[i] = prevValues[i];
          } else {
            newValues[i] = prevValues[i + 1];
          }
        });
        return newValues;
      });

      return { ...prev, expenses: updatedExpenses };
    });
  };

  // --- Concepts Management Handlers ---
  const openConceptsModal = () => {
    setTempIncomeSources([...incomeSources]);
    setConceptsModalOpen(true);
  };

  const saveConcepts = () => {
    onUpdateIncomeSources(tempIncomeSources);
    setConceptsModalOpen(false);
  };

  const updateTempSourceLabel = (index: number, label: string) => {
    const newSources = [...tempIncomeSources];
    newSources[index] = { ...newSources[index], label };
    setTempIncomeSources(newSources);
  };

  const removeTempSource = (index: number) => {
    const newSources = tempIncomeSources.filter((_, i) => i !== index);
    setTempIncomeSources(newSources);
  };

  const addTempSource = () => {
    const id = `concept_${Date.now()}`;
    setTempIncomeSources([
      ...tempIncomeSources,
      { id, label: "Nuevo Concepto" },
    ]);
  };

  // --- Drive Handlers ---
  const handleFileSelect = (file: { id: string; name: string }) => {
    setConnectedFile(file);
    setDriveModalOpen(false);
  };

  const handleSync = () => {
    if (!connectedFile) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("Sincronización simulada completada con éxito.");
    }, 1500);
  };

  const renderDriveModal = () => (
    <div className="space-y-3">
      <p className="text-slate-300">
        Seleccione un archivo de Google Drive para sincronizar:
      </p>
      <div className="space-y-2">
        {mockDriveFiles.map((file) => (
          <button
            key={file.id}
            onClick={() => handleFileSelect(file)}
            className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-3 text-slate-200"
          >
            <GoogleDriveIcon />
            {file.name}
          </button>
        ))}
      </div>
    </div>
  );
  // ------------------------------------

  const filteredSessions = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return sessions;
    return sessions.filter((session) => {
      if (dateRange.start && session.date < dateRange.start) return false;
      if (dateRange.end && session.date > dateRange.end) return false;
      return true;
    });
  }, [sessions, dateRange]);

  const calculateSessionNet = (session: CashFlowSession) => {
    const totalIncome = (Object.values(session.income) as number[]).reduce(
      (sum, val) => sum + (val || 0),
      0
    );
    const totalExpenses = session.expenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );
    return totalIncome - totalExpenses;
  };

  const accumulatedNetResult = useMemo(() => {
    return sessions.reduce(
      (total, session) => total + calculateSessionNet(session),
      0
    );
  }, [sessions]);

  const renderForm = () => {
    const totalIncome = (
      Object.values(currentSession.income) as number[]
    ).reduce((sum, val) => sum + (val || 0), 0);
    const { totalCash, totalCard } = (
      Object.values(currentSession.paymentBreakdown) as PaymentMethodSplit[]
    ).reduce(
      (acc, split) => ({
        totalCash: acc.totalCash + split.cash,
        totalCard: acc.totalCard + split.card,
      }),
      { totalCash: 0, totalCard: 0 }
    );

    return (
      <div className="space-y-4 text-slate-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="sessionDate"
              className="block text-sm font-medium text-slate-400 mb-1"
            >
              Fecha
            </label>
            <input
              id="sessionDate"
              type="date"
              value={currentSession.date}
              onChange={(e) => handleInputChange("date", e.target.value)}
              className="bg-slate-700 text-white rounded p-2 w-full border border-slate-600"
            />
          </div>
          <div>
            <label
              htmlFor="sessionDescription"
              className="block text-sm font-medium text-slate-400 mb-1"
            >
              Descripción
            </label>
            <input
              id="sessionDescription"
              type="text"
              placeholder="Ej: Noche de Sábado"
              value={currentSession.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="bg-slate-700 text-white rounded p-2 w-full border border-slate-600"
            />
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-md mt-4 overflow-x-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-white">Desglose de Caja</h3>
          </div>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-400 uppercase">
                  Concepto
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-400 uppercase">
                  TPV
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-400 uppercase">
                  Efectivo
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-400 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {incomeSources.map(({ id, label }) => (
                <tr key={id}>
                  <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-white">
                    {label}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={formInputValues[id]?.card ?? ""}
                      onChange={(e) =>
                        handlePaymentBreakdownChange(id, "card", e.target.value)
                      }
                      className="bg-slate-700 text-white rounded p-2 w-full"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={formInputValues[id]?.cash ?? ""}
                      onChange={(e) =>
                        handlePaymentBreakdownChange(id, "cash", e.target.value)
                      }
                      className="bg-slate-700 text-white rounded p-2 w-full"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      readOnly
                      value={`${formatLocaleCurrency(
                        currentSession.income[id] || 0
                      )}€`}
                      className="bg-slate-600 text-slate-300 rounded p-2 w-full cursor-not-allowed"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-700">
              <tr>
                <td className="px-2 pt-2 text-left text-sm font-bold text-white uppercase">
                  Total
                </td>
                <td className="px-2 pt-2 text-sm font-bold text-white">
                  {formatLocaleCurrency(totalCard)}€
                </td>
                <td className="px-2 pt-2 text-sm font-bold text-white">
                  {formatLocaleCurrency(totalCash)}€
                </td>
                <td className="px-2 pt-2 text-sm font-bold text-green-400">
                  {formatLocaleCurrency(totalIncome)}€
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-md mt-4">
          <h3 className="text-lg font-bold text-white mb-2">
            Gastos de la Sesión
          </h3>
          {currentSession.expenses.map((exp, index) => (
            <div key={index} className="flex gap-2 items-center mb-2">
              <input
                type="text"
                placeholder="Descripción"
                value={exp.description}
                onChange={(e) =>
                  handleArrayChange(
                    "expenses",
                    index,
                    "description",
                    e.target.value
                  )
                }
                className="bg-slate-700 text-white rounded p-2 flex-grow"
              />
              <input
                type="text"
                placeholder="€"
                value={expenseInputValues[index] ?? ""}
                onChange={(e) =>
                  handleExpenseAmountChange(index, e.target.value)
                }
                className="bg-slate-700 text-white rounded p-2 w-32 text-right"
              />
              <button
                onClick={() => removeArrayItem("expenses", index)}
                className="p-2 bg-red-600/80 hover:bg-red-600 rounded text-white"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <button
            onClick={() => addArrayItem("expenses")}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
          >
            + Añadir Gasto
          </button>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={handleCancel}
            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Guardar Sesión
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 animate-fade-in space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-100">
          Caja y Sesiones de Trabajo
        </h1>
        <div className="flex gap-2 flex-wrap">
          {!connectedFile ? (
            <button
              onClick={() => setDriveModalOpen(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
            >
              <GoogleDriveIcon />
              <span className="hidden sm:inline">Conectar Drive</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <span className="text-green-400 text-xs px-2 font-medium hidden md:inline">
                {connectedFile.name}
              </span>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded text-sm flex items-center gap-2 transition duration-300 disabled:opacity-50"
              >
                {isSyncing ? "..." : "Sync"}
              </button>
              <button
                onClick={() => setConnectedFile(null)}
                className="bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-sm font-bold"
                title="Desconectar"
              >
                X
              </button>
            </div>
          )}
          <button
            onClick={openConceptsModal}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition duration-300"
          >
            <CogIcon />
            <span className="hidden sm:inline">Configurar Conceptos</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg shadow-lg p-5 flex items-center space-x-4">
          <div className="text-violet-400">
            <FileIcon />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">
              Nº de Sesiones Registradas
            </p>
            <p className="text-3xl font-bold text-white">{sessions.length}</p>
          </div>
        </div>
        <div className="bg-emerald-900/60 rounded-lg shadow-lg p-5 flex items-center space-x-4">
          <div className="text-yellow-400">
            <MoneyBagIcon />
          </div>
          <div>
            <p className="text-sm text-emerald-200 font-medium">
              Resultado Neto Acumulado
            </p>
            <p className="text-3xl font-bold text-white">
              {formatLocaleCurrency(accumulatedNetResult)} €
            </p>
          </div>
        </div>
      </div>

      <div ref={addSessionRef}>
        <Accordion
          title="Añadir Nueva Sesión de Trabajo"
          isOpen={isAddSessionOpen}
          onToggle={handleToggleAddSession}
        >
          {renderForm()}
        </Accordion>
      </div>

      <div>
        <Accordion
          title="Historial de Sesiones"
          isOpen={isHistoryOpen}
          onToggle={() => setHistoryOpen(!isHistoryOpen)}
        >
          <div className="bg-slate-800 shadow-xl rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Neto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {filteredSessions.map((session) => {
                  const totalIncome = (
                    Object.values(session.income) as number[]
                  ).reduce((sum, val) => sum + (val || 0), 0);
                  const netResult = calculateSessionNet(session);
                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {session.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {session.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                        {formatLocaleCurrency(totalIncome)}€
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                          netResult >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatLocaleCurrency(netResult)}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditClick(session)}
                          className="text-indigo-400 hover:text-indigo-300 mr-4"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={() =>
                            window.confirm(
                              "¿Seguro que quieres eliminar esta sesión?"
                            ) && onDelete(session.id)
                          }
                          className="text-red-500 hover:text-red-400"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredSessions.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No hay sesiones registradas.
              </div>
            )}
          </div>
        </Accordion>
      </div>

      {isConceptsModalOpen && (
        <Modal
          title="Configurar Conceptos de Caja"
          onClose={() => setConceptsModalOpen(false)}
          onSave={saveConcepts}
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-slate-400 mb-2">
              Define los conceptos que aparecerán en el desglose de caja. Puedes
              añadir, editar o eliminar.
            </p>
            {tempIncomeSources.map((source, index) => (
              <div key={source.id} className="flex items-center gap-3">
                <input
                  type="text"
                  value={source.label}
                  onChange={(e) => updateTempSourceLabel(index, e.target.value)}
                  className="bg-slate-700 text-white rounded p-2 flex-grow border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Nombre del concepto"
                />
                <button
                  onClick={() => removeTempSource(index)}
                  className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"
                  title="Eliminar concepto"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button
              onClick={addTempSource}
              className="w-full py-2 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors flex justify-center items-center gap-2"
            >
              <PlusIcon /> Añadir Nuevo Concepto
            </button>
          </div>
        </Modal>
      )}

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

export default CashFlow;
