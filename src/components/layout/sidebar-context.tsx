import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SidebarLayoutContextValue = {
  isOpen: boolean;
  isMobileOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
};

const SidebarLayoutContext = createContext<SidebarLayoutContextValue | null>(null);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      isOpen,
      isMobileOpen,
      open,
      close,
      toggle,
      openMobile,
      closeMobile,
      toggleMobile,
    }),
    [isOpen, isMobileOpen, open, close, toggle, openMobile, closeMobile, toggleMobile],
  );

  return (
    <SidebarLayoutContext.Provider value={value}>{children}</SidebarLayoutContext.Provider>
  );
};

export const useSidebarLayout = () => {
  const context = useContext(SidebarLayoutContext);
  if (!context) {
    throw new Error("useSidebarLayout must be used within SidebarProvider.");
  }
  return context;
};
