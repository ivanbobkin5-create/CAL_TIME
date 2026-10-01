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
  companyId?: string;
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

function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function safeDeepMerge(target: any, source: any): any {
  if (!target) return source || {};
  if (!source) return target || {};
  const output = { ...target };

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (isObject(srcVal) && isObject(tgtVal)) {
      output[key] = safeDeepMerge(tgtVal, srcVal);
    } else if (srcVal !== undefined) {
      if (srcVal === "" && typeof tgtVal === "string" && tgtVal.trim().length > 0 && (key.toLowerCase().includes("webhook") || key.toLowerCase().includes("stage") || key.toLowerCase().includes("token") || key.toLowerCase().includes("secret"))) {
        output[key] = tgtVal;
      } else {
        output[key] = srcVal;
      }
    }
  }
  return output;
}

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
        this.consolidateAllToMebelFaktura();
      }
    } catch (e) {
      console.warn("[LocalStore] Warning loading store from disk:", e);
    }
    this.isLoaded = true;
  }

  public consolidateAllToMebelFaktura() {
    const docs = this.data.documents;
    if (!docs) return;
    let changed = false;

    for (const key of Object.keys(docs)) {
      const parts = key.split("/");
      if (parts[0] === "companies" && parts.length > 1) {
        const cid = parts[1];
        if (cid !== "e5om9lzxh") {
          if (parts.length === 2) {
            delete docs[key];
            changed = true;
          } else {
            const rest = parts.slice(2).join("/");
            const newKey = "companies/e5om9lzxh/" + rest;
            const oldDoc = docs[key];
            if (oldDoc) {
              try {
                const parsed = JSON.parse(oldDoc.data);
                if (parsed && typeof parsed === "object") {
                  if (parsed.companyId) parsed.companyId = "e5om9lzxh";
                  if (parsed.ownerCompanyId) parsed.ownerCompanyId = "e5om9lzxh";
                  oldDoc.data = JSON.stringify(parsed);
                }
              } catch (_) {}
              oldDoc.path = newKey;
              oldDoc.collection = "companies/e5om9lzxh/" + parts.slice(2, -1).join("/");
              if (!docs[newKey]) {
                docs[newKey] = oldDoc;
              }
            }
            delete docs[key];
            changed = true;
          }
        }
      }
    }

    const users = this.data.users;
    if (users) {
      for (const uid in users) {
        if (users[uid] && users[uid].companyId !== "e5om9lzxh") {
          users[uid].companyId = "e5om9lzxh";
          changed = true;
        }
      }
    }

    if (changed) {
      this.scheduleSave();
    }
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
        const mergedObj = safeDeepMerge(prevObj, newObj);
        dataStr = JSON.stringify(mergedObj);
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
    let changed = false;
    for (const key in this.data.documents) {
      if (key === docPath || key.startsWith(docPath + "/")) {
        delete this.data.documents[key];
        changed = true;
      }
    }
    if (changed) {
      this.scheduleSave();
    }
  }

  public deleteCollection(colOrPrefix: string) {
    let changed = false;
    for (const key in this.data.documents) {
      if (key === colOrPrefix || key.startsWith(colOrPrefix + "/")) {
        delete this.data.documents[key];
        changed = true;
      }
    }
    if (changed) {
      this.scheduleSave();
    }
  }

  public getCollection(colPath: string): LocalDoc[] {
    const results: LocalDoc[] = [];
    const expectedDepth = colPath.split("/").filter(Boolean).length + 1;
    for (const key in this.data.documents) {
      const doc = this.data.documents[key];
      const parts = doc.path.split("/").filter(Boolean);
      
      // Top-level companies check
      if (colPath === "companies") {
        if (parts.length === 2 && parts[0] === "companies" && parts[1] === "e5om9lzxh") {
          results.push(doc);
        }
        continue;
      }

      // General collection check
      if (doc.collection === colPath) {
        results.push(doc);
      } else if (doc.path.startsWith(colPath + "/")) {
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
