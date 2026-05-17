
// Custom Firebase-like implementation backed by Postgres API

const API_BASE = "/api/firebase";

// Simple UUID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// --- Auth ---
class MockUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: any[];

  constructor(data: any) {
    this.uid = data.uid;
    this.email = data.email || null;
    this.emailVerified = true;
    this.isAnonymous = false;
    this.tenantId = null;
    this.providerData = [];
  }
}

class MockAuth {
  currentUser: MockUser | null = null;
  listeners: ((user: MockUser | null) => void)[] = [];

  constructor() {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        this.currentUser = new MockUser(JSON.parse(savedUser));
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  updateListeners() {
    this.listeners.forEach(l => l(this.currentUser));
  }

  save() {
    if (this.currentUser) {
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem('auth_user');
    }
  }
}

export const auth = new MockAuth() as any;

export const onAuthStateChanged = (authObj: any, callback: any) => {
  const authInstance = authObj as any;
  authInstance.listeners.push(callback);
  setTimeout(() => callback(authInstance.currentUser), 0);
  return () => {
    authInstance.listeners = authInstance.listeners.filter((l: any) => l !== callback);
  };
};

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass })
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  const authInstance = authObj as any;
  authInstance.currentUser = new MockUser(data);
  authInstance.save();
  authInstance.updateListeners();
  return { user: authInstance.currentUser };
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass })
  });
  if (!res.ok) throw new Error("Failed to register");
  const data = await res.json();
  const authInstance = authObj as any;
  authInstance.currentUser = new MockUser(data);
  authInstance.save();
  authInstance.updateListeners();
  return { user: authInstance.currentUser };
};

export const signOut = async (authObj: any) => {
  const authInstance = authObj as any;
  authInstance.currentUser = null;
  authInstance.save();
  authInstance.updateListeners();
};

// --- Firestore Mocks ---
class MockDb {}
export const db = new MockDb() as any;

export const collection = (db: any, path: string, ...rest: string[]) => {
  const fullPath = [path, ...rest].filter(x => x !== undefined && x !== null).join('/');
  return { type: 'collection', path: fullPath };
};
export const doc = (parent: any, path: string, ...rest: string[]) => {
  if (!parent) return { type: 'doc', path: path };
  if (parent.type === 'collection') {
    const fullPath = [parent.path, path, ...rest].filter(x => x !== undefined && x !== null).join('/');
    return { type: 'doc', path: fullPath };
  }
  const parentPath = parent.path;
  const fullPath = [parentPath, path, ...rest].filter(x => x !== undefined && x !== null).join('/');
  return { type: 'doc', path: fullPath };
};

export const getDoc = async (docRef: any) => {
  const path = docRef?.path;
  if (!path) return { exists: () => false, data: () => null, id: '' } as any;
  
  const res = await fetch(`${API_BASE}/doc/${path}`);
  if (!res.ok) {
    return { exists: () => false, data: () => null, id: path.split('/').pop() } as any;
  }
  const data = await res.json();
  return {
    exists: () => true,
    data: () => data,
    id: path.split('/').pop()
  } as any;
};

export const getDocFromServer = getDoc;

export const setDoc = async (docRef: any, data: any, options: any = {}) => {
  const res = await fetch(`${API_BASE}/doc/${docRef.path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, merge: options.merge })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to set document: ${res.status} ${errorText}`);
  }
  
  const collectionPath = docRef.path.split('/').slice(0, -1).join('/');
  notifyListeners(collectionPath);
  notifyListeners(docRef.path);
};

export const updateDoc = async (docRef: any, data: any) => {
  const res = await fetch(`${API_BASE}/doc/${docRef.path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data })
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update document: ${res.status} ${errorText}`);
  }
  
  const collectionPath = docRef.path.split('/').slice(0, -1).join('/');
  notifyListeners(collectionPath);
  notifyListeners(docRef.path);
};

export const addDoc = async (colRef: any, data: any) => {
  const id = generateId();
  const docRef = doc(colRef, id);
  await setDoc(docRef, { ...data, id });
  return { id, path: docRef.path } as any;
};

