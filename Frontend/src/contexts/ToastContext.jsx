import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    addToast(message, "success", duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    addToast(message, "error", duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    addToast(message, "info", duration);
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    addToast(message, "warning", duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const { id, message, type } = toast;

  const styles = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/90",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: "text-emerald-500",
      iconBg: "bg-emerald-100 dark:bg-emerald-900",
      progress: "bg-emerald-500",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950/90",
      border: "border-red-200 dark:border-red-800",
      icon: "text-red-500",
      iconBg: "bg-red-100 dark:bg-red-900",
      progress: "bg-red-500",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/90",
      border: "border-amber-200 dark:border-amber-800",
      icon: "text-amber-500",
      iconBg: "bg-amber-100 dark:bg-amber-900",
      progress: "bg-amber-500",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/90",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-500",
      iconBg: "bg-blue-100 dark:bg-blue-900",
      progress: "bg-blue-500",
    },
  };

  const style = styles[type] || styles.info;

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={[
        "pointer-events-auto",
        "min-w-[300px] max-w-[400px]",
        "rounded-xl shadow-lg border",
        "transform transition-all duration-300 ease-out",
        "animate-in slide-in-from-right-full fade-in",
        style.bg,
        style.border,
      ].join(" ")}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        <div className={["shrink-0 w-9 h-9 rounded-full flex items-center justify-center", style.iconBg, style.icon].join(" ")}>
          {icons[type]}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {message}
          </p>
        </div>

        <button
          onClick={() => onRemove(id)}
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-b-xl overflow-hidden">
        <div
          className={["h-full animate-progress", style.progress].join(" ")}
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      </div>
    </div>
  );
}

export default ToastContext;
