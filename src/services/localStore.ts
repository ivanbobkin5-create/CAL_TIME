import fs from "fs";
import path from "path";

export interface LocalDoc {
  id: string;
  path: string;
  collection: string;
  docId: string;
  data: string; // JSON string
  createdAt: string;
  updatedAt: string;
  needsSync?: boolean;
}

export interface LocalUser {
  uid: string;
  email: string;
  password?: string;
  verified: boolean;
  createdAt: string;
}

interface LocalStoreData {
  documents: Record<string, LocalDoc>;
  users: Record<string, LocalUser>;
  tokens: Record<string, any>;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "db_fallback.json");

class LocalStore {
  private data: LocalStoreData = {
    documents: {},
    users: {},
    tokens: {},
  };
  private isLoaded = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, "utf-8");
        this.data = JSON.parse(raw);
      }
    } catch (e) {
      console.warn("[LocalStore] Warning loading store from disk:", e);
    }
    this.isLoaded = true;
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), "utf-8");
      } catch (e) {
        console.warn("[LocalStore] Warning saving store to disk:", e);
      }
    }, 250);
  }

  public getDoc(docPath: string): LocalDoc | null {
    return this.data.documents[docPath] || null;
  }

  public setDoc(
    docPath: string,
    collection: string,
    docId: string,
    data: any,
    merge: boolean = false,
    needsSync: boolean = true
  ): LocalDoc {
    const now = new Date().toISOString();
    let dataStr = typeof data === "string" ? data : JSON.stringify(data);

    const existing = this.data.documents[docPath];
    if (existing && merge) {
      try {
        const prevObj = typeof existing.data === "string" ? JSON.parse(existing.data) : existing.data;
        const newObj = typeof data === "string" ? JSON.parse(data) : data;
        dataStr = JSON.stringify({ ...prevObj, ...newObj });
      } catch {
        // fallback to dataStr
      }
    }

    const doc: LocalDoc = {
      id: existing?.id || docId || `doc_${Date.now()}`,
      path: docPath,
      collection,
      docId,
      data: dataStr,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      needsSync,
    };

    this.data.documents[docPath] = doc;
    this.scheduleSave();
    return doc;
  }

  public deleteDoc(docPath: string) {
    if (this.data.documents[docPath]) {
      delete this.data.documents[docPath];
      this.scheduleSave();
    }
  }

  public getCollection(colPath: string): LocalDoc[] {
    const results: LocalDoc[] = [];
    for (const key in this.data.documents) {
      const doc = this.data.documents[key];
      if (doc.collection === colPath || doc.path.startsWith(colPath + "/")) {
        results.push(doc);
      }
    }
    return results;
  }

  public getUser(email: string): LocalUser | null {
    const lower = email.toLowerCase().trim();
    for (const key in this.data.users) {
      if (this.data.users[key].email.toLowerCase() === lower) {
        return this.data.users[key];
      }
    }
    return null;
  }

  public upsertUser(email: string, passwordHash: string, verified: boolean = true, uid?: string): LocalUser {
    const lower = email.toLowerCase().trim();
    const existing = this.getUser(lower);
    const userId = uid || existing?.uid || `user_${Date.now()}`;
    const user: LocalUser = {
      uid: userId,
      email: lower,
      password: passwordHash,
      verified,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    this.data.users[userId] = user;
    this.scheduleSave();
    return user;
  }

  public getPendingSyncDocs(): LocalDoc[] {
    return Object.values(this.data.documents).filter((d) => d.needsSync);
  }

  public markSynced(docPath: string) {
    if (this.data.documents[docPath]) {
      this.data.documents[docPath].needsSync = false;
      this.scheduleSave();
    }
  }
}

export const localStore = new LocalStore();
