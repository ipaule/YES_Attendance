"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { chipClassFor } from "@/lib/dropdownColors";
import { fetchJson } from "@/lib/http";

export interface DropdownOption {
  id: string;
  category: string;
  value: string;
  color: string;
  order: number;
}

interface Props {
  category: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowAdd?: boolean;
  allowManage?: boolean;
  placeholder?: string;
  className?: string;
}

export function ColoredDropdown({
  category,
  value,
  onChange,
  disabled = false,
  allowAdd = false,
  allowManage = false,
  placeholder = "선택",
  className = "",
}: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number; placement: "below" | "above" }>({ top: 0, left: 0, placement: "below" });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: options = [] } = useQuery({
    queryKey: ["dropdown-options", category],
    queryFn: async (): Promise<DropdownOption[]> => {
      const data = await fetchJson<{ options: DropdownOption[] }>(
        `/api/dropdown-options?category=${encodeURIComponent(category)}`
      );
      return data.options;
    },
    staleTime: 30_000,
  });

  const computePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelHeight = 256; // max-h-64
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow < panelHeight && rect.top > spaceBelow ? "above" : "below";
    setPosition({
      top: placement === "above" ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      placement,
    });
  };

  useEffect(() => {
    if (!open) return;
    computePosition();

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
        setShowAdd(false);
        setEditId(null);
      }
    };
    const handleScroll = () => {
      setOpen(false);
      setShowAdd(false);
      setEditId(null);
    };
    const handleResize = () => computePosition();

    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  const addMutation = useMutation({
    mutationFn: async (v: string) => {
      const res = await fetch("/api/dropdown-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, value: v }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json.option as DropdownOption;
    },
    onSuccess: (option) => {
      queryClient.invalidateQueries({ queryKey: ["dropdown-options", category] });
      onChange(option.value);
      setShowAdd(false);
      setNewValue("");
      setOpen(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const res = await fetch(`/api/dropdown-options/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json.option as DropdownOption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropdown-options", category] });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dropdown-options/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropdown-options", category] });
    },
  });

  const selected = options.find((o) => o.value === value);
  const chipClass = chipClassFor(selected?.color);

  if (disabled) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${chipClass} ${className}`}>
        {value || "—"}
      </span>
    );
  }

  const panel = open && typeof document !== "undefined" ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        transform: position.placement === "above" ? "translateY(-100%)" : undefined,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] max-h-64 overflow-y-auto"
    >
      <button
        type="button"
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
        className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-400"
      >
        (선택 안함)
      </button>
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center group">
          {editId === opt.id ? (
            <div className="flex items-center gap-1 px-2 py-1 w-full">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && editValue) editMutation.mutate({ id: opt.id, value: editValue });
                  if (e.key === "Escape") setEditId(null);
                }}
                className="text-xs border border-gray-300 rounded px-1 py-0.5 flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                autoFocus
              />
              <button
                type="button"
                onClick={() => editValue && editMutation.mutate({ id: opt.id, value: editValue })}
                className="text-indigo-600 hover:text-indigo-800"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex-1 text-left text-xs px-3 py-1.5 hover:bg-gray-50"
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${chipClassFor(opt.color)}`}>
                  {opt.value}
                </span>
              </button>
              {allowManage && (
                <div className="flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(opt.id);
                      setEditValue(opt.value);
                    }}
                    className="text-gray-300 hover:text-indigo-500"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`"${opt.value}" 항목을 삭제하시겠습니까?`)) {
                        deleteMutation.mutate(opt.id);
                      }
                    }}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {allowAdd && (
        <div className="border-t border-gray-100">
          {showAdd ? (
            <div className="flex items-center gap-1 px-2 py-1.5">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && newValue) addMutation.mutate(newValue);
                  if (e.key === "Escape") {
                    setShowAdd(false);
                    setNewValue("");
                  }
                }}
                placeholder="새 항목"
                className="text-xs border border-gray-300 rounded px-1 py-0.5 flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                autoFocus
              />
              <button
                type="button"
                onClick={() => newValue && addMutation.mutate(newValue)}
                disabled={!newValue || addMutation.isPending}
                className="text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setNewValue("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-indigo-600 flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> 새 항목
            </button>
          )}
          {addMutation.isError && (
            <div className="text-[10px] text-red-500 px-3 pb-1">
              {(addMutation.error as Error).message}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={triggerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${chipClass} hover:opacity-80`}
      >
        <span>{value || placeholder}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {panel}
    </div>
  );
}
