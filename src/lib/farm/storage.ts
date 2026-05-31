const SELECTED_FARM_KEY = "prevagro.farm.selectedId";

export const getStoredFarmId = (): number | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SELECTED_FARM_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
};

export const setStoredFarmId = (id: number | null) => {
  if (typeof window === "undefined") return;
  if (id == null) {
    localStorage.removeItem(SELECTED_FARM_KEY);
    return;
  }
  localStorage.setItem(SELECTED_FARM_KEY, String(id));
};
