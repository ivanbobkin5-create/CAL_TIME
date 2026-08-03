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
  ChevronDown,
  ChevronUp,
  Layers,
  FolderPlus,
  Unlink,
  Package,
  Box,
  X,
  Check,
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meb_sync_completed"));
  }
}
async function updateDoc(docRef: any, data: any, options?: any) {
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, merge: options?.merge })
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meb_sync_completed"));
  }
}
function writeBatch(db: any) {
  const operations: any[] = [];
  return {
    set: (ref: any, data: any) => operations.push({ type: 'set', ref, data }),
    update: (ref: any, data: any, options?: any) => operations.push({ type: 'update', ref, data, options }),
    delete: (ref: any) => operations.push({ type: 'delete', ref }),
    commit: async () => {
      await Promise.all(operations.map(async (op) => {
        if (op.type === 'set') await setDoc(op.ref, op.data, op.options);
        if (op.type === 'update') await updateDoc(op.ref, op.data, op.options);
        if (op.type === 'delete') await deleteDoc(op.ref);
      }));
    }
  };
}
async function deleteDoc(docRef: any) {
  await fetch(`/api/db/doc/${docRef.path}`, { method: 'DELETE' });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("meb_sync_completed"));
  }
}
function onSnapshot(ref: any, callback: (snap: any) => void) {
  const isCol = ref.path.split('/').length % 2 !== 0;
  const fetchData = async () => {
    try {
      const url = isCol ? `/api/db/col/${ref.path}` : `/api/db/doc/${ref.path}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (isCol) {
          callback({
            docs: data.map((d: any) => ({
              id: d.id,
              data: () => d.data,
              exists: () => true
            })),
            size: data.length
          });
        } else {
          callback({
            id: ref.path.split('/').pop(),
            data: () => data,
            exists: () => true
          });
        }
      }
    } catch (e) {
      console.error("Snapshot error:", e);
    }
  };
  
  fetchData();
  
  const interval = setInterval(fetchData, 45000);
  
  const handleSync = () => fetchData();
  if (typeof window !== "undefined") {
    window.addEventListener("meb_sync_completed", handleSync);
  }

  return () => {
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("meb_sync_completed", handleSync);
    }
  };
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
import { getCoefficientDifferences } from "./CoefficientDiffBanner";


interface Project {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  data: any;
  status?: "draft" | "sent" | "transferred" | "deleted";
  sketches?: string[];
  specification?: any;
  sourceCompanyId?: string;
  sourceProjectId?: string;
  transferredAt?: string;
  bitrix24DealId?: string;
  setId?: string;
  revisionComment?: string;
  totalPrice?: number;
  isDeleted?: boolean;
  createdByPhoto?: string;
}

export const ProjectsView = ({
  companyId,
  userId,
  userRole,
  onLoadProject,
  onOpenSpecification,
  onOpenProposal,
  companyType,
  manufacturerId,
  showConfirm,
  showAlert,
  onCreateSet,
  onOpenSetProposal,
  companyData,
  projects = [],
  sets = [],
  isProjectsLoading = false,
  isSetsLoading = false,
  onDeleteProject,
  currentCoefficients,
}: {
  companyId?: string;
  userId?: string;
  userRole?: string;
  onLoadProject: (project: Project) => void;
  onOpenSpecification: (project: Project) => void;
  onOpenProposal?: (project: Project) => void;
  companyType?: string;
  manufacturerId?: string;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  showAlert?: (title: string, message: string) => void;
  onCreateSet?: (projects: Project[], set?: any) => void;
  onOpenSetProposal?: (set: any, projects: Project[]) => void;
  companyData?: any;
  projects?: Project[];
  sets?: any[];
  isProjectsLoading?: boolean;
  isSetsLoading?: boolean;
  onDeleteProject?: (projectId: string) => void;
  currentCoefficients?: any;
}) => {
  console.log("DEBUG: companyData in ProjectsView:", companyData);
  const companySettings = companyData;
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(() => projects.length === 0 && isProjectsLoading);
  const [loadingSets, setLoadingSets] = useState(() => sets.length === 0 && isSetsLoading);

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
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [renamingSet, setRenamingSet] = useState<any | null>(null);
  const [newSetNameInput, setNewSetNameInput] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);

  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  const [localSets, setLocalSets] = useState<any[]>(sets);

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  useEffect(() => {
    setLocalSets(sets);
  }, [sets]);

  const [isSetsGroupCollapsed, setIsSetsGroupCollapsed] = useState(true);
  const [isStandaloneGroupCollapsed, setIsStandaloneGroupCollapsed] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "price-desc" | "price-asc">("date-desc");
  const [isCreatingSet, setIsCreatingSet] = useState(false);

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

  useEffect(() => {
    setLoading(isProjectsLoading);
  }, [isProjectsLoading]);

  useEffect(() => {
    setLoadingSets(isSetsLoading);
  }, [isSetsLoading]);

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

  const handleCreateSet = async () => {
    if (!companyId) return;
    const selectedProjects = localProjects.filter((p) =>
      selectedProjectIds.has(p.id),
    );
    if (selectedProjects.length === 0) return;

    try {
      setIsCreatingSet(true);
      const setId = `set-${Date.now()}`;
      const setDocRef = doc(db, "companies", companyId, "sets", setId);

      const totalPrice = selectedProjects.reduce((sum: number, p: any) => {
        const pPrice = Number(p.totalPrice || (p.data?.results ? Object.values(p.data.results).reduce((acc: number, r: any) => acc + Number(r.totalPrice || 0), 0) : 0));
        return sum + pPrice;
      }, 0);

      const defaultName = `Комплект от ${new Date().toLocaleDateString('ru-RU')}`;
      
      const setRecord: any = {
        id: setId,
        name: defaultName,
        projectIds: selectedProjects.map(p => p.id),
        totalPrice: totalPrice,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId || "",
        createdByName: "Пользователь",
        status: "draft",
        summary: {
          totalMaterialsPrice: 0,
          totalHardwarePrice: 0,
          totalServicesPrice: 0,
          materials: [],
          hardware: [],
          services: [],
          totalDeliveryPrice: 0,
          totalAssemblyPrice: 0,
        }
      };

      const employee = companyEmployees.find(emp => emp.uid === userId);
      if (employee) {
        setRecord.createdByName = employee.name || employee.displayName || employee.email || "Пользователь";
      }

      // Optimistic update
      setLocalSets(prev => [setRecord, ...prev]);
      setLocalProjects(prev => prev.map(p => {
        if (selectedProjectIds.has(p.id)) {
          return { ...p, setId: setId, data: { ...(p.data || {}), setId: setId } };
        }
        return p;
      }));

      const batch = writeBatch(db);
      
      batch.set(setDocRef, setRecord);

      for (const p of selectedProjects) {
        const projectDocRef = doc(db, "companies", companyId, "projects", p.id);
        batch.update(projectDocRef, {
          setId: setId,
        });
      }

      await batch.commit();

      // Trigger immediate sync
      if (typeof window !== "undefined" && (window as any).triggerSync) {
        (window as any).triggerSync();
      }

      if (showAlert) {
        showAlert("Успешно", `Комплект "${defaultName}" успешно создан`);
      }
    } catch (err) {
      console.error("Error creating set:", err);
      if (showAlert) {
        showAlert("Ошибка", "Не удалось создать комплект");
      }
    } finally {
      setIsCreatingSet(false);
    }

    // Reset selection
    setSelectedProjectIds(new Set());
    setIsSelectionMode(false);
  };

  const handleSingleProjectDelete = async (projectId: string) => {
    if (!companyId) return;
    setDeletedProjects(prev => new Set(prev).add(projectId));
    setLocalProjects(prev => prev.filter(p => p.id !== projectId));
    try {
      await deleteDoc(
        doc(db, "companies", companyId, "projects", projectId),
      );
      onDeleteProject?.(projectId);
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
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!companyId) return;

    showConfirm(
      "Удаление проекта",
      "Вы уверены, что хотите удалить этот проект?",
      () => handleSingleProjectDelete(projectId)
    );
  };

  const [collapsedSetIds, setCollapsedSetIds] = useState<Set<string>>(new Set());
  const [addProjectToSetModal, setAddProjectToSetModal] = useState<any | null>(null);

  // Unlink a single project from a set
  const handleUnlinkProject = async (project: Project, set: any) => {
    if (!companyId) return;
    try {
      // Optimistic update
      setLocalProjects(prev => prev.map(p => {
        if (p.id === project.id) {
          const updatedData = p.data ? { ...p.data } : {};
          delete updatedData.setId;
          return { ...p, setId: undefined, data: updatedData };
        }
        return p;
      }));
      setLocalSets(prev => prev.map(s => {
        if (s.id === set.id) {
          return { ...s, projectIds: (s.projectIds || []).filter((id: string) => id !== project.id) };
        }
        return s;
      }));

      const batch = writeBatch(db);
      batch.update(doc(db, "companies", companyId, "projects", project.id), {
        setId: null,
      });
      const updatedProjectIds = (set.projectIds || []).filter((id: string) => id !== project.id);
      batch.update(doc(db, "companies", companyId, "sets", set.id), {
        projectIds: updatedProjectIds,
      });
      await batch.commit();
      if (showAlert) showAlert("Успешно", `Проект "${project.name}" исключен из комплекта`);
    } catch (err) {
      console.error("Error unlinking project from set:", err);
      if (showAlert) showAlert("Ошибка", "Не удалось исключить проект из комплекта");
    }
  };

  // Dissolve set (keeps projects as standalone)
  const handleDissolveSet = async (set: any) => {
    if (!companyId) return;
    showConfirm(
      "Расформировать комплект",
      `Вы хотите расформировать комплект "${set.name || 'без названия'}"? Все входящие в него проекты сохранятся как отдельные проекты.`,
      async () => {
        try {
          const subProjs = userProjects.filter(p => p.setId === set.id || p.data?.setId === set.id || set.projectIds?.includes(p.id));
          const subProjIds = new Set(subProjs.map(p => p.id));

          // Optimistic local update
          setLocalSets(prev => prev.filter(s => s.id !== set.id));
          setLocalProjects(prev => prev.map(p => {
            if (subProjIds.has(p.id) || p.setId === set.id || p.data?.setId === set.id) {
              const updatedData = p.data ? { ...p.data } : {};
              delete updatedData.setId;
              return { ...p, setId: undefined, data: updatedData };
            }
            return p;
          }));

          const batch = writeBatch(db);
          for (const sp of subProjs) {
            batch.update(doc(db, "companies", companyId, "projects", sp.id), { setId: null });
          }
          batch.delete(doc(db, "companies", companyId, "sets", set.id));
          await batch.commit();
          if (showAlert) showAlert("Успешно", "Комплект расформирован. Проекты теперь отображаются по отдельности.");
        } catch (err) {
          console.error("Error dissolving set:", err);
          if (showAlert) showAlert("Ошибка", "Не удалось расформировать комплект");
        }
      }
    );
  };

  // Delete set AND all its projects
  const handleDeleteSetWithProjects = async (set: any, subProjs: Project[]) => {
    if (!companyId) return;
    showConfirm(
      "Удаление комплекта и всех проектов",
      `Внимание! Это действие удалит комплект "${set.name || 'без названия'}" и ВСЕ (${subProjs.length}) входящие в него проекты. Продолжить?`,
      async () => {
        try {
          const subProjIds = new Set(subProjs.map(p => p.id));

          // Optimistic local update
          setLocalSets(prev => prev.filter(s => s.id !== set.id));
          setLocalProjects(prev => prev.filter(p => !subProjIds.has(p.id) && p.setId !== set.id && p.data?.setId !== set.id));

          const batch = writeBatch(db);
          for (const sp of subProjs) {
            batch.delete(doc(db, "companies", companyId, "projects", sp.id));
            if (onDeleteProject) onDeleteProject(sp.id);
          }
          batch.delete(doc(db, "companies", companyId, "sets", set.id));
          await batch.commit();
          if (showAlert) showAlert("Успешно", "Комплект и все входящие в него проекты удалены");
        } catch (err) {
          console.error("Error deleting set with projects:", err);
          if (showAlert) showAlert("Ошибка", "Не удалось удалить комплект");
        }
      }
    );
  };

  // Rename set
  const handleRenameSet = (set: any) => {
    setRenamingSet(set);
    setNewSetNameInput(set.name || `Заказ №${set.contractNumber || set.id?.slice(0, 6)}`);
  };

  const handleSaveRenameSet = async () => {
    if (!companyId || !renamingSet || !newSetNameInput.trim()) return;
    const trimmedName = newSetNameInput.trim();
    setIsSavingRename(true);

    // Optimistic local update
    setLocalSets(prev => prev.map(s => s.id === renamingSet.id ? { ...s, name: trimmedName } : s));

    try {
      await updateDoc(doc(db, "companies", companyId, "sets", renamingSet.id), {
        name: trimmedName,
      });
      if (showAlert) showAlert("Успешно", "Название комплекта обновлено");
      setRenamingSet(null);
      setNewSetNameInput("");
    } catch (err) {
      console.error("Error renaming set:", err);
      if (showAlert) showAlert("Ошибка", "Не удалось переименовать комплект");
    } finally {
      setIsSavingRename(false);
    }
  };

  // Add standalone project to set
  const handleAddProjectToSet = async (projectId: string, set: any) => {
    if (!companyId) return;
    try {
      // Optimistic update
      setLocalProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return { ...p, setId: set.id, data: { ...(p.data || {}), setId: set.id } };
        }
        return p;
      }));
      setLocalSets(prev => prev.map(s => {
        if (s.id === set.id) {
          const updatedProjectIds = Array.from(new Set([...(s.projectIds || []), projectId]));
          return { ...s, projectIds: updatedProjectIds };
        }
        return s;
      }));

      await updateDoc(doc(db, "companies", companyId, "projects", projectId), {
        setId: set.id,
      });
      const updatedProjectIds = Array.from(new Set([...(set.projectIds || []), projectId]));
      await updateDoc(doc(db, "companies", companyId, "sets", set.id), {
        projectIds: updatedProjectIds,
      });
      setAddProjectToSetModal(null);
      if (showAlert) showAlert("Успешно", "Проект добавлен в комплект");
    } catch (err) {
      console.error("Error adding project to set:", err);
      if (showAlert) showAlert("Ошибка", "Не удалось добавить проект в комплект");
    }
  };

  const userProjects = useMemo(() => {
    const isManagerOrHigher = 
      userRole === "admin" || 
      userRole === "supervisor" || 
      userRole === "manager" ||
      companyData?.ownerUid === userId;

    const baseProjects = (!userRole || isManagerOrHigher)
      ? localProjects
      : localProjects.filter((p) => p.createdBy === userId);

    return baseProjects.filter(p => !deletedProjects.has(p.id) && !p.isDeleted && p.status !== "deleted");
  }, [localProjects, userRole, userId, deletedProjects, companyData?.ownerUid]);

  const userSets = useMemo(() => {
    const isAdminOrSupervisor = 
      userRole === "admin" || 
      userRole === "supervisor" || 
      companyData?.ownerUid === userId;

    if (!userRole || isAdminOrSupervisor) {
      return localSets;
    }
    return localSets.filter((s) => s.createdBy === userId);
  }, [localSets, userRole, userId, companyData?.ownerUid]);

  // Map set.id -> subProjects
  const setSubProjectsMap = useMemo(() => {
    const map: Record<string, Project[]> = {};
    userSets.forEach(s => { map[s.id] = []; });

    userProjects.forEach(p => {
      const pSetId = p.setId || p.data?.setId;
      if (pSetId && map[pSetId]) {
        map[pSetId].push(p);
      } else {
        const foundSet = userSets.find(s => s.projectIds?.includes(p.id));
        if (foundSet) {
          map[foundSet.id].push(p);
        }
      }
    });
    return map;
  }, [userSets, userProjects]);

  // Set of all project IDs assigned to sets
  const assignedProjectIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(setSubProjectsMap).forEach(list => {
      list.forEach(p => ids.add(p.id));
    });
    return ids;
  }, [setSubProjectsMap]);

  // Standalone projects (not part of any set)
  const standaloneProjects = useMemo(() => {
    return userProjects.filter(p => !assignedProjectIds.has(p.id));
  }, [userProjects, assignedProjectIds]);

  // Search and manager filter helper
  const matchesSearchAndManager = (item: any, isSet: boolean, subProjs: Project[] = []) => {
    if (selectedManagerId) {
      if (isSet) {
        const setManager = item.createdBy;
        const subMatch = subProjs.some(sp => sp.createdBy === selectedManagerId);
        if (setManager !== selectedManagerId && !subMatch) return false;
      } else {
        if (item.createdBy !== selectedManagerId) return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();

    if (isSet) {
      const nameMatch = item.name?.toLowerCase().includes(q);
      const contractMatch = (item.contractNumber || "").toLowerCase().includes(q);
      const subMatch = subProjs.some(sp => sp.name?.toLowerCase().includes(q) || (sp as any).contractNumber?.toLowerCase().includes(q));
      return nameMatch || contractMatch || subMatch;
    } else {
      const employee = companyEmployees.find(emp => emp.uid === item.createdBy);
      const displayManagerName = employee ? (employee.name || employee.displayName || employee.email) : (item.createdByName || "Пользователь");
      const contractMatch = ((item as any).contractNumber || item.data?.contractNumber || "").toLowerCase().includes(q);
      return item.name?.toLowerCase().includes(q) || displayManagerName.toLowerCase().includes(q) || contractMatch;
    }
  };

  const uniqueMonths = useMemo(() => {
    const monthsSet = new Set<string>();

    userProjects.forEach((p) => {
      const raw = p.createdAt || (p as any).updatedAt || (p as any).savedAt;
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
          const monthStr = d.toISOString().slice(0, 7); // "YYYY-MM"
          monthsSet.add(monthStr);
        }
      }
    });

    userSets.forEach((s) => {
      if (s.createdAt) {
        const d = new Date(s.createdAt);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
          const monthStr = d.toISOString().slice(0, 7); // "YYYY-MM"
          monthsSet.add(monthStr);
        }
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [userProjects, userSets]);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const formatted = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const filteredDisplaySets = useMemo(() => {
    return userSets.filter(s => {
      const subProjs = setSubProjectsMap[s.id] || [];
      if (!matchesSearchAndManager(s, true, subProjs)) return false;

      if (selectedMonth !== "all") {
        const sMonth = s.createdAt ? s.createdAt.slice(0, 7) : "";
        if (sMonth !== selectedMonth) return false;
      }

      if (activeFilter === "all" || activeFilter === "sets") return true;

      const setStatus = s.status || (subProjs.length > 0 && subProjs.every(p => p.status === "sent") ? "sent" : "draft");
      return setStatus === activeFilter;
    });
  }, [userSets, setSubProjectsMap, searchQuery, selectedManagerId, activeFilter, selectedMonth, companyEmployees]);

  const filteredStandaloneProjects = useMemo(() => {
    return standaloneProjects.filter(p => {
      if (!matchesSearchAndManager(p, false)) return false;

      if (selectedMonth !== "all") {
        const raw = p.createdAt || (p as any).updatedAt || (p as any).savedAt;
        const pMonth = raw ? new Date(raw).toISOString().slice(0, 7) : "";
        if (pMonth !== selectedMonth) return false;
      }

      if (activeFilter === "all") return true;
      if (activeFilter === "sets") return false;
      return (p.status || "draft") === activeFilter;
    });
  }, [standaloneProjects, searchQuery, selectedManagerId, activeFilter, selectedMonth, companyEmployees]);

  const sortedDisplaySets = useMemo(() => {
    const result = [...filteredDisplaySets];
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      const subA = setSubProjectsMap[a.id] || [];
      const totalA = subA.length > 0 
        ? subA.reduce((sum: number, p: any) => sum + Number(p.totalPrice || (p.data?.results ? Object.values(p.data.results).reduce((acc: number, r: any) => acc + Number(r.totalPrice || 0), 0) : 0)), 0)
        : Number(a.totalPrice || 0);

      const subB = setSubProjectsMap[b.id] || [];
      const totalB = subB.length > 0 
        ? subB.reduce((sum: number, p: any) => sum + Number(p.totalPrice || (p.data?.results ? Object.values(p.data.results).reduce((acc: number, r: any) => acc + Number(r.totalPrice || 0), 0) : 0)), 0)
        : Number(b.totalPrice || 0);

      if (sortBy === "date-desc") {
        return timeB - timeA;
      } else if (sortBy === "date-asc") {
        return timeA - timeB;
      } else if (sortBy === "price-desc") {
        return totalB - totalA;
      } else if (sortBy === "price-asc") {
        return totalA - totalB;
      }
      return 0;
    });
    return result;
  }, [filteredDisplaySets, sortBy, setSubProjectsMap]);

  const sortedStandaloneProjects = useMemo(() => {
    const result = [...filteredStandaloneProjects];
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      const priceA = Number(a.totalPrice || (a.data?.results ? Object.values(a.data.results).reduce((acc: number, r: any) => acc + Number(r.totalPrice || 0), 0) : 0));
      const priceB = Number(b.totalPrice || (b.data?.results ? Object.values(b.data.results).reduce((acc: number, r: any) => acc + Number(r.totalPrice || 0), 0) : 0));

      if (sortBy === "date-desc") {
        return timeB - timeA;
      } else if (sortBy === "date-asc") {
        return timeA - timeB;
      } else if (sortBy === "price-desc") {
        return priceB - priceA;
      } else if (sortBy === "price-asc") {
        return priceA - priceB;
      }
      return 0;
    });
    return result;
  }, [filteredStandaloneProjects, sortBy]);

  const totalItemsCount = sortedDisplaySets.length + sortedStandaloneProjects.length;

  return (
    <div className="p-4 md:p-8" onClick={() => setOpenMenuId(null)}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Проекты и Комплекты
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSelectionMode && (
              <button
                onClick={handleCreateSet}
                disabled={isCreatingSet}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 animate-in zoom-in duration-300 disabled:opacity-50"
              >
                {isCreatingSet ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Combine className="w-4 h-4" />
                )}
                {isCreatingSet ? "Создание..." : `Создать комплект (${selectedProjectIds.size})`}
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
                placeholder="Поиск по названию, менеджеру, договору..."
              />
            </div>

            {userRole === "admin" && (
              <div className="relative w-full md:w-56">
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="block w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700"
                >
                  <option value="">Все менеджеры</option>
                  {companyEmployees.map((emp) => (
                    <option key={emp.uid} value={emp.uid}>
                      {emp.name || emp.displayName || emp.email || "Без имени"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative w-full md:w-48">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700"
              >
                <option value="all">Все месяцы</option>
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-52">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="block w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700"
              >
                <option value="date-desc">Сначала новые (дата ↓)</option>
                <option value="date-asc">Сначала старые (дата ↑)</option>
                <option value="price-desc">Сначала дорогие (сумма ↓)</option>
                <option value="price-asc">Сначала дешевые (сумма ↑)</option>
              </select>
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

        {loading || loadingSets ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalItemsCount === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Ничего не найдено
            </h2>
            <p className="text-gray-500">В этой категории пока нет проектов или комплектов</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. SET CARDS LIST */}
            {sortedDisplaySets.length > 0 && (
              <div className="space-y-6">
                <div 
                  onClick={() => setIsSetsGroupCollapsed(!isSetsGroupCollapsed)}
                  className="flex items-center justify-between cursor-pointer hover:bg-indigo-50/50 p-3 rounded-2xl transition-colors border border-transparent hover:border-indigo-100 bg-indigo-50/20"
                >
                  <h2 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2 select-none">
                    <Combine className="w-4 h-4 text-indigo-600" />
                    Комплекты проектов ({sortedDisplaySets.length})
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
                    <span>{isSetsGroupCollapsed ? "Развернуть группу" : "Свернуть группу"}</span>
                    {isSetsGroupCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>

                {!isSetsGroupCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
                    {sortedDisplaySets.map((set) => {
                    const subProjects = setSubProjectsMap[set.id] || [];
                    const setTotal = subProjects.length > 0 
                      ? subProjects.reduce((sum: number, p: any) => sum + Number(p.totalPrice || (p.data?.results ? Object.values(p.data.results).reduce((acc: number, r: any) => acc + Number(r.totalPrice || 0), 0) : 0)), 0)
                      : Number(set.totalPrice || 0);

                    const employee = companyEmployees.find(emp => emp.uid === set.createdBy);
                    const displayManagerName = employee ? (employee.name || employee.displayName || employee.email) : (set.createdByName || "Пользователь");

                    return (
                      <div 
                        key={set.id}
                        className="bg-white rounded-3xl border-2 border-indigo-100 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all overflow-visible relative flex flex-col justify-between"
                      >
                        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-t-[22px]" />
                        
                        <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Header Row */}
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 font-bold shadow-inner">
                                  <Combine className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h3 className="font-bold text-gray-900 text-base md:text-lg truncate">
                                      {set.name || `Заказ №${set.contractNumber || set.id.slice(0, 6)}`}
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1 flex-shrink-0">
                                      <Layers className="w-3 h-3" /> Комплект ({subProjects.length})
                                    </span>
                                    {set.contractNumber && (
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 flex-shrink-0">
                                        № {set.contractNumber}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                      {new Date(set.createdAt).toLocaleDateString("ru-RU")}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3.5 h-3.5 text-gray-400" />
                                      {displayManagerName}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-right">
                                  <div className="text-[10px] text-gray-400 font-bold uppercase">Сумма комплекта</div>
                                  <div className="text-lg md:text-xl font-extrabold text-indigo-700">
                                    {setTotal.toLocaleString()} ₽
                                  </div>
                                </div>

                                {/* Menu */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === set.id ? null : set.id);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                                  >
                                    <MoreVertical className="w-5 h-5" />
                                  </button>

                                  {openMenuId === set.id && (
                                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(null);
                                          if (onCreateSet && subProjects.length > 0) {
                                            onCreateSet(subProjects, set);
                                          }
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                      >
                                        <ClipboardList className="w-4 h-4 text-indigo-500" />
                                        Оформить комплект
                                      </button>

                                      {onOpenSetProposal && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(null);
                                            onOpenSetProposal(set, subProjects);
                                          }}
                                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                        >
                                          <FileText className="w-4 h-4 text-emerald-500" />
                                          Комм. предложение (КП)
                                        </button>
                                      )}

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(null);
                                          handleRenameSet(set);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Edit2 className="w-4 h-4 text-gray-500" />
                                        Переименовать
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(null);
                                          setAddProjectToSetModal(set);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <FolderPlus className="w-4 h-4 text-blue-500" />
                                        Добавить проект в комплект
                                      </button>

                                      {(userRole === "manager" || userRole === "admin") && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedBitrixProject(set);
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                        >
                                          <Send className="w-4 h-4" />
                                          Bitrix24
                                        </button>
                                      )}

                                      {(userRole === "manager" || userRole === "admin") && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTransferProject(set);
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                        >
                                          <Send className="w-4 h-4" />
                                          Отдать комплект
                                        </button>
                                      )}

                                      <div className="my-1 border-t border-gray-100" />

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(null);
                                          handleDissolveSet(set);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                                      >
                                        <Unlink className="w-4 h-4" />
                                        Расформировать комплект
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(null);
                                          handleDeleteSetWithProjects(set, subProjects);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Удалить комплект и все проекты
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Nested Sub-Projects List */}
                            <div className="mt-4 pt-3 border-t border-indigo-100/60">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-indigo-900/80 uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-indigo-500" /> Входящие проекты ({subProjects.length}):
                                </span>
                                <button
                                  onClick={() => {
                                    setCollapsedSetIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(set.id)) next.delete(set.id);
                                      else next.add(set.id);
                                      return next;
                                    });
                                  }}
                                  className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                >
                                  {collapsedSetIds.has(set.id) ? (
                                    <>Показать ({subProjects.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                                  ) : (
                                    <>Свернуть <ChevronUp className="w-3.5 h-3.5" /></>
                                  )}
                                </button>
                              </div>

                              {!collapsedSetIds.has(set.id) && (
                                <div className="space-y-2 mt-2">
                                  {subProjects.length === 0 ? (
                                    <div className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-2xl text-center">
                                      В этом комплекте нет активных проектов
                                    </div>
                                  ) : (
                                    subProjects.map((subProject) => {
                                      const projPrice = subProject.totalPrice || (subProject.data?.results ? Object.values(subProject.data.results).reduce((acc: number, r: any) => acc + (r.totalPrice || 0), 0) : 0);
                                      return (
                                        <div
                                          key={subProject.id}
                                          className="group/item flex items-center justify-between gap-3 p-3 bg-slate-50 hover:bg-indigo-50/60 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover/item:border-indigo-300 shadow-2xs">
                                              <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="font-bold text-gray-900 text-sm truncate">
                                                {subProject.name || "Без названия"}
                                              </div>
                                              <div className="text-xs text-indigo-600 font-extrabold">
                                                {projPrice.toLocaleString()} ₽
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                              onClick={() => onLoadProject(subProject)}
                                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                                              title="Открыть проект для редактирования"
                                            >
                                              <span>Открыть</span>
                                              <ArrowRight className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                              onClick={() => handleUnlinkProject(subProject, set)}
                                              className="p-1.5 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors text-xs font-medium"
                                              title="Исключить из комплекта"
                                            >
                                              <Unlink className="w-3.5 h-3.5" />
                                            </button>

                                            {onDeleteProject && (
                                              <button
                                                onClick={() => {
                                                  showConfirm(
                                                    "Удаление проекта",
                                                    `Вы уверены, что хотите удалить проект "${subProject.name}"?`,
                                                    () => handleSingleProjectDelete(subProject.id)
                                                  );
                                                }}
                                                className="p-1.5 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                                                title="Удалить проект"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}

            {/* 2. STANDALONE PROJECTS LIST */}
            {sortedStandaloneProjects.length > 0 && (
              <div className="space-y-6">
                <div 
                  onClick={() => setIsStandaloneGroupCollapsed(!isStandaloneGroupCollapsed)}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-3 rounded-2xl transition-colors border border-transparent hover:border-gray-100 bg-gray-50/20"
                >
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 select-none">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Отдельные проекты ({sortedStandaloneProjects.length})
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                    <span>{isStandaloneGroupCollapsed ? "Развернуть группу" : "Свернуть группу"}</span>
                    {isStandaloneGroupCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>

                {!isStandaloneGroupCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                    {sortedStandaloneProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() =>
                        isSelectionMode
                          ? toggleProjectSelection({} as any, project.id)
                          : onLoadProject(project)
                      }
                      className={cn(
                        "group bg-white p-5 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between",
                        selectedProjectIds.has(project.id)
                          ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg"
                          : "border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200",
                      )}
                    >
                      {/* Row 1: Header */}
                      <div>
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
                                const raw = project.createdAt || (project as any).updatedAt || (project as any).savedAt;
                                if (!raw) return "Нет даты";
                                const d = typeof raw === "object" && (raw as any)?.seconds 
                                  ? new Date((raw as any).seconds * 1000) 
                                  : new Date(raw);
                                if (isNaN(d.getTime()) || d.getFullYear() <= 1970) {
                                  return "Нет даты";
                                }
                                return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
                              })()}
                            </div>
                            {((project as any).contractNumber || project.data?.contractNumber) && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded-lg w-fit">
                                <span>Договор № {((project as any).contractNumber || project.data?.contractNumber)}</span>
                              </div>
                            )}
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

                        {/* Menu */}
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
                            {(userRole === "manager" || userRole === "admin") && onOpenProposal && (
                              <button onClick={(e) => { e.stopPropagation(); onOpenProposal(project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-indigo-600 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Комм. предложение (КП)
                              </button>
                            )}
                            {project.status === "sent" && (
                              <button onClick={(e) => { handleTransfer(e, project); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-blue-600 flex items-center gap-2">
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
                      </div>

                      {/* Row 2: Bottom Summary */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-4">
                        {(() => {
                          const employee = companyEmployees.find(emp => emp.uid === project.createdBy);
                          const displayManagerName = employee ? (employee.name || employee.displayName || employee.email) : (project.createdByName || "Пользователь");
                          const avatarLetter = (displayManagerName?.charAt(0) || "U").toUpperCase();
                          const avatarUrl = employee?.avatarUrl || employee?.photoURL || employee?.photoUrl || employee?.avatar || project.data?.createdByPhoto || project.createdByPhoto;
                          return (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={displayManagerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  avatarLetter
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Менеджер</span>
                                <span className="text-xs text-gray-900 font-bold truncate max-w-[124px]" title={displayManagerName}>
                                  {displayManagerName}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                        
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
                            {(() => {
                              const savedCoeffs = project.data?.coefficientsSnapshot?.resolvedCoefficients || project.data?.coefficients;
                              const hasDiffs = savedCoeffs && currentCoefficients && getCoefficientDifferences(savedCoeffs, currentCoefficients, project.data?.coefficientsSnapshot?.customerType || 'retail').length > 0;
                              if (!hasDiffs) return null;
                              return (
                                <div className="px-2 py-1 rounded-lg text-[10px] bg-amber-100 border border-amber-300 text-amber-900 font-extrabold flex items-center gap-1 shadow-2xs" title="Коэффициенты наценок компании изменились с момента расчета">
                                  ⚠️ Коэф. изменились
                                </div>
                              );
                            })()}
                          </div>
                          <span className="text-xl font-extrabold text-slate-800 tracking-tight">
                            {(project.totalPrice || (project.data?.results ? Object.values(project.data.results).reduce((acc: number, r: any) => acc + (r.totalPrice || 0), 0) : 0)).toLocaleString()} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Add Standalone Project to Set */}
      {addProjectToSetModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setAddProjectToSetModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                Добавить проект в комплект
              </h3>
              <button onClick={() => setAddProjectToSetModal(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mb-4">
              Выберите отдельный проект для добавления в комплект "{addProjectToSetModal.name || 'Без названия'}":
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {standaloneProjects.length === 0 ? (
                <div className="text-xs text-gray-400 italic p-4 text-center bg-gray-50 rounded-2xl">
                  Нет свободных отдельных проектов для добавления
                </div>
              ) : (
                standaloneProjects.map(sp => (
                  <div key={sp.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-indigo-50 rounded-2xl transition-colors border border-gray-100">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{sp.name}</div>
                      <div className="text-xs text-indigo-600 font-bold">{(sp.totalPrice || 0).toLocaleString()} ₽</div>
                    </div>
                    <button
                      onClick={() => handleAddProjectToSet(sp.id, addProjectToSetModal)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                    >
                      Добавить
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
          companyType={companyType}
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
              const targetEmp = companyEmployees.find(e => e.uid === targetUserId);
              const targetName = targetEmp ? (targetEmp.name || targetEmp.displayName || targetEmp.email) : "Пользователь";
              const isSet = selectedTransferProject.id.startsWith("set-") || (selectedTransferProject as any).projectIds !== undefined;
              
              if (isSet) {
                const batch = writeBatch(db);
                batch.update(
                  doc(db, "companies", companyId!, "sets", selectedTransferProject.id),
                  {
                    createdBy: targetUserId,
                    createdByName: targetName,
                  }
                );
                const subProjs = projects.filter(p => p.setId === selectedTransferProject.id || (selectedTransferProject as any).projectIds?.includes(p.id));
                for (const p of subProjs) {
                  batch.update(
                    doc(db, "companies", companyId!, "projects", p.id),
                    {
                      createdBy: targetUserId,
                      createdByName: targetName,
                    }
                  );
                }
                await batch.commit();
                if (showAlert) showAlert("Успешно", "Комплект и входящие в него проекты переданы");
              } else {
                await updateDoc(
                  doc(db, "companies", companyId!, "projects", selectedTransferProject.id),
                  {
                    createdBy: targetUserId,
                    createdByName: targetName,
                    status: "draft"
                  }
                );
                if (showAlert) showAlert("Успешно", "Проект передан");
              }
              setSelectedTransferProject(null);
            } catch (e) {
              console.error(e);
              if (showAlert) showAlert("Ошибка", "Не удалось передать");
            }
          }}
        />
      )}

      {/* Sticky Bottom Action Bar for Selection Mode */}
      {isSelectionMode && selectedProjectIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
              {selectedProjectIds.size}
            </span>
            <span>Выбрано проектов</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedProjectIds(new Set());
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateSet}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2"
            >
              <Combine className="w-4 h-4" />
              <span>Создать комплект ({selectedProjectIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Rename Set Modal */}
      {renamingSet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Переименовать комплект</h3>
                  <p className="text-xs text-gray-500">Укажите новое название для комплекта</p>
                </div>
              </div>
              <button 
                onClick={() => setRenamingSet(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Название комплекта / Заказа</label>
              <input
                type="text"
                value={newSetNameInput}
                onChange={(e) => setNewSetNameInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900"
                placeholder="Например: Кухня и шкаф (Заказ №123)"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRenameSet();
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRenamingSet(null)}
                disabled={isSavingRename}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveRenameSet}
                disabled={isSavingRename || !newSetNameInput.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingRename ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <span>Сохранить</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
