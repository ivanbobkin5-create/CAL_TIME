import React, { useState, useEffect, useMemo } from "react";
import {
  FolderOpen,
  Search,
  Calendar,
  User,
  Plus,
  ArrowRight,
  Trash2,
  Edit2,
  FileText,
  ClipboardList,
  Combine,
  CheckCircle2,
  Send,
  Link,
  TrendingUp,
  MoreVertical,
} from "lucide-react";
// TimeWeb DB Setup
const db = {};
const handleDbError = (e: any, op: any, path: string) => console.warn("Database error:", op, path, e);
enum OperationType { LIST = "LIST", UPDATE = "UPDATE", GET = "GET", DELETE = "DELETE", WRITE = "WRITE", CREATE = "CREATE" }
function collection(db: any, ...pathParts: string[]) {
  return { path: pathParts.join('/') };
}
function doc(db: any, ...pathParts: string[]) {
  return { path: pathParts.join('/') };
}
async function setDoc(docRef: any, data: any, options?: any) {
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: options?.merge ? 'PATCH' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
}
async function updateDoc(docRef: any, data: any, options?: any) {
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, merge: options?.merge })
  });
}
function writeBatch(db: any) {
  const operations: any[] = [];
  return {
    set: (ref: any, data: any) => operations.push({ type: 'set', ref, data }),
    update: (ref: any, data: any, options?: any) => operations.push({ type: 'update', ref, data, options }),
    delete: (ref: any) => operations.push({ type: 'delete', ref }),
    commit: async () => {
      for (const op of operations) {
        if (op.type === 'set') await setDoc(op.ref, op.data, op.options);
        if (op.type === 'update') await updateDoc(op.ref, op.data, op.options);
        if (op.type === 'delete') await deleteDoc(op.ref);
      }
    }
  };
}
async function deleteDoc(docRef: any) {
  await fetch(`/api/db/doc/${docRef.path}`, { method: 'DELETE' });
}
function onSnapshot(ref: any, callback: (snap: any) => void) {
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/db/col/${ref.path}`);
      if (res.ok) {
        const data = await res.json();
        callback({
          docs: data.map((d: any) => ({
            id: d.id,
            data: () => d.data,
            exists: () => true
          })),
          size: data.length
        });
      }
    } catch (e) {
      console.error("Snapshot error:", e);
    }
  };
  fetchData();
  return () => {};
}
function query(ref: any, ...constraints: any[]) { return ref; }
function where(field: string, op: string, value: any) { return {}; }
function orderBy(field: string, dir: string) { return {}; }
function or(...constraints: any[]) { return {}; }
function limit(n: number) { return {}; }
async function getDocs(ref: any) {
  const res = await fetch(`/api/db/col/${ref.path}`);
  if (res.ok) {
    const data = await res.json();
    return {
      docs: data.map((d: any) => ({
        id: d.id,
        data: () => d.data,
      })),
      size: data.length
    };
  }
  return { docs: [], size: 0 };
}

import { cn } from "../../lib/utils";
import { ProjectSpecificationModal } from "./ProjectSpecificationModal";
import { Bitrix24Modal } from "./Bitrix24Modal";
import { ProjectAnalyticsModal } from "./ProjectAnalyticsModal";
import { TransferProjectModal } from "./TransferProjectModal";


interface Project {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  data: any;
  status?: "draft" | "sent" | "transferred";
  sketches?: string[];
  specification?: any;
  sourceCompanyId?: string;
  sourceProjectId?: string;
  transferredAt?: string;
  bitrix24DealId?: string;
  setId?: string;
  revisionComment?: string;
  totalPrice?: number;
}

export const ProjectsView = ({
  companyId,
  userId,
  userRole,
  onLoadProject,
  onOpenSpecification,
  companyType,
  manufacturerId,
  showConfirm,
  showAlert,
  onCreateSet,
  companyData,
  projects = [],
  sets = [],
}: {
  companyId?: string;
  userId?: string;
  userRole?: string;
  onLoadProject: (project: Project) => void;
  onOpenSpecification: (project: Project) => void;
  companyType?: string;
  manufacturerId?: string;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  showAlert?: (title: string, message: string) => void;
  onCreateSet?: (projects: Project[], set?: any) => void;
  companyData?: any;
  projects?: Project[];
  sets?: any[];
}) => {
  console.log("DEBUG: companyData in ProjectsView:", companyData);
  const companySettings = companyData;
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSets, setLoadingSets] = useState(true);

  // Removed old useEffect for companySettings fetch



  const bitrixBaseUrl = useMemo(() => {
    const url = companySettings?.bitrix24?.webhookUrl;
    if (!url) return null;
    return url.split('/rest/')[0];
  }, [companySettings]);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "draft" | "sent" | "transferred" | "sets"
  >("all");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletedProjects, setDeletedProjects] = useState<Set<string>>(new Set());
  const [selectedBitrixProject, setSelectedBitrixProject] = useState<Project | null>(null);
  const [selectedAnalyticsProject, setSelectedAnalyticsProject] = useState<Project | null>(null);
  const [selectedTransferProject, setSelectedTransferProject] = useState<Project | null>(null);
  const [companyEmployees, setCompanyEmployees] = useState<any[]>([]);

  const handleTransfer = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!companyId) return;

    showConfirm(
      "Передача проекта",
      `Вы действительно хотите передать проект "${project.name}" руководителю? После передачи он появится во вкладке "Переданные".`,
      async () => {
        try {
          await updateDoc(
            doc(db, "companies", companyId, "projects", project.id),
            {
              status: "transferred",
              transferredAt: new Date().toISOString(),
            },
          );
          
          // Also transfer the set if it exists
          if (project.data?.setId) {
             await updateDoc(
              doc(db, "companies", companyId, "sets", project.data.setId),
              {
                status: "transferred",
                transferredAt: new Date().toISOString(),
              },
            );
          }
        } catch (error) {
          handleDbError(
            error,
            OperationType.UPDATE,
            `companies/${companyId}/projects/${project.id}`,
          );
        }
      },
    );
  };

  const handleTransferSet = async (e: React.MouseEvent, set: any) => {
    e.stopPropagation();
    if (!companyId) return;

    showConfirm(
      "Передача комплекта",
      `Вы действительно хотите передать комплект "${set.name}" руководителю?`,
      async () => {
        try {
          const batch = writeBatch(db);
          
          batch.update(doc(db, "companies", companyId, "sets", set.id), {
            status: "transferred",
            transferredAt: new Date().toISOString(),
          });
          
          // Also transfer all projects in the set
          if (set.projectIds && set.projectIds.length > 0) {
            for (const pId of set.projectIds) {
              batch.update(doc(db, "companies", companyId, "projects", pId), {
                status: "transferred",
                transferredAt: new Date().toISOString(),
              });
            }
          }
          
          await batch.commit();
        } catch (error) {
          handleDbError(
            error,
            OperationType.UPDATE,
            `companies/${companyId}/sets/${set.id}`,
          );
        }
      },
    );
  };
  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingProjectId || !companyId || !editingName.trim()) {
      setEditingProjectId(null);
      return;
    }

    try {
      await updateDoc(
        doc(db, "companies", companyId, "projects", editingProjectId),
        {
          name: editingName.trim(),
        },
      );
      setEditingProjectId(null);
    } catch (error) {
      handleDbError(
        error,
        OperationType.UPDATE,
        `companies/${companyId}/projects/${editingProjectId}`,
      );
    }
  };

  const qProjects = useMemo(() => {
    if (!companyId) return null;
    if (userRole === "admin") {
      return query(
        collection(db, "companies", companyId, "projects"),
        orderBy("createdAt", "desc"),
        limit(40),
      );
    } else if (userRole === "supervisor") {
      return query(
        collection(db, "companies", companyId, "projects"),
        or(where("createdBy", "==", userId), where("status", "==", "transferred")),
        orderBy("createdAt", "desc"),
        limit(40),
      );
    } else {
      return query(
        collection(db, "companies", companyId, "projects"),
        where("createdBy", "==", userId),
        orderBy("createdAt", "desc"),
        limit(40),
      );
    }
  }, [companyId, userRole, userId]);

  const qSets = useMemo(() => {
    if (!companyId) return null;
    if (userRole === "admin") {
      return query(
        collection(db, "companies", companyId, "sets"),
        orderBy("createdAt", "desc"),
        limit(40),
      );
    } else if (userRole === "supervisor") {
      return query(
        collection(db, "companies", companyId, "sets"),
        or(where("createdBy", "==", userId), where("status", "==", "transferred")),
        orderBy("createdAt", "desc"),
        limit(40),
      );
    } else {
      return query(
        collection(db, "companies", companyId, "sets"),
        where("createdBy", "==", userId),
        orderBy("createdAt", "desc"),
        limit(40),
      );
    }
  }, [companyId, userRole, userId]);

  // Removed redundant fetchData useEffect
  useEffect(() => {
    if (projects.length > 0) setLoading(false);
    if (sets.length > 0) setLoadingSets(false);

    // Safety timer
    const timer = setTimeout(() => {
      setLoading(false);
      setLoadingSets(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [projects, sets]);

  useEffect(() => {
    if (!companyId) return;
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`/api/db/col/companies/${companyId}/employees`);
        if (res.ok) {
          const data = await res.json();
          // Transform to expected format
          const employees = data.map((item: any) => ({
            uid: item.id,
            ...item.data
          }));
          setCompanyEmployees(employees);
        }
      } catch (e) {
        console.error("Error fetching employees:", e);
      }
    };
    fetchEmployees();
  }, [companyId]);

  const toggleProjectSelection = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const newSelection = new Set(selectedProjectIds);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjectIds(newSelection);
    if (newSelection.size > 0) {
      setIsSelectionMode(true);
    } else {
      setIsSelectionMode(false);
    }
  };

  const handleCreateSet = () => {
    const selectedProjects = projects.filter((p) =>
      selectedProjectIds.has(p.id),
    );
    if (onCreateSet) {
      onCreateSet(selectedProjects);
    }
    // Reset selection
    setSelectedProjectIds(new Set());
    setIsSelectionMode(false);
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!companyId) return;

    showConfirm(
      "Удаление проекта",
      "Вы уверены, что хотите удалить этот проект?",
      async () => {
        setDeletedProjects(prev => new Set(prev).add(projectId));
        try {
          await deleteDoc(
            doc(db, "companies", companyId, "projects", projectId),
          );
        } catch (error) {
          setDeletedProjects(prev => {
            const next = new Set(prev);
            next.delete(projectId);
            return next;
          });
          handleDbError(
            error,
            OperationType.DELETE,
            `companies/${companyId}/projects/${projectId}`,
          );
        }
      },
    );
  };

  const myProjects = useMemo(() => {
    const baseProjects = (() => {
        if (!userRole || userRole === "admin") {
        return projects;
        }
        if (userRole === "supervisor") {
        return projects.filter(
            (p) => p.createdBy === userId || p.status === "transferred"
        );
        }
        // Employees, managers, and other roles can only see projects they created
        return projects.filter((p) => p.createdBy === userId);
    })();
    return baseProjects.filter(p => !deletedProjects.has(p.id));
  }, [projects, userRole, userId, deletedProjects]);

  const filteredProjects = myProjects.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.createdByName?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "all") return matchesSearch;
    return matchesSearch && (p.status || "draft") === activeFilter;
  });

  const mySets = useMemo(() => {
    if (!userRole || userRole === "admin") {
      return sets;
    }
    if (userRole === "supervisor") {
      return sets.filter(
        (s) => s.createdBy === userId || s.status === "transferred"
      );
    }
    return sets.filter((s) => s.createdBy === userId);
  }, [sets, userRole, userId]);

  const filteredSets = mySets.filter((s) => {
    return (
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contractNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-4 md:p-8" onClick={() => setOpenMenuId(null)}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Проекты {activeFilter === "sets" && "и Комплекты"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSelectionMode && activeFilter !== "sets" && (
              <button
                onClick={handleCreateSet}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 animate-in zoom-in duration-300"
              >
                <Combine className="w-4 h-4" />
                Создать комплект ({selectedProjectIds.size})
              </button>
            )}

            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Поиск..."
              />
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(["all", "draft", "sent", "transferred", "sets"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setActiveFilter(filter);
                      setIsSelectionMode(false);
                      setSelectedProjectIds(new Set());
                    }}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                      activeFilter === filter
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    {filter === "all"
                      ? "Все"
                      : filter === "draft"
                        ? "Черновики"
                        : filter === "sent"
                          ? "Оформленные"
                          : filter === "sets"
                            ? "Комплекты"
                            : "Переданные"}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {activeFilter === "sets" ? (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Combine className="w-6 h-6 text-indigo-600" />
              Комплекты
            </h2>
            {loadingSets ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSets.length === 0 ? (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center shadow-sm">
                <p className="text-gray-500 text-sm">Комплектов пока нет</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSets.map((set) => (
                  <div
                    key={set.id}
                    className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all relative overflow-hidden"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
                        <Combine className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0 pr-24">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors min-w-0">
                            {set.name || "Комплект"}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 flex-shrink-0">
                            {set.projectIds?.length || 0} шт
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Сумма: {(set.totalPrice || 0).toLocaleString()} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeFilter === "sets" ? null : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Проектов не найдено
            </h2>
            <p className="text-gray-500">В этой категории пока нет проектов</p>
          </div>
        ) : (
          <div>
             {activeFilter !== "all" && (
               <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                {activeFilter === "draft"
                  ? "Черновики"
                  : activeFilter === "sent"
                    ? "Оформленные"
                    : activeFilter === "transferred"
                      ? "Переданные"
                      : "Проекты"}
              </h2>
             )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  /* ... project card content ...*/
                  <div
                    key={project.id}
                    onClick={() =>
                      isSelectionMode
                        ? toggleProjectSelection({} as any, project.id)
                        : onLoadProject(project)
                    }
                    className={cn(
                      "group bg-white p-5 rounded-3xl border transition-all cursor-pointer relative",
                      selectedProjectIds.has(project.id)
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg"
                        : "border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200",
                    )}
                  >
                      {/* Row 1: Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all",
                          project.status === "sent" ? "bg-orange-50 text-orange-600" : project.status === "transferred" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                        )}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate text-base mb-1">{project.name}</h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                <Calendar className="w-3 h-3" />
                                {(() => {
                                    if (!project.createdAt) return "Нет даты";
                                    const createdDate = new Date(project.createdAt);
                                    return !isNaN(createdDate.getTime()) ? createdDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : `Дата: ${project.createdAt}`;
                                })()}
                            </div>
                        </div>
                        {/* Actions Row */}
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id); }}
                                className="p-1 text-gray-400 hover:text-gray-900 rounded-lg"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                            <div 
                                onClick={(e) => toggleProjectSelection(e, project.id)}
                                className={cn(
                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                    selectedProjectIds.has(project.id) ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200"
                                )}>
                                {selectedProjectIds.has(project.id) && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                        </div>
                      </div>

                      {/* Open menu */}
                        {openMenuId === project.id && (
                            <div className="absolute top-14 right-4 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-[100]" onClick={(e) => e.stopPropagation()}>
                                {isSelectionMode && (
                                    <button onClick={(e) => { handleCreateSet(); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-bold text-indigo-600 flex items-center gap-2 border-b border-gray-50">
                                        <Combine className="w-4 h-4" /> Собрать комплект
                                    </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); onLoadProject(project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 bg-blue-50 text-blue-600 text-sm font-bold flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4" /> Открыть
                                </button>
                                {(userRole === "manager" || userRole === "admin") && (
                                    <button onClick={(e) => { onOpenSpecification(project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-blue-600 flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4" /> {project.status === "sent" || project.status === "transferred" ? "Спецификация" : "Оформить"}
                                    </button>
                                )}
                                {project.status === "sent" && (
                                    <button onClick={(e) => { console.log("Transfer requested for:", project.id); handleTransfer(e, project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-blue-600 flex items-center gap-2">
                                        <Send className="w-4 h-4" /> Передать руководителю
                                    </button>
                                )}
                                {(userRole === "manager" || userRole === "admin") && (
                                    <button onClick={(e) => { setSelectedBitrixProject(project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-orange-600 flex items-center gap-2">
                                        <Send className="w-4 h-4" /> Bitrix24
                                    </button>
                                )}
                                {(userRole === "manager" || userRole === "admin") && (
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedTransferProject(project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-blue-600 flex items-center gap-2">
                                        <Send className="w-4 h-4" /> Отдать проект
                                    </button>
                                )}
                                {(userRole === "manager" || userRole === "admin") && (
                                    <button onClick={(e) => { setSelectedAnalyticsProject(project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-indigo-600 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Анализ
                                    </button>
                                )}
                                <button onClick={(e) => { handleDelete(e, project.id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-red-600 flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Удалить
                                </button>
                            </div>
                        )}
                      
                      {/* Row 2: Bottom Summary */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden">
                                {project.data?.createdByPhoto ? (
                                    <img src={project.data.createdByPhoto} alt={project.createdByName} className="w-full h-full object-cover" />
                                ) : (
                                    project.createdByName?.charAt(0) || "U"
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Менеджер</span>
                                <span className="text-xs text-gray-900 font-bold truncate max-w-[120px]">
                                    {project.createdByName || "Пользователь"}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1.5">
                                {project.status && project.status !== "draft" && (
                                    <span className={cn(
                                        "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                        project.status === "sent" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                                    )}>
                                    {project.status === "sent" ? "Оформлен" : "Передан"}
                                    </span>
                                )}
                                {project.bitrix24DealId && (
                                    <div className="px-2 py-1 rounded-lg text-[10px] bg-blue-100 text-blue-700 font-black flex items-center gap-1">
                                        CRM
                                    </div>
                                )}
                            </div>
                            <span className="text-xl font-extrabold text-slate-800 tracking-tight">
                                {(project.totalPrice || (project.data?.results ? Object.values(project.data.results).reduce((acc: number, r: any) => acc + (r.totalPrice || 0), 0) : 0)).toLocaleString()} ₽
                            </span>
                        </div>
                      </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      {selectedBitrixProject && (
        <Bitrix24Modal
          project={selectedBitrixProject}
          companyId={companyId || ""}
          userId={userId}
          onClose={() => setSelectedBitrixProject(null)}
          showAlert={showAlert}
        />
      )}
      {selectedAnalyticsProject && (
        <ProjectAnalyticsModal
          project={selectedAnalyticsProject}
          onClose={() => setSelectedAnalyticsProject(null)}
        />
      )}
      {selectedTransferProject && (
          <TransferProjectModal
              project={selectedTransferProject}
              companyId={companyId || ""}
              companyEmployees={companyEmployees}
              onClose={() => setSelectedTransferProject(null)}
              showAlert={showAlert}
              onConfirm={async (targetUserId) => {
                  try {
                    await updateDoc(
                        doc(db, "companies", companyId!, "projects", selectedTransferProject.id),
                        {
                            createdBy: targetUserId,
                            status: "draft"
                        }
                    );
                    setSelectedTransferProject(null);
                    if (showAlert) showAlert("Успешно", "Проект передан");
                  } catch (e) {
                      console.error(e);
                      if (showAlert) showAlert("Ошибка", "Не удалось передать проект");
                  }
              }}
          />
      )}
    </div>
  );
};
