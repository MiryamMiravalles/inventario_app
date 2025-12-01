const API_BASE = "/api"; // Mapped in netlify.toml to /.netlify/functions

const headers = {
  "Content-Type": "application/json",
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Request failed with status ${res.status}`);
  }
  return res.json();
};

export const api = {
  sessions: {
    list: () => fetch(`${API_BASE}/sessions`).then(handleResponse),
    save: (data: any) =>
      fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }).then(handleResponse),
    delete: (id: string) =>
      fetch(`${API_BASE}/sessions?id=${id}`, { method: "DELETE" }).then(
        handleResponse
      ),
  },
  inventory: {
    list: () => fetch(`${API_BASE}/inventory`).then(handleResponse),
    save: (data: any) =>
      fetch(`${API_BASE}/inventory`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }).then(handleResponse),
    delete: (id: string) =>
      fetch(`${API_BASE}/inventory?id=${id}`, { method: "DELETE" }).then(
        handleResponse
      ),
    bulkCreate: (data: any[]) =>
      fetch(`${API_BASE}/inventory`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }).then(handleResponse),
    // CORRECCIÓN: Agregar 'mode' al cuerpo de la solicitud PUT
    bulkUpdate: (
      updates: { name: string; stock: number; mode: "set" | "add" }[]
    ) =>
      fetch(`${API_BASE}/inventory`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      }).then(handleResponse),
  },
  orders: {
    list: () => fetch(`${API_BASE}/orders`).then(handleResponse),
    save: (data: any) =>
      fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }).then(handleResponse),
    delete: (id: string) =>
      fetch(`${API_BASE}/orders?id=${id}`, { method: "DELETE" }).then(
        handleResponse
      ),
  },
  history: {
    list: () => fetch(`${API_BASE}/history`).then(handleResponse),
    save: (data: any) =>
      fetch(`${API_BASE}/history`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }).then(handleResponse),
    deleteAll: () =>
      fetch(`${API_BASE}/history`, { method: "DELETE" }).then(handleResponse),
  },
  config: {
    getIncomeSources: () => fetch(`${API_BASE}/config`).then(handleResponse),
    saveIncomeSources: (sources: any[]) =>
      fetch(`${API_BASE}/config`, {
        method: "POST",
        headers,
        body: JSON.stringify(sources),
      }).then(handleResponse),
  },
};
