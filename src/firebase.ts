
// Mock Firebase implementation using localStorage

// Simple UUID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// --- Auth Mocks ---
class MockUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: any[];

  constructor(data: any) {
    this.uid = data.uid || generateId();
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
    const savedUser = localStorage.getItem('mock_auth_user');
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
      localStorage.setItem('mock_auth_user', JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem('mock_auth_user');
    }
  }
}

export const auth = new MockAuth() as any;

export const onAuthStateChanged = (authObj: any, callback: any) => {
  const authInstance = authObj as any;
  authInstance.listeners.push(callback);
  // Immediate call
  setTimeout(() => callback(authInstance.currentUser), 0);
  return () => {
    authInstance.listeners = authInstance.listeners.filter((l: any) => l !== callback);
  };
};

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const authInstance = authObj as any;
  const user = { uid: 'user_' + btoa(email).substring(0, 10), email };
  authInstance.currentUser = new MockUser(user);
  authInstance.save();
  authInstance.updateListeners();
  return { user: authInstance.currentUser };
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const authInstance = authObj as any;
  const user = { uid: 'user_' + btoa(email).substring(0, 10), email };
  authInstance.currentUser = new MockUser(user);
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

const getStorageKey = (path: string) => path ? `mock_db_${path.replace(/\//g, '_')}` : '';

export const getDoc = async (docRef: any) => {
  const path = docRef?.path;
  if (!path) return { exists: () => false, data: () => null, id: '' } as any;
  const data = localStorage.getItem(getStorageKey(path));
  return {
    exists: () => data !== null,
    data: () => data ? JSON.parse(data) : null,
    id: path.split('/').pop()
  } as any;
};

export const getDocFromServer = getDoc;

export const setDoc = async (docRef: any, data: any, options: any = {}) => {
  let finalData = data;
  if (options.merge) {
    const existing = localStorage.getItem(getStorageKey(docRef.path));
    if (existing) {
      finalData = { ...JSON.parse(existing), ...data };
    }
  }
  localStorage.setItem(getStorageKey(docRef.path), JSON.stringify(finalData));
  
  // Trigger onSnapshot listeners
  const collectionPath = docRef.path.split('/').slice(0, -1).join('/');
  notifyListeners(collectionPath);
  notifyListeners(docRef.path);
};

export const updateDoc = async (docRef: any, data: any) => {
  const existing = localStorage.getItem(getStorageKey(docRef.path));
  if (existing) {
    const updated = { ...JSON.parse(existing), ...data };
    localStorage.setItem(getStorageKey(docRef.path), JSON.stringify(updated));
    
    const collectionPath = docRef.path.split('/').slice(0, -1).join('/');
    notifyListeners(collectionPath);
    notifyListeners(docRef.path);
  } else {
    // If it doesn't exist, just set it (be forgiving in local mock)
    await setDoc(docRef, data);
  }
};

export const addDoc = async (colRef: any, data: any) => {
  const id = generateId();
  const docRef = doc(colRef, id);
  await setDoc(docRef, { ...data, id });
  return { id, path: docRef.path } as any;
};

export const deleteDoc = async (docRef: any) => {
  localStorage.removeItem(getStorageKey(docRef.path));
  const collectionPath = docRef.path.split('/').slice(0, -1).join('/');
  notifyListeners(collectionPath);
  notifyListeners(docRef.path);
};

const listeners: Record<string, ((snapshot: any) => void)[]> = {};

const notifyListeners = (path: string) => {
  if (!path) return;
  if (listeners[path]) {
    // Collect all documents in this collection for collection listeners
    const allKeys = Object.keys(localStorage);
    const prefix = `mock_db_${path.replace(/\//g, '_')}_`;
    
    listeners[path].forEach(async (cb) => {
        if (path.split('/').filter(Boolean).length % 2 === 0) {
            // Document listener
            const snap = await getDoc({path});
            cb(snap);
        } else {
            // Collection listener
            const docs: any[] = [];
            allKeys.forEach(key => {
                if (key.startsWith(prefix)) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const parsed = JSON.parse(data);
                        docs.push({
                            data: () => parsed,
                            id: key.replace(prefix, '')
                        });
                    }
                }
            });
            cb({ docs } as any);
        }
    });
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
      // Collection snapshot
      const allKeys = Object.keys(localStorage);
      const prefix = `mock_db_${path.replace(/\//g, '_')}_`;
      const docs: any[] = [];
      allKeys.forEach(key => {
          if (key.startsWith(prefix)) {
              const data = localStorage.getItem(key);
              if (data) {
                  const parsed = JSON.parse(data);
                  docs.push({
                      data: () => parsed,
                      id: key.replace(prefix, '')
                  });
              }
          }
      });
      callback({ docs } as any);
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
  const allKeys = Object.keys(localStorage);
  const prefix = `mock_db_${path.replace(/\//g, '_')}_`;
  const docs: any[] = [];
  allKeys.forEach(key => {
      // Check if it's a direct child of the collection
      if (key.startsWith(prefix) && key.split('_').length === (prefix.split('_').length)) {
          const data = localStorage.getItem(key);
          if (data) {
              const parsed = JSON.parse(data);
              docs.push({
                  data: () => parsed,
                  id: key.replace(prefix, ''),
                  exists: () => true
              });
          }
      }
  });
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
