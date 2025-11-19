export type StoreDefinition = IDBObjectStoreParameters;

export type StoresDefinition = Record<string, StoreDefinition>;

export default class IndexedDBClient<Stores extends Record<string, any>> {
    private dbName: string;
    private version: number;
    private storesDefinition: StoresDefinition;
    private db: IDBDatabase | null = null;

    constructor(dbName: string, version: number, storesDefinition: StoresDefinition) {
        this.dbName = dbName;
        this.version = version;
        this.storesDefinition = storesDefinition;
    }

    /// ============= Public API ============= ///

    public async init(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        this.db = await this.#openDB();
        return this.db;
    }

    public async get<K extends keyof Stores>(store: K, key: IDBValidKey): Promise<Stores[K] | undefined> {
        const db = await this.init();
        return this.#promisifyRequest<Stores[K]>(
            db.transaction(store as string, "readonly").objectStore(store as string).get(key)
        );
    }

    public async set<K extends keyof Stores>(store: K, value: Stores[K], key?: IDBValidKey): Promise<IDBValidKey> {
        const db = await this.init();

        const storeObj = db.transaction(store as string, "readwrite").objectStore(store as string);

        const request = key ? storeObj.put(value, key) : storeObj.put(value);
        const resultKey = await this.#promisifyRequest(request);

        return resultKey;
    }

    public async delete<K extends keyof Stores>(store: K, key: IDBValidKey): Promise<void> {
        const db = await this.init();
        await this.#promisifyRequest(
            db.transaction(store as string, "readwrite").objectStore(store as string).delete(key)
        );
    }

    public async getAll<K extends keyof Stores>(store: K): Promise<Stores[K][]> {
        const db = await this.init();
        return this.#promisifyRequest<Stores[K][]>(
            db.transaction(store as string, "readonly").objectStore(store as string).getAll()
        );
    }

    public async clear<K extends keyof Stores>(store: K): Promise<void> {
        const db = await this.init();
        await this.#promisifyRequest(
            db.transaction(store as string, "readwrite").objectStore(store as string).clear()
        );
    }

    /// ============= Private Helpers ============= ///

    #openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = () => {
                const db = request.result;

                for (const storeName of Object.keys(this.storesDefinition)) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, this.storesDefinition[storeName]);
                    }
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    #promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
