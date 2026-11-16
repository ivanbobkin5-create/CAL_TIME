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

export interface SyncOutboxEvent {
  eventId: string;
  type:
    | "doc_upsert"
    | "doc_delete"
    | "order_scan"
    | "order_stage"
    | "active_shift"
    | "end_shift";
  companyId: string;
  docPath: string;
  collection?: string;
  docId?: string;
  payload: any;
  timestamp: string;
  synced: boolean;
}

export interface EdgeSyncConfig {
  cloudUrl: string;
  companyId: string;
  companyName?: string;
  autoSyncIntervalSec: number;
  lastSyncAt?: string;
  lastPullAt?: string;
  lastError?: string | null;
  lastSyncStatus?: "idle" | "syncing" | "ok" | "error";
  syncedEventsTotal?: number;
}

export interface SyncPackagePayload {
  format: "erp-sync-v1";
  direction: "cloud_to_edge" | "edge_to_cloud";
  companyId: string;
  exportedAt: string;
  documents: LocalDoc[];
  authUsers?: LocalUser[];
  outboxEvents?: SyncOutboxEvent[];
}

interface LocalStoreData {
  documents: Record<string, LocalDoc>;
  users: Record<string, LocalUser>;
  tokens: Record<string, any>;
  outbox: SyncOutboxEvent[];
  processedEventIds: string[];
  edgeConfig: EdgeSyncConfig;
}

const DATA_DIR = process.env.ERP_DATA_DIR
  ? path.resolve(process.env.ERP_DATA_DIR)
  : path.resolve(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "db_fallback.json");
const BACKUP_FILE = path.join(DATA_DIR, "db_fallback.bak.json");

function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
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
      // Do not overwrite valid existing data with empty string or empty array from unhydrated client state
      if (
        typeof srcVal === "string" &&
        srcVal.trim().length === 0 &&
        typeof tgtVal === "string" &&
        tgtVal.trim().length > 0
      ) {
        output[key] = tgtVal;
      } else if (
        Array.isArray(srcVal) &&
        srcVal.length === 0 &&
        Array.isArray(tgtVal) &&
        tgtVal.length > 0
      ) {
        output[key] = tgtVal;
      } else {
        output[key] = srcVal;
      }
    }
  }
  return output;
}

export function mergeStageScanningProgress(existingProg: any, incomingProg: any): any {
  const merged = { ...(existingProg || {}) };
  if (!incomingProg || typeof incomingProg !== "object") return merged;

  for (const stageKey of Object.keys(incomingProg)) {
    if (!merged[stageKey]) merged[stageKey] = {};
    else merged[stageKey] = { ...merged[stageKey] };

    const stageMats = incomingProg[stageKey] || {};
    for (const matKey of Object.keys(stageMats)) {
      const prevMat = merged[stageKey][matKey] || {};
      const nextMat = stageMats[matKey] || {};
      const prevIds = Array.isArray(prevMat.scannedPartIds) ? prevMat.scannedPartIds : [];
      const nextIds = Array.isArray(nextMat.scannedPartIds) ? nextMat.scannedPartIds : [];
      const union = Array.from(new Set([...prevIds, ...nextIds]));
      merged[stageKey][matKey] = {
        scannedPartIds: union,
        isCompleted: Boolean(prevMat.isCompleted || nextMat.isCompleted),
      };
    }
  }
  return merged;
}

class LocalStore {
  private data: LocalStoreData = {
    documents: {},
    users: {},
    tokens: {},
    outbox: [],
    processedEventIds: [],
    edgeConfig: {
      cloudUrl: process.env.ERP_CLOUD_URL || "",
      companyId: process.env.ERP_COMPANY_ID || "",
      autoSyncIntervalSec: 30,
      lastError: null,
      lastSyncStatus: "idle",
      syncedEventsTotal: 0,
    },
  };
  private isLoaded = false;
  private saveTimeout: NodeJS.Timeout | null = null;
  private lastBackupAt = 0;

  constructor() {
    this.init();
  }

  public getDataDir(): string {
    return DATA_DIR;
  }