export const deleteDoc = async (docRef: any) => {
  const res = await fetch(`${API_BASE}/doc/${docRef.path}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete document: ${res.status} ${errorText}`);
  }
  const collectionPath = docRef.path.split('/').slice(0, -1).join('/');
  notifyListeners(collectionPath);
  notifyListeners(docRef.path);
};

const listeners: Record<string, ((snapshot: any) => void)[]> = {};

const notifyListeners = async (path: string) => {
  if (!path) return;
  if (listeners[path]) {
    for (const cb of listeners[path]) {
        if (path.split('/').filter(Boolean).length % 2 === 0) {
            // Document listener
            const snap = await getDoc({path});
            cb(snap);
        } else {
            // Collection listener
            const res = await fetch(`${API_BASE}/col/${path}`);
            if (res.ok) {
                const docsData = await res.json();
                const docs = docsData.map((d: any) => ({
                    id: d.id,
                    data: () => d.data,
                    exists: () => true
                }));
                cb({ docs } as any);
            }
        }
    }
  }
};

export const onSnapshot = (ref: any, callback: any, errorCallback?: any) => {
  const path = ref?.path;
  if (!path) return () => {};
  if (!listeners[path]) listeners[path] = [];
  listeners[path].push(callback);
  
  // Initial call
  if (path.split('/').filter(Boolean).length % 2 === 0) {
      getDoc(ref).then(callback);
  } else {
      fetch(`${API_BASE}/col/${path}`).then(r => r.json()).then(docsData => {
         const docs = docsData.map((d: any) => ({
             id: d.id,
             data: () => d.data,
             exists: () => true
         }));
         callback({ docs } as any);
      }).catch(e => {
        if(errorCallback) errorCallback(e);
      });
  }

  return () => {
    listeners[path] = listeners[path].filter(l => l !== callback);
  };
};

export const query = (ref: any, ...constraints: any[]) => ref;
export const where = (field: string, op: string, value: any) => ({ field, op, value });
export const serverTimestamp = () => new Date().toISOString();

export const writeBatch = (db: any) => {
  const operations: any[] = [];
  return {
    set: (docRef: any, data: any) => operations.push({ type: 'set', docRef, data }),
    update: (docRef: any, data: any) => operations.push({ type: 'update', docRef, data }),
    delete: (docRef: any) => operations.push({ type: 'delete', docRef }),
    commit: async () => {
      for (const op of operations) {
        if (op.type === 'set') await setDoc(op.docRef, op.data);
        if (op.type === 'update') await updateDoc(op.docRef, op.data);
        if (op.type === 'delete') await deleteDoc(op.docRef);
      }
    }
  } as any;
};

// Error handling compatibility
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const getDocs = async (ref: any) => {
  const path = ref?.path;
  if (!path) return { docs: [], forEach: () => {}, empty: true, size: 0 } as any;
  
  const res = await fetch(`${API_BASE}/col/${path}`);
  if (!res.ok) return { docs: [], forEach: () => {}, empty: true, size: 0 } as any;
  
  const docsData = await res.json();
  const docs = docsData.map((d: any) => ({
      id: d.id,
      data: () => d.data,
      exists: () => true
  }));
  
  return {
    docs,
    forEach: (cb: any) => docs.forEach(cb),
    empty: docs.length === 0,
    size: docs.length
  } as any;
};

export const limit = (n: number) => ({ type: 'limit', n });
export const orderBy = (field: string, direction: string = 'asc') => ({ type: 'orderBy', field, direction });
export const startAfter = (val: any) => ({ type: 'startAfter', val });
export const increment = (n: number) => n; // Simple mock
export const or = (...args: any[]) => ({ type: 'or', args });
export const and = (...args: any[]) => ({ type: 'and', args });
export const getCountFromServer = async (query: any) => {
    const res = await getDocs(query);
    return { data: () => ({ count: res.docs.length }) } as any;
};

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Mock DB Error: ', error, operationType, path);
}

export const initializeApp = () => ({});
export const getAuth = () => auth;
export const initializeFirestore = () => db;
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});

