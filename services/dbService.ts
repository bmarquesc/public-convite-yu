
import { hashPassword } from '../utils/cryptoUtils';

const DB_NAME = "InvitationEditorDB";
const DB_VERSION = 1;
const STORE_USERS = "users";
const ADMIN_EMAIL = "admin@example.com";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(new Error("Erro ao abrir o IndexedDB."));
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_USERS)) {
                    db.createObjectStore(STORE_USERS, { keyPath: "email" });
                }
            };
        });
    }
    return dbPromise;
}

async function dbRequest<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
    });
}

export const db = {
    getUser: (email: string) => dbRequest<any>(STORE_USERS, "readonly", store => store.get(email)),
    getAllUsers: () => dbRequest<any[]>(STORE_USERS, "readonly", store => store.getAll()),
    addUser: (user: any) => dbRequest(STORE_USERS, "readwrite", store => store.add(user)),
    updateUser: (user: any) => dbRequest(STORE_USERS, "readwrite", store => store.put(user)),
    deleteUser: (email: string) => dbRequest(STORE_USERS, "readwrite", store => store.delete(email)),
    initAdmin: async () => {
        const admin = await db.getUser(ADMIN_EMAIL);
        if (!admin) {
            console.log("Nenhum administrador encontrado, criando um padrão.");
            const passwordHash = await hashPassword('admin123');
            await db.addUser({
                email: ADMIN_EMAIL,
                passwordHash,
                role: 'admin',
                status: 'APPROVED'
            });
            console.log(`Administrador criado com e-mail ${ADMIN_EMAIL} e senha 'admin123'. Por favor, altere a senha.`);
        }
    }
};