  private init() {
    const candidateSeeds = [
      path.resolve(process.cwd(), "src/services/permanentSeed.json"),
      process.env.ERP_RESOURCES_DIR
        ? path.resolve(process.env.ERP_RESOURCES_DIR, "permanentSeed.json")
        : "",
    ].filter(Boolean);
    const seedFile = candidateSeeds.find((p) => fs.existsSync(p)) || candidateSeeds[0];
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        try {
          const raw = fs.readFileSync(STORE_FILE, "utf-8");
          this.data = JSON.parse(raw);
        } catch (parseErr) {
          console.warn("[LocalStore] Primary store corrupted, trying backup:", parseErr);
          if (fs.existsSync(BACKUP_FILE)) {
            const bakRaw = fs.readFileSync(BACKUP_FILE, "utf-8");
            this.data = JSON.parse(bakRaw);
          }
        }
      } else if (fs.existsSync(BACKUP_FILE)) {
        const bakRaw = fs.readFileSync(BACKUP_FILE, "utf-8");
        this.data = JSON.parse(bakRaw);
      }
    } catch (e) {
      console.warn("[LocalStore] Warning loading store from disk:", e);
    }

    if (!this.data.documents) this.data.documents = {};
    if (!this.data.users) this.data.users = {};
    if (!this.data.tokens) this.data.tokens = {};
    if (!Array.isArray(this.data.outbox)) this.data.outbox = [];
    if (!Array.isArray(this.data.processedEventIds)) this.data.processedEventIds = [];
    if (!this.data.edgeConfig) {
      this.data.edgeConfig = {
        cloudUrl: process.env.ERP_CLOUD_URL || "",
        companyId: process.env.ERP_COMPANY_ID || "",
        autoSyncIntervalSec: 30,
        lastError: null,
        lastSyncStatus: "idle",
        syncedEventsTotal: 0,
      };
    }

    const loadedDocCount = Object.keys(this.data.documents).length;
    if (loadedDocCount < 50) {
      try {
        if (fs.existsSync(seedFile)) {
          const seedRaw = fs.readFileSync(seedFile, "utf-8");
          const seedData = JSON.parse(seedRaw);
          if (seedData.users) {
            for (const [uid, u] of Object.entries(seedData.users)) {
              if (!this.data.users[uid]) {
                this.data.users[uid] = u as LocalUser;
              }
            }
          }
          if (seedData.documents) {
            for (const [docPath, seedDoc] of Object.entries(seedData.documents)) {
              const existing = this.data.documents[docPath];
              if (!existing) {
                this.data.documents[docPath] = seedDoc as LocalDoc;
              } else if (docPath === "companies/e5om9lzxh" || docPath.includes("/settings/")) {
                try {
                  const seedObj =
                    typeof (seedDoc as any).data === "string"
                      ? JSON.parse((seedDoc as any).data)
                      : (seedDoc as any).data;
                  const exObj =
                    typeof existing.data === "string"
                      ? JSON.parse(existing.data)
                      : existing.data;
                  const merged = safeDeepMerge(seedObj, exObj);
                  existing.data = JSON.stringify(merged);
                } catch (_) {}
              }
            }
          }
        }
      } catch (e) {
        console.warn("[LocalStore] Warning merging permanentSeed.json:", e);
      }
    }

    this.isLoaded = true;
  }

  private isWriting = false;

  public flushNow() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.writeAtomicAsync().catch(() => {});
  }

  private async writeAtomicAsync() {
    if (this.isWriting) return;
    this.isWriting = true;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(this.data);
      const tmpFile = `${STORE_FILE}.tmp.${process.pid}`;
      await fs.promises.writeFile(tmpFile, serialized, "utf-8");
      await fs.promises.rename(tmpFile, STORE_FILE);

      const now = Date.now();
      if (now - this.lastBackupAt > 600000) {
        this.lastBackupAt = now;
        try {
          await fs.promises.writeFile(BACKUP_FILE, serialized, "utf-8");
        } catch (_) {}
      }
    } catch (e) {
      console.warn("[LocalStore] Warning saving store atomically to disk:", e);
    } finally {
      this.isWriting = false;
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.writeAtomicAsync().catch(() => {});
    }, 15000);
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
        const prevObj =
          typeof existing.data === "string" ? JSON.parse(existing.data) : existing.data;
        const newObj = typeof data === "string" ? JSON.parse(data) : data;
        const mergedObj = safeDeepMerge(prevObj, newObj);
        dataStr = JSON.stringify(mergedObj);
      } catch {
        // fallback to dataStr
      }
    }

    if (existing && existing.data === dataStr) {
      return existing;
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
    if (needsSync) {
      this.scheduleSave();
    }
    return doc;
  }

  public getAllDocsMap(): Record<string, LocalDoc> {
    return this.data.documents || {};
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
    for (const key in this.data.documents) {
      const doc = this.data.documents[key];
      const parts = doc.path.split("/").filter(Boolean);

      // Top-level companies check
      if (colPath === "companies") {
        if (parts.length === 2 && parts[0] === "companies" && !parts[1].includes("/")) {
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

  public getAllUsers(): LocalUser[] {
    return Object.values(this.data.users || {});
  }

  public upsertUser(
    email: string,
    passwordHash: string,
    verified: boolean = true,
    uid?: string,
    companyId?: string
  ): LocalUser {
    const lower = email.toLowerCase().trim();
    const existing = this.getUser(lower);
    const userId = uid || existing?.uid || `user_${Date.now()}`;
    const user: LocalUser = {
      uid: userId,
      email: lower,
      password: passwordHash,
      companyId: companyId || existing?.companyId,
      verified,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    this.data.users[userId] = user;
    this.scheduleSave();
    return user;
  }

  public importAuthUserRaw(user: LocalUser) {
    if (!user || !user.uid || !user.email) return;
    this.data.users[user.uid] = {
      ...this.data.users[user.uid],
      ...user,
      email: user.email.toLowerCase().trim(),
    };
    this.scheduleSave();
  }

  public updateUserPassword(email: string, passwordHash: string): boolean {
    const lower = email.toLowerCase().trim();
    const existing = this.getUser(lower);
    if (existing) {
      existing.password = passwordHash;
      existing.verified = true;
      this.data.users[existing.uid] = existing;
      this.scheduleSave();
      return true;
    }
    this.upsertUser(lower, passwordHash, true);
    return true;
  }

  public verifyUser(email: string): boolean {
    const lower = email.toLowerCase().trim();
    const existing = this.getUser(lower);
    if (existing) {
      existing.verified = true;
      this.data.users[existing.uid] = existing;
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public saveToken(
    token: string,
    type: string,
    email: string,
    ttlMs: number = 3600000
  ) {
    if (!this.data.tokens) this.data.tokens = {};
    this.data.tokens[token] = {
      token,
      type,
      email: email.toLowerCase().trim(),
      expiresAt: Date.now() + ttlMs,
      createdAt: new Date().toISOString(),
    };
    this.scheduleSave();
  }

  public getToken(
    token: string,
    type: string
  ): { token: string; type: string; email: string; expiresAt: number } | null {
    if (!this.data.tokens) return null;
    const clean = token.trim();
    const entry = this.data.tokens[clean];
    if (!entry) return null;
    if (entry.type !== type) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete this.data.tokens[clean];
      this.scheduleSave();
      return null;
    }
    return entry;
  }

  public deleteToken(token: string) {
    if (this.data.tokens && this.data.tokens[token]) {
      delete this.data.tokens[token];
      this.scheduleSave();
    }
  }

  public deleteTokensForEmail(email: string, type?: string) {
    if (!this.data.tokens) return;
    const lower = email.toLowerCase().trim();
    let changed = false;
    for (const k of Object.keys(this.data.tokens)) {
      const t = this.data.tokens[k];
      if (t.email === lower && (!type || t.type === type)) {
        delete this.data.tokens[k];
        changed = true;
      }
    }
    if (changed) this.scheduleSave();
  }

  public entries(): [string, LocalDoc][] {
    return Object.entries(this.data.documents || {});
  }

  public keys(): string[] {
    return Object.keys(this.data.documents || {});
  }

  public values(): LocalDoc[] {
    return Object.values(this.data.documents || {});
  }

  public queryDocs(colPath: string): LocalDoc[] {
    return this.getCollection(colPath);
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

  // --- Edge / Offline Outbox & Sync Management ---

  public enqueueOutboxEvent(
    ev: Omit<SyncOutboxEvent, "eventId" | "timestamp" | "synced"> & {
      eventId?: string;
      timestamp?: string;
    }
  ): SyncOutboxEvent {
    const event: SyncOutboxEvent = {
      eventId:
        ev.eventId ||
        `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: ev.timestamp || new Date().toISOString(),
      synced: false,
      type: ev.type,
      companyId: ev.companyId,
      docPath: ev.docPath,
      collection: ev.collection,
      docId: ev.docId,
      payload: ev.payload,
    };
    if (!Array.isArray(this.data.outbox)) this.data.outbox = [];
    this.data.outbox.push(event);
    this.scheduleSave();
    return event;
  }

  public getPendingOutboxEvents(companyId?: string): SyncOutboxEvent[] {
    const list = Array.isArray(this.data.outbox) ? this.data.outbox : [];
    return list.filter(
      (e) => !e.synced && (!companyId || e.companyId === companyId)
    );
  }

  public markOutboxEventsSynced(eventIds: string[]) {
    if (!eventIds || eventIds.length === 0) return;
    const idSet = new Set(eventIds);
    let count = 0;
    for (const ev of this.data.outbox) {
      if (idSet.has(ev.eventId) && !ev.synced) {
        ev.synced = true;
        count++;
      }
    }
    if (count > 0) {
      this.data.edgeConfig.syncedEventsTotal =
        (this.data.edgeConfig.syncedEventsTotal || 0) + count;
    }
    // Trim old synced events keeping max 300 synced history items
    const pending = this.data.outbox.filter((e) => !e.synced);
    const synced = this.data.outbox.filter((e) => e.synced).slice(-300);
    this.data.outbox = [...synced, ...pending];
    this.scheduleSave();
  }

  public hasProcessedEvent(eventId: string): boolean {
    return (this.data.processedEventIds || []).includes(eventId);
  }

  public recordProcessedEvent(eventId: string) {
    if (!Array.isArray(this.data.processedEventIds)) {
      this.data.processedEventIds = [];
    }
    if (!this.data.processedEventIds.includes(eventId)) {
      this.data.processedEventIds.push(eventId);
      if (this.data.processedEventIds.length > 5000) {
        this.data.processedEventIds = this.data.processedEventIds.slice(-4000);
      }
      this.scheduleSave();
    }
  }

  public getEdgeConfig(): EdgeSyncConfig {
    return { ...this.data.edgeConfig };
  }

  public updateEdgeConfig(patch: Partial<EdgeSyncConfig>): EdgeSyncConfig {
    this.data.edgeConfig = {
      ...this.data.edgeConfig,
      ...patch,
    };
    this.scheduleSave();
    return this.getEdgeConfig();
  }

  public getCompanyErpDocs(companyId: string): LocalDoc[] {
    const prefix = `companies/${companyId}/`;
    const compPath = `companies/${companyId}`;
    const erpPrefixes = [
      `${prefix}erp_orders/`,
      `${prefix}erp_settings/`,
      `${prefix}erp_employees/`,
      `${prefix}erp_residuals/`,
      `${prefix}erp_schedule/`,
      `${prefix}active_shifts/`,
      `${prefix}shift_logs/`,
      `${prefix}erp_salary_adjustments/`,
      `${prefix}erp_installation_tasks/`,
      `${prefix}employees/`,
      `${prefix}users/`,
      `${prefix}projects/`,
    ];

    const docs: LocalDoc[] = [];
    for (const [docPath, doc] of Object.entries(this.data.documents || {})) {
      if (docPath === compPath || erpPrefixes.some((p) => docPath.startsWith(p))) {
        docs.push(doc);
        continue;
      }
      if (docPath.startsWith("users/")) {
        try {
          const parsed =
            typeof doc.data === "string" ? JSON.parse(doc.data) : doc.data;
          if (
            parsed?.companyId === companyId ||
            parsed?.companySlug === companyId ||
            parsed?.companyAlias === companyId ||
            (companyId === "e5om9lzxh" && parsed?.email?.includes("ivanbobkin"))
          ) {
            docs.push(doc);
          }
        } catch (_) {}
      }
    }
    return docs;
  }

  public exportSyncPackage(
    companyId: string,
    direction: "cloud_to_edge" | "edge_to_cloud"
  ): SyncPackagePayload {
    const docs = this.getCompanyErpDocs(companyId);
    const pendingEvents =
      direction === "edge_to_cloud"
        ? this.getPendingOutboxEvents(companyId)
        : [];
    const authUsers =
      direction === "cloud_to_edge"
        ? this.getAllUsers().filter((u) => {
            if (!u.companyId) return true;
            return u.companyId === companyId;
          })
        : [];

    return {
      format: "erp-sync-v1",
      direction,
      companyId,
      exportedAt: new Date().toISOString(),
      documents: docs,
      authUsers,
      outboxEvents: pendingEvents,
    };
  }
}

export const localStore = new LocalStore();
