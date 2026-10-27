import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Shield, Mail, User, Briefcase, Settings, Trash2, Edit2, X, Check, Loader2, Lock, Crown, Sparkles } from 'lucide-react';
import { ModuleSubscriptionModal } from './ModuleSubscriptionModal';
// TimeWeb DB Setup
const db = {};
function collection(db: any, ...pathParts: string[]) {
  return { path: pathParts.join('/') };
}
function onSnapshot(ref: any, callback: (snap: any) => void) {
  let isFirstLoad = true;
  const fetchData = async () => {
    try {
      if (ref.path.split('/').length % 2 === 0) {
        // Doc ref
        const res = await fetch(`/api/db/doc/${ref.path}`);
        if (res.ok) {
          const data = await res.json();
          callback({ exists: () => true, data: () => data, metadata: { fromCache: false } });
        } else {
          callback({ exists: () => false, metadata: { fromCache: false } });
        }
      } else {
        // Collection ref
        const res = await fetch(`/api/db/col/${ref.path}`);
        if (res.ok) {
          const data = await res.json();
          callback({
            docs: data.map((d: any) => ({
              id: d.id,
              data: () => d.data,
              exists: () => true
            })),
            size: data.length,
            metadata: { fromCache: false }
          });
        }
      }
      isFirstLoad = false;
    } catch (e) {
      console.error("Snapshot error:", e);
    }
  };
  fetchData();
  const interval = setInterval(fetchData, 10000);
  return () => clearInterval(interval);
}
function doc(db: any, ...pathParts: string[]) {
  return { path: pathParts.join('/') };
}
async function setDoc(docRef: any, data: any, options?: any) {
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, merge: options?.merge })
  });
}
async function updateDoc(docRef: any, data: any, options?: any) {
  await fetch(`/api/db/doc/${docRef.path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, merge: options?.merge })
  });
}
async function deleteDoc(docRef: any) {
  await fetch(`/api/db/doc/${docRef.path}`, { method: 'DELETE' });
}
async function getDoc(docRef: any) {
  const res = await fetch(`/api/db/doc/${docRef.path}`);
  if (res.ok) {
    const data = await res.json();
    return { exists: () => true, data: () => data };
  }
  return { exists: () => false };
}
function query(ref: any, ...constraints: any[]) { return ref; }
function where(field: string, op: string, value: any) { return {}; }
import { cn } from '../../lib/utils';


// Employee management

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  accessLevel: 'admin' | 'supervisor' | 'manager' | 'worker';
  createdAt?: string;
  bitrix24UserId?: string;
  isProcurementManager?: boolean;
  isSalesManager?: boolean; // Отображать в разделе зарплат менеджеров
  canViewAllManagerSalaries?: boolean; // Доступны ли ему ВСЕ зарплаты менеджеров или только своя
}

export const AdminSettingsView = ({ 
  companyId, 
  currentUserId,
  showAlert,
  showConfirm,
  showPrompt
}: { 
  companyId?: string, 
  currentUserId?: string,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  showPrompt: (title: string, message: string, defaultValue: string, onConfirm: (value: string) => void) => void
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const uniqueEmployees = useMemo(() => {
    const seen = new Set<string>();
    return employees.filter(emp => {
      const key = (emp.email || emp.id || "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [employees]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    accessLevel: 'worker'
  });
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [tariffRequests, setTariffRequests] = useState<any[]>([]);
  const [tariffRequest, setTariffRequest] = useState({
    type: 'Мебельное производство',
    period: 'month',
    extraSalons: 0,
    extraDesigners: 0,
    extraEmployees: 0,
    extraCities: 0
  });

  const [b24Users, setB24Users] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const url = companyData?.bitrix24?.webhookUrl;
    if (url) {
      const loadB24Users = async () => {
        try {
          const res = await fetch("/api/bitrix24/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              webhookUrl: url,
              method: "user.get",
              params: {
                FILTER: { ACTIVE: "Y" }
              }
            })
          });
          const data = await res.json();
          if (data.result && Array.isArray(data.result)) {
            const users = data.result.map((u: any) => ({
              id: String(u.ID),
              name: `${u.LAST_NAME || ''} ${u.NAME || ''}`.trim() || `ID: ${u.ID}`
            }));
            setB24Users(users);
          }
        } catch (e) {
          console.error("Error loading B24 users in AdminSettingsView:", e);
        }
      };
      loadB24Users();
    }
  }, [companyData?.bitrix24?.webhookUrl]);

  useEffect(() => {
    if (!companyId) return;

    const unsubscribeEmployees = onSnapshot(collection(db, 'companies', companyId, 'employees'), (snapshot) => {
      const emps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(prev => (emps.length > 0 || prev.length === 0) ? emps : prev);
    });

    const unsubscribeCompany = onSnapshot(doc(db, 'companies', companyId), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyData(docSnap.data());
      }
    });

    const unsubscribeRequests = onSnapshot(
      query(collection(db, 'tariffRequests'), where('companyId', '==', companyId)),
      (snapshot) => {
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setTariffRequests(reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    );

    return () => {
      unsubscribeEmployees();
      unsubscribeCompany();
      unsubscribeRequests();
    };
  }, [companyId]);

  const handleTariffRequest = async () => {
    if (!companyId) return;
    try {
      await setDoc(doc(db, 'tariffRequests', Date.now().toString()), {
        companyId,
        companyName: companyData?.name,
        request: tariffRequest,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      setShowTariffModal(false);
      showAlert('Заявка отправлена', 'Ваша заявка на продление тарифа отправлена администратору. Мы свяжемся с вами в ближайшее время.');
    } catch (error) {
      console.error("Error sending tariff request:", error);
      showAlert('Ошибка', 'Не удалось отправить заявку');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setError(null);
    setIsLoading(true);

    if (newEmployee.name && newEmployee.email && newEmployee.role && newEmployee.accessLevel) {
      try {
        const trimmedEmail = newEmployee.email.trim().toLowerCase();
        let uid = editingId;

        // If it's a new employee, create them in our database first
        if (!editingId) {
          try {
            const res = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                email: trimmedEmail, 
                password: "123456",
                verified: true
              })
            });
            const data = await res.json();
            if (!res.ok) {
              if (data.code === 'auth/email-already-in-use' || data.error?.toLowerCase().includes('unique constraint') || data.error?.toLowerCase().includes('already-in-use')) {
                 throw { code: 'auth/email-already-in-use' };
              }
              throw new Error(data.error || "Failed to register employee");
            }
            uid = data.uid;
          } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
              // Lookup existing user UID
              const lookupRes = await fetch(`/api/auth/lookup?email=${encodeURIComponent(trimmedEmail)}`);
              const lookupData = await lookupRes.json();
              
              if (lookupRes.ok && lookupData.uid) {
                uid = lookupData.uid;
                // Force-update the password and verified status of the existing user so they can login with standard password "123456"
                const patchRes = await fetch(`/api/auth/user/${uid}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password: "123456", verified: true })
                });
                if (!patchRes.ok) {
                  const patchData = await patchRes.json();
                  throw new Error(patchData.error || "Не удалось сбросить пароль для существующего пользователя");
                }
              } else {
                setError('Пользователь с таким Email уже существует в системе, но получить его UID не удалось.');
                setIsLoading(false);
                return;
              }
            } else {
              throw authError;
            }
          }
        }

        if (!uid) throw new Error('UID is missing');

        const employeeData = {
          uid: uid,
          name: newEmployee.name,
          email: trimmedEmail,
          role: newEmployee.role,
          accessLevel: newEmployee.accessLevel || 'worker',
          companyId: companyId,
          createdAt: newEmployee.createdAt || new Date().toISOString(),
          bitrix24UserId: newEmployee.bitrix24UserId || null,
          isProcurementManager: !!newEmployee.isProcurementManager,
          isSalesManager: !!newEmployee.isSalesManager,
          canViewAllManagerSalaries: !!newEmployee.canViewAllManagerSalaries
        };
        console.log("Saving employee:", employeeData);

        // 1. Create/Update in global 'users' collection (for auth and rules)
        await setDoc(doc(db, 'users', uid), employeeData, { merge: true });

        // 2. Create/Update in company 'employees' collection (for listing in admin panel)
        const employeeDataForCompany = {
          name: newEmployee.name,
          email: trimmedEmail,
          role: newEmployee.role, // This is the job title (e.g. "Менеджер проектов")
          accessLevel: newEmployee.accessLevel || 'worker',
          bitrix24UserId: newEmployee.bitrix24UserId || null,
          isProcurementManager: !!newEmployee.isProcurementManager,
          isSalesManager: !!newEmployee.isSalesManager,
          canViewAllManagerSalaries: !!newEmployee.canViewAllManagerSalaries
        };
        console.log("Saving employee for company:", employeeDataForCompany);
        await setDoc(doc(db, 'companies', companyId, 'employees', uid), employeeDataForCompany, { merge: true });

        setIsAdding(false);
        setEditingId(null);
        setNewEmployee({ accessLevel: 'worker' });
      } catch (error: any) {
        console.error("Error saving employee:", error);
        setError('Ошибка при сохранении сотрудника: ' + (error.message || 'Неизвестная ошибка'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removeEmployee = async (id: string) => {
    if (!companyId) return;
    if (id === currentUserId) {
      showAlert('Ошибка', 'Вы не можете удалить самого себя');
      return;
    }
    
    showConfirm('Удаление сотрудника', 'Вы уверены, что хотите удалить сотрудника? Доступ в систему будет заблокирован.', async () => {
      try {
        // 1. Delete from company employees list
        await deleteDoc(doc(db, 'companies', companyId, 'employees', id));
        // 2. Delete from global users (this revokes permissions in security rules)
        await deleteDoc(doc(db, 'users', id));
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    });
  };

  const changePassword = (employee: Employee) => {
    showPrompt('Смена пароля', `Введите новый пароль для ${employee.name}:`, '123456', async (newPass) => {
      if (newPass) {
        setIsLoading(true);
        setError(null);
        try {
          const res = await fetch(`/api/auth/user/${employee.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: newPass, verified: true })
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Не удалось изменить пароль");
          }
          showAlert('Смена пароля', `Пароль для ${employee.name} успешно изменен на "${newPass}"`);
        } catch (error: any) {
          console.error("Error changing password:", error);
          showAlert('Ошибка', 'Не удалось изменить пароль: ' + error.message);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const restoreAccess = async (employee: Employee) => {
    if (!companyId) return;
    
    showConfirm('Восстановление доступа', `Вы хотите восстановить доступ для ${employee.name}? Это сбросит/создаст учетную запись в Auth с паролем 123456.`, async () => {
      setIsLoading(true);
      setError(null);
      try {
        const trimmedEmail = employee.email.trim().toLowerCase();
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              email: trimmedEmail, 
              password: "123456",
              verified: true
            })
          });
          const data = await res.json();
          let uid = data.uid;
          
          if (!res.ok) {
            if (data.code === 'auth/email-already-in-use' || data.error?.toLowerCase().includes('unique constraint') || data.error?.toLowerCase().includes('already-in-use')) {
               const lookupRes = await fetch(`/api/auth/lookup?email=${encodeURIComponent(trimmedEmail)}`);
               const lookupData = await lookupRes.json();
               if (lookupRes.ok && lookupData.uid) {
                 uid = lookupData.uid;
                 
                 // Force-update the password for existing user
                 const patchRes = await fetch(`/api/auth/user/${uid}`, {
                   method: "PATCH",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ password: "123456", verified: true })
                 });
                 if (!patchRes.ok) {
                   const patchData = await patchRes.json();
                   throw new Error(patchData.error || "Не удалось сбросить пароль");
                 }
                 showAlert('Информация', 'Учетная запись уже существовала. Доступ восстановлен, пароль сброшен на default: 123456');
               } else {
                 throw new Error("User exists but could not lookup UID");
               }
            } else {
               throw new Error(data.error || "Failed to register employee");
            }
          }

          // Update UID if it changed
          const employeeData = {
            uid: uid,
            name: employee.name,
            email: trimmedEmail,
            role: employee.role, accessLevel: employee.accessLevel || 'worker',
            companyId: companyId,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', uid), employeeData, { merge: true });
          if (uid !== employee.id) {
            await deleteDoc(doc(db, 'companies', companyId, 'employees', employee.id));
            await setDoc(doc(db, 'companies', companyId, 'employees', uid), employeeData);
          } else {
            await setDoc(doc(db, 'companies', companyId, 'employees', uid), employeeData, { merge: true });
          }
          
          if (res.ok) {
             showAlert('Успех', 'Доступ успешно восстановлен. Пароль по умолчанию: 123456');
          }
        } catch (authError: any) {
          throw authError;
        }
      } catch (error: any) {
        console.error("Error restoring access:", error);
        setError('Ошибка при восстановлении доступа: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const startEdit = (emp: Employee) => {
    setNewEmployee(emp);
    setEditingId(emp.id);
    setIsAdding(true);
  };

  const makeProjectManager = (employee: Employee) => {
    if (!companyId) return;
    showConfirm('Назначить руководителя', `Сотрудник ${employee.name} получит должность 'Руководитель проекта' и полный доступ к системе (как администратор). Продолжить?`, async () => {
      try {
        await setDoc(doc(db, 'users', employee.id), {
          uid: employee.id,
          name: employee.name,
          email: employee.email,
          role: 'admin',
          companyId: companyId,
          createdAt: employee.createdAt || new Date().toISOString()
        });

        await setDoc(doc(db, 'companies', companyId, 'employees', employee.id), {
          ...employee,
          role: 'Руководитель проекта',
          accessLevel: 'admin'
        });
        showAlert('Успешно', `Сотрудник ${employee.name} назначен руководителем проекта.`);
      } catch (error: any) {
        console.error("Error making project manager:", error);
        showAlert('Ошибка', 'Не удалось назначить руководителя: ' + error.message);
      }
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Employees Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Сотрудники</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Управление доступом сотрудников и отметка менеджеров для раздела «Зарплаты»
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                setEditingId(null);
                setNewEmployee({ accessLevel: 'worker', isSalesManager: false, canViewAllManagerSalaries: false });
                setIsAdding(true);
              }}
              className="flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-5 h-5 mr-2" />
              Добавить сотрудника
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сотрудник</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Должность</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Доступ и роли</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Действия</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uniqueEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {employee.name ? employee.name.split(' ').map(n => n[0]).join('').substring(0, 2) : '??'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                          {employee.bitrix24UserId && (
                            <div className="text-xs text-blue-600 font-semibold mt-0.5" title={`Bitrix24 User ID: ${employee.bitrix24UserId}`}>
                              Bitrix24: {b24Users.find(u => u.id === employee.bitrix24UserId)?.name || `ID: ${employee.bitrix24UserId}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          employee.accessLevel === 'admin' ? "bg-purple-100 text-purple-800" :
                          employee.accessLevel === 'supervisor' ? "bg-orange-100 text-orange-800" :
                          employee.accessLevel === 'manager' ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        )}>
                          {employee.accessLevel === 'admin' ? 'Администратор' :
                           employee.accessLevel === 'supervisor' ? 'Руководитель' :
                           employee.accessLevel === 'manager' ? 'Менеджер' : 'Сотрудник'}
                        </span>
                        {employee.isSalesManager && (
                          <span className="px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            💼 Менеджер (в разделе Зарплат)
                          </span>
                        )}
                        {employee.canViewAllManagerSalaries && (
                          <span className="px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            👁️ Все ЗП менеджеров
                          </span>
                        )}
                        {employee.isProcurementManager && (
                          <span className="px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            📦 Снабжение
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => changePassword(employee)}
                        className="text-orange-600 hover:text-orange-900 mr-4 cursor-pointer"
                        title="Сменить пароль"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => restoreAccess(employee)}
                        className="text-green-600 hover:text-green-900 mr-4 cursor-pointer"
                        title="Восстановить доступ / Создать Auth аккаунт"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      {employee.accessLevel !== 'admin' && (
                        <button 
                          onClick={() => makeProjectManager(employee)}
                          className="text-purple-600 hover:text-purple-900 mr-4 cursor-pointer"
                          title="Назначить руководителем проекта (Полный доступ)"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setError(null);
                          startEdit(employee);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4 cursor-pointer"
                        title="Редактировать сотрудника"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {employee.id !== currentUserId && (
                        <button 
                          onClick={() => removeEmployee(employee.id)}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                          title="Удалить сотрудника"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {uniqueEmployees.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Нет добавленных сотрудников
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Всплывающее окно создания / редактирования сотрудника */}
      {isAdding && (
        <div
          className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => {
            setIsAdding(false);
            setEditingId(null);
            setError(null);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 my-8 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">
                    {editingId ? 'Редактировать сотрудника' : 'Новый сотрудник'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Заполните данные сотрудника и отметьте нужные права доступа
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setError(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ФИО</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={newEmployee.name || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Петров Петр"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email (Логин)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={!!editingId}
                    value={newEmployee.email || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="worker@company.ru"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Должность</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={newEmployee.role || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Менеджер проектов"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Уровень доступа</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    required
                    value={newEmployee.accessLevel || 'worker'}
                    onChange={(e) => setNewEmployee({ ...newEmployee, accessLevel: e.target.value as any })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none bg-white"
                  >
                    <option value="admin">Администратор (Полный доступ)</option>
                    <option value="supervisor">Руководитель (Просмотр переданных)</option>
                    <option value="manager">Менеджер (Создание заказов)</option>
                    <option value="worker">Сотрудник (Только просмотр)</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!newEmployee.isSalesManager}
                    onChange={(e) => setNewEmployee({ ...newEmployee, isSalesManager: e.target.checked })}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-900">Является менеджером (отображается в разделе «Зарплаты»)</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Включает сотрудника в раздел «Зарплаты»: ведомость начисления, учет встреч и сделок, план продаж и фиксацию выдачи зарплаты
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer pt-2.5 border-t border-blue-200/50">
                  <input
                    type="checkbox"
                    checked={!!newEmployee.canViewAllManagerSalaries}
                    onChange={(e) => setNewEmployee({ ...newEmployee, canViewAllManagerSalaries: e.target.checked })}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-900">Доступ ко всем зарплатам менеджеров</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Если выключено: сотрудник видит только свои сделки и свою зарплату. Если включено: доступны зарплаты и аналитика всех менеджеров
                    </p>
                  </div>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    checked={!!newEmployee.isProcurementManager}
                    onChange={(e) => setNewEmployee({ ...newEmployee, isProcurementManager: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-gray-700">Занимается закупками (раздел «Снабжение»)</span>
                </label>
              </div>

              {companyData?.bitrix24?.webhookUrl && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Связать с пользователем Bitrix24</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Settings className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={newEmployee.bitrix24UserId || ''}
                      onChange={(e) => setNewEmployee({ ...newEmployee, bitrix24UserId: e.target.value || null })}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none bg-white"
                    >
                      <option value="">-- Не привязан --</option>
                      {b24Users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} (ID: {u.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">При создании сделки в Bitrix24 этим сотрудником, ответственным автоматически будет назначен выбранный пользователь.</p>
                </div>
              )}

              <div className="md:col-span-2 p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-700">
                <span className="font-bold">Важно:</span> Сотрудники могут войти в кабинет, используя свой Email и пароль по умолчанию: <span className="font-mono font-bold">123456</span>.
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setError(null);
                  }}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Сохранить изменения' : 'Добавить сотрудника'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
