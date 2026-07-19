"use client";

import { Fragment, forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FileText,
  Pencil,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Move,
  Trash2,
} from "lucide-react";

export interface HistoryTreeNode {
  id: string;
  name: string;
  type: "RECORD" | "FOLDER";
  parentId: string | null;
  order: number;
  createdAt: string;
}

export interface HistoryTreeHandle {
  /** Opens the "new folder" input at the root level (for a header "새 폴더" button). */
  createRootFolder: () => void;
}

interface HistoryTreeProps {
  nodes: HistoryTreeNode[];
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, parentId: string | null) => void | Promise<void>;
  onReorder: (orderedIds: string[]) => void;
  detailHref: (node: HistoryTreeNode) => string;
  /** Omit (or return true for everything) to allow delete unconditionally. Return false to hide the delete button entirely for that node. */
  canDelete?: (node: HistoryTreeNode, childCount: number) => boolean;
  onDelete?: (node: HistoryTreeNode) => void | Promise<void>;
  deleteConfirmText?: (node: HistoryTreeNode) => string;
  emptyMessage?: string;
  /** When true, clicking a folder's name navigates to its detail page (like a record) instead of expanding it. The chevron still expands/collapses. */
  folderNameOpensDetail?: boolean;
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-1">
      <button {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none px-1 flex-shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

interface CreatingState {
  parentId: string | null;
}

interface TreeLevelProps {
  parentId: string | null;
  depth: number;
  byParent: Map<string | null, HistoryTreeNode[]>;
  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
  expand: (id: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editName: string;
  setEditName: (name: string) => void;
  onRename: (id: string, name: string) => void;
  creatingIn: CreatingState | null;
  setCreatingIn: (state: CreatingState | null) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onOpenMove: (node: HistoryTreeNode) => void;
  detailHref: (node: HistoryTreeNode) => string;
  canDelete?: (node: HistoryTreeNode, childCount: number) => boolean;
  onDelete?: (node: HistoryTreeNode) => void | Promise<void>;
  deleteConfirmText?: (node: HistoryTreeNode) => string;
  /** Node id currently being dragged over as a nest-target (for the Finder-style drop highlight). */
  dropTargetId: string | null;
  folderNameOpensDetail?: boolean;
}

function TreeLevel(props: TreeLevelProps) {
  const {
    parentId, depth, byParent, expanded, toggleExpanded, expand,
    editingId, setEditingId, editName, setEditName, onRename,
    creatingIn, setCreatingIn, newFolderName, setNewFolderName, onCreateFolder,
    onOpenMove, detailHref, canDelete, onDelete, deleteConfirmText, dropTargetId,
    folderNameOpensDetail,
  } = props;

  const router = useRouter();
  const items = byParent.get(parentId) ?? [];
  const isCreatingHere = creatingIn !== null && creatingIn.parentId === parentId;

  const indent = { paddingLeft: depth * 22 };

  return (
    <div className="space-y-1">
      {items.length === 0 && !isCreatingHere && depth > 0 && (
        <p style={indent} className="text-xs text-gray-400 py-1">비어 있음</p>
      )}

      <SortableContext items={items.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {items.map((node) => {
            const childCount = (byParent.get(node.id) ?? []).length;
            const deletable = node.type === "FOLDER"
              ? (canDelete ? canDelete(node, childCount) : childCount === 0)
              : (canDelete ? canDelete(node, childCount) : true);
            const isDropTarget = dropTargetId === node.id;

            return (
              <Fragment key={node.id}>
                <SortableRow id={node.id}>
                  <div
                    style={indent}
                    className={`flex items-center gap-2 flex-1 min-w-0 bg-white rounded-lg border px-2 py-2 transition-colors ${
                      isDropTarget ? "border-indigo-400 ring-2 ring-indigo-200" : "border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {node.type === "FOLDER" ? (
                      <button onClick={() => toggleExpanded(node.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        {expanded.has(node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    ) : (
                      <span className="w-4 flex-shrink-0" />
                    )}

                    {editingId === node.id ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {node.type === "FOLDER" ? (
                          <Folder className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editName.trim()) onRename(node.id, editName);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 min-w-0 text-sm border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          autoFocus
                        />
                        <button onClick={() => editName.trim() && onRename(node.id, editName)} className="text-indigo-600 hover:text-indigo-800 flex-shrink-0"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            node.type === "FOLDER" && !folderNameOpensDetail
                              ? toggleExpanded(node.id)
                              : router.push(detailHref(node))
                          }
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        >
                          {node.type === "FOLDER" ? (
                            expanded.has(node.id)
                              ? <FolderOpen className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              : <Folder className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-800 truncate">{node.name}</span>
                          {node.type === "RECORD" && (
                            <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
                              {new Date(node.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {node.type === "FOLDER" && (
                            <button
                              onClick={() => { expand(node.id); setCreatingIn({ parentId: node.id }); setNewFolderName(""); }}
                              className="text-gray-300 hover:text-indigo-500"
                              title="하위 폴더 만들기"
                            >
                              <FolderPlus className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => onOpenMove(node)} className="text-gray-300 hover:text-indigo-500" title="이동">
                            <Move className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setEditingId(node.id); setEditName(node.name); }} className="text-gray-300 hover:text-indigo-500" title="이름 변경">
                            <Pencil className="h-4 w-4" />
                          </button>
                          {onDelete && deletable && (
                            <button
                              onClick={() => {
                                const msg = deleteConfirmText ? deleteConfirmText(node) : `"${node.name}" 항목을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
                                if (confirm(msg)) onDelete(node);
                              }}
                              className="text-gray-300 hover:text-red-500"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </SortableRow>

                {node.type === "FOLDER" && expanded.has(node.id) && (
                  <TreeLevel {...props} parentId={node.id} depth={depth + 1} />
                )}
              </Fragment>
            );
          })}
      </SortableContext>

      {isCreatingHere && (
        <div style={{ paddingLeft: (depth + 1) * 22 }} className="flex items-center gap-2 bg-white rounded-lg border border-indigo-300 px-2 py-2">
          <FolderPlus className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderName.trim()) onCreateFolder(parentId);
              if (e.key === "Escape") setCreatingIn(null);
            }}
            placeholder="폴더 이름"
            className="flex-1 min-w-0 text-sm border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
          <button onClick={() => newFolderName.trim() && onCreateFolder(parentId)} className="text-indigo-600 hover:text-indigo-800 flex-shrink-0"><Check className="h-4 w-4" /></button>
          <button onClick={() => setCreatingIn(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

export const HistoryTree = forwardRef<HistoryTreeHandle, HistoryTreeProps>(function HistoryTree(
  { nodes, onCreateFolder, onRename, onMove, onReorder, detailHref, canDelete, onDelete, deleteConfirmText, emptyMessage, folderNameOpensDetail },
  ref,
) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [creatingIn, setCreatingIn] = useState<CreatingState | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingNode, setMovingNode] = useState<HistoryTreeNode | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const attemptMove = async (id: string, parentId: string | null) => {
    try {
      await onMove(id, parentId);
      setMovingNode(null);
      setMoveError(null);
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : "이동에 실패했습니다.");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useImperativeHandle(ref, () => ({
    createRootFolder: () => { setCreatingIn({ parentId: null }); setNewFolderName(""); },
  }));

  const byParent = useMemo(() => {
    const map = new Map<string | null, HistoryTreeNode[]>();
    for (const n of nodes) {
      const arr = map.get(n.parentId) ?? [];
      arr.push(n);
      map.set(n.parentId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order);
    return map;
  }, [nodes]);

  const folderOptions = useMemo(() => {
    const out: { id: string; name: string; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const n of byParent.get(parentId) ?? []) {
        if (n.type !== "FOLDER") continue;
        out.push({ id: n.id, name: n.name, depth });
        walk(n.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [byParent]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const expand = (id: string) => setExpanded((prev) => new Set(prev).add(id));

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Reorders active within its current siblings, positioned next to over.
  const reorderWithinLevel = (activeId: string, overId: string, parentId: string | null) => {
    const siblings = byParent.get(parentId) ?? [];
    const oldIndex = siblings.findIndex((n) => n.id === activeId);
    const newIndex = siblings.findIndex((n) => n.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(siblings, oldIndex, newIndex).map((n) => n.id));
  };

  // Finder-style: drop an item directly onto a folder to move it inside,
  // landing at the end of that folder's existing children.
  const attemptDropInto = async (activeId: string, folderId: string) => {
    try {
      await onMove(activeId, folderId);
      const existingSiblingIds = (byParent.get(folderId) ?? [])
        .map((n) => n.id)
        .filter((id) => id !== activeId);
      onReorder([...existingSiblingIds, activeId]);
      expand(folderId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "이동에 실패했습니다.");
    }
  };

  const handleDragOver = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setDropTargetId(null);
      return;
    }
    const activeNode = byId.get(String(active.id));
    const overNode = byId.get(String(over.id));
    if (!activeNode || !overNode) { setDropTargetId(null); return; }

    // A folder is a nest-target for anything dropped onto it, except a sibling
    // folder at the same level (that stays a same-level reorder target).
    const isNestTarget = overNode.type === "FOLDER" &&
      !(activeNode.type === "FOLDER" && activeNode.parentId === overNode.parentId);
    setDropTargetId(isNestTarget ? overNode.id : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDropTargetId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeNode = byId.get(String(active.id));
    const overNode = byId.get(String(over.id));
    if (!activeNode || !overNode) return;

    const isNestTarget = overNode.type === "FOLDER" &&
      !(activeNode.type === "FOLDER" && activeNode.parentId === overNode.parentId);

    if (isNestTarget) {
      if (overNode.id === activeNode.id) return;
      attemptDropInto(activeNode.id, overNode.id);
      return;
    }

    // Same-level reorder — ignore drops onto a different level's plain item
    // (no unambiguous meaning; use the 이동 button for that).
    if (activeNode.parentId !== overNode.parentId) return;
    reorderWithinLevel(activeNode.id, overNode.id, activeNode.parentId);
  };

  const isEmpty = nodes.length === 0;

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"><X className="h-4 w-4" /></button>
        </div>
      )}

      {isEmpty && creatingIn === null ? (
        <div className="text-center py-12 text-gray-400"><p>{emptyMessage ?? "저장된 기록이 없습니다."}</p></div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDropTargetId(null)}
        >
          <TreeLevel
            parentId={null}
            depth={0}
            byParent={byParent}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            expand={expand}
            editingId={editingId}
            setEditingId={setEditingId}
            editName={editName}
            setEditName={setEditName}
            onRename={(id, name) => onRename(id, name)}
            creatingIn={creatingIn}
            setCreatingIn={setCreatingIn}
            newFolderName={newFolderName}
            setNewFolderName={setNewFolderName}
            onCreateFolder={(parentId) => { onCreateFolder(newFolderName, parentId); setCreatingIn(null); setNewFolderName(""); }}
            onOpenMove={(node) => { setMovingNode(node); setMoveError(null); }}
            detailHref={detailHref}
            canDelete={canDelete}
            onDelete={onDelete ? async (node) => {
              try {
                await onDelete(node);
              } catch (e) {
                setActionError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
              }
            } : undefined}
            deleteConfirmText={deleteConfirmText}
            dropTargetId={dropTargetId}
            folderNameOpensDetail={folderNameOpensDetail}
          />
        </DndContext>
      )}

      {movingNode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setMovingNode(null); setMoveError(null); }}
        >
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">&quot;{movingNode.name}&quot; 이동</h3>
            <div className="max-h-80 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
              <button
                onClick={() => attemptMove(movingNode.id, null)}
                disabled={movingNode.parentId === null}
                className="w-full text-left text-sm rounded-lg px-3 py-2 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4 text-amber-600 flex-shrink-0" /> 루트로 이동
              </button>
              {folderOptions.filter((f) => f.id !== movingNode.id).map((f) => (
                <button
                  key={f.id}
                  onClick={() => attemptMove(movingNode.id, f.id)}
                  disabled={f.id === movingNode.parentId}
                  style={{ paddingLeft: 12 + f.depth * 16 }}
                  className="w-full text-left text-sm rounded-lg py-2 pr-3 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Folder className="h-4 w-4 text-amber-600 flex-shrink-0" /> {f.name}
                </button>
              ))}
            </div>
            {moveError && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{moveError}</div>}
            <div className="flex justify-end">
              <button onClick={() => { setMovingNode(null); setMoveError(null); }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
