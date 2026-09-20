"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Toast = { id: string; message: string; type: "success" | "error" | "info" };
type ModalState = {
  open: boolean;
  title: string;
  description?: string;
  icon?: string;
  variant?: "default" | "danger";
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
  showInput?: boolean;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
};

type PopupContextType = {
  toast: (message: string, type?: Toast["type"]) => void;
  showAlert: (opts: { title: string; description?: string; icon?: string }) => void;
  confirm: (opts: { title: string; description?: string; confirmText?: string; cancelText?: string; variant?: "default" | "danger"; icon?: string }) => Promise<boolean>;
  prompt: (opts: { title: string; description?: string; placeholder?: string; defaultValue?: string; confirmText?: string; cancelText?: string }) => Promise<string | null>;
  showModal: (opts: Omit<ModalState, "open" | "onConfirm" | "onCancel"> & { onConfirm?: (v?: string) => void }) => void;
};

const PopupContext = createContext<PopupContextType | null>(null);

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error("usePopup must be used within PopupProvider");
  return ctx;
}

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const showAlert = useCallback((opts: { title: string; description?: string; icon?: string }) => {
    setPromptValue("");
    setModal({
      open: true,
      title: opts.title,
      description: opts.description,
      icon: opts.icon ?? "♥",
      variant: "default",
      confirmText: "Đã hiểu",
      cancelText: undefined as any,
      showInput: false,
      onConfirm: () => setModal(null),
      onCancel: () => setModal(null),
    });
  }, []);

  const confirm = useCallback((opts: { title: string; description?: string; confirmText?: string; cancelText?: string; variant?: "default" | "danger"; icon?: string }) => {
    return new Promise<boolean>((resolve) => {
      setPromptValue("");
      setModal({
        open: true,
        title: opts.title,
        description: opts.description,
        icon: opts.icon ?? (opts.variant === "danger" ? "⚠" : "♥"),
        variant: opts.variant ?? "default",
        confirmText: opts.confirmText ?? "Xác nhận",
        cancelText: opts.cancelText ?? "Hủy",
        showInput: false,
        onConfirm: () => { setModal(null); resolve(true); },
        onCancel: () => { setModal(null); resolve(false); },
      });
    });
  }, []);

  const prompt = useCallback((opts: { title: string; description?: string; placeholder?: string; defaultValue?: string; confirmText?: string; cancelText?: string }) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue(opts.defaultValue ?? "");
      setModal({
        open: true,
        title: opts.title,
        description: opts.description,
        placeholder: opts.placeholder,
        defaultValue: opts.defaultValue,
        icon: "✎",
        variant: "default",
        confirmText: opts.confirmText ?? "Xác nhận",
        cancelText: opts.cancelText ?? "Hủy",
        showInput: true,
        onConfirm: (v) => { setModal(null); resolve(v ?? promptValue); },
        onCancel: () => { setModal(null); resolve(null); },
      });
    });
  }, []);

  const showModal = useCallback((opts: any) => {
    setModal({
      open: true,
      title: opts.title,
      description: opts.description,
      icon: opts.icon ?? "♥",
      variant: opts.variant ?? "default",
      confirmText: opts.confirmText ?? "Đã hiểu",
      cancelText: opts.cancelText,
      showInput: !!opts.showInput,
      placeholder: opts.placeholder,
      onConfirm: () => { setModal(null); opts.onConfirm?.(); },
      onCancel: () => setModal(null),
    });
  }, []);

  return (
    <PopupContext.Provider value={{ toast, showAlert, confirm, prompt, showModal }}>
      {children}

      {/* Toasts */}
      <div className="fixed bottom-6 inset-x-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto min-w-[280px] max-w-[420px] w-full glass-strong rounded-[20px] px-4 py-3 flex items-center gap-3 shadow-[0_12px_32px_rgba(46,26,34,0.16)] border ${
                t.type === "success" ? "border-emerald-200" : t.type === "error" ? "border-red-200" : "border-white/70"
              }`}
            >
              <span className={`w-8 h-8 rounded-full grid place-items-center text-sm shrink-0 ${t.type === "success" ? "bg-emerald-500 text-white" : t.type === "error" ? "bg-[#FF4D6D] text-white" : "bg-[#2E1A22] text-white"}`}>
                {t.type === "success" ? "✓" : t.type === "error" ? "!" : "♥"}
              </span>
              <span className="flex-1 text-sm font-medium text-[#2E1A22] leading-snug">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal?.open && (
          <motion.div className="fixed inset-0 z-[90] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-[#2E1A22]/30 backdrop-blur-[6px]" onClick={modal.onCancel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[420px] glass-strong rounded-[28px] border border-white/80 shadow-[0_20px_60px_rgba(46,26,34,0.22)] overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-[#FF8FA3]/10 blur-2xl pointer-events-none" />
              <div className="p-6 md:p-7 space-y-5 relative">
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full grid place-items-center text-sm shrink-0 shadow-sm ${modal.variant === "danger" ? "bg-red-500 text-white" : "gradient-primary text-white"}`}>
                    {modal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[18px] font-semibold leading-tight text-[#2E1A22]">{modal.title}</h3>
                    {modal.description && <p className="text-sm text-[#6E4A56] leading-relaxed mt-1.5">{modal.description}</p>}
                  </div>
                </div>

                {modal.showInput && (
                  <input
                    autoFocus
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder={modal.placeholder}
                    className="w-full h-11 rounded-2xl border border-[#FCE8EC] bg-white px-4 text-sm outline-none focus:border-[#FF8FA3] focus:shadow-[0_4px_16px_rgba(255,77,109,0.08)] placeholder:text-[#B08A95]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") modal.onConfirm(promptValue);
                      if (e.key === "Escape") modal.onCancel();
                    }}
                  />
                )}

                <div className="flex gap-2 justify-end">
                  {modal.cancelText && (
                    <button
                      onClick={modal.onCancel}
                      className="h-11 px-6 rounded-full bg-white border border-[#FCE8EC] text-sm font-semibold text-[#2E1A22] hover:bg-[#FFF0F3] transition"
                    >
                      {modal.cancelText}
                    </button>
                  )}
                  <button
                    onClick={() => modal.onConfirm(modal.showInput ? promptValue : undefined)}
                    className={`h-11 px-6 rounded-full text-sm font-semibold shadow-[0_8px_20px_rgba(46,26,34,0.12)] transition ${modal.variant === "danger" ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_8px_20px_rgba(239,68,68,0.25)]" : "bg-[#2E1A22] hover:bg-black text-white"}`}
                  >
                    {modal.confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PopupContext.Provider>
  );
}
