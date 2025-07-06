// IndexedDB 래퍼 클래스
export interface User {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  created_at: Date;
}

export interface PatientRecord {
  id: string;
  user_id: string;
  patient_name: string;
  patient_age: string;
  conversation: ConversationMessage[];
  diagnoses?: Diagnosis[];
  created_at: Date;
  updated_at: Date;
}

export interface Diagnosis {
  disease: string;
  probability: number;
  symptoms: string[];
  recommendation: string;
  analyzed_at: Date;
}

export interface ConversationMessage {
  id: string;
  content: string;
  timestamp: Date;
}

export interface Settings {
  id: string;
  user_id: string;
  openai_api_key?: string;
  elevenlabs_api_key?: string;
  theme: 'light' | 'dark';
  created_at: Date;
  updated_at: Date;
}

class IndexedDBManager {
  private dbName = 'MedinaLabProDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Users 테이블
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // Patient Records 테이블
        if (!db.objectStoreNames.contains('patient_records')) {
          const recordStore = db.createObjectStore('patient_records', { keyPath: 'id' });
          recordStore.createIndex('user_id', 'user_id');
          recordStore.createIndex('created_at', 'created_at');
        }

        // Settings 테이블
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
          settingsStore.createIndex('user_id', 'user_id', { unique: true });
        }

        // Sessions 테이블 (로그인 상태 관리)
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('user_id', 'user_id');
        }
      };
    });
  }

  async createUser(email: string, password: string, fullName: string): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const id = crypto.randomUUID();
    const passwordHash = await this.hashPassword(password);
    
    const user: User = {
      id,
      email,
      full_name: fullName,
      password_hash: passwordHash,
      created_at: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.add(user);

      request.onsuccess = () => resolve(user);
      request.onerror = () => reject(request.error);
    });
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('email');
      const request = index.get(email);

      request.onsuccess = async () => {
        const user = request.result as User;
        if (user && await this.verifyPassword(password, user.password_hash)) {
          resolve(user);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createPatientRecord(userId: string, patientName: string, patientAge: string, conversation: ConversationMessage[]): Promise<PatientRecord> {
    if (!this.db) throw new Error('Database not initialized');

    const id = crypto.randomUUID();
    const record: PatientRecord = {
      id,
      user_id: userId,
      patient_name: patientName,
      patient_age: patientAge,
      conversation,
      created_at: new Date(),
      updated_at: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['patient_records'], 'readwrite');
      const store = transaction.objectStore('patient_records');
      const request = store.add(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  async getPatientRecords(userId: string): Promise<PatientRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['patient_records'], 'readonly');
      const store = transaction.objectStore('patient_records');
      const index = store.index('user_id');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const records = request.result as PatientRecord[];
        records.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(userId: string, settings: Partial<Settings>): Promise<Settings> {
    if (!this.db) throw new Error('Database not initialized');

    const id = crypto.randomUUID();
    const settingsRecord: Settings = {
      id,
      user_id: userId,
      theme: 'light',
      created_at: new Date(),
      updated_at: new Date(),
      ...settings
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put(settingsRecord);

      request.onsuccess = () => resolve(settingsRecord);
      request.onerror = () => reject(request.error);
    });
  }

  async getSettings(userId: string): Promise<Settings | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const index = store.index('user_id');
      const request = index.get(userId);

      request.onsuccess = () => resolve(request.result as Settings || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePatientRecordWithDiagnoses(recordId: string, diagnoses: Diagnosis[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['patient_records'], 'readwrite');
      const store = transaction.objectStore('patient_records');
      const request = store.get(recordId);

      request.onsuccess = () => {
        const record = request.result as PatientRecord;
        if (record) {
          record.diagnoses = diagnoses.map(d => ({
            ...d,
            analyzed_at: new Date()
          }));
          record.updated_at = new Date();
          
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Record not found'));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPatientRecord(recordId: string): Promise<PatientRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['patient_records'], 'readonly');
      const store = transaction.objectStore('patient_records');
      const request = store.get(recordId);

      request.onsuccess = () => resolve(request.result as PatientRecord || null);
      request.onerror = () => reject(request.error);
    });
  }

  async exportData(userId: string): Promise<string> {
    const records = await this.getPatientRecords(userId);
    const settings = await this.getSettings(userId);
    
    const exportData = {
      version: 1,
      exported_at: new Date().toISOString(),
      patient_records: records,
      settings
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importData(userId: string, jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    
    if (data.patient_records) {
      for (const record of data.patient_records) {
        record.user_id = userId; // 현재 사용자로 변경
        record.id = crypto.randomUUID(); // 새 ID 생성
        await this.createPatientRecord(userId, record.patient_name, record.patient_age, record.conversation);
      }
    }

    if (data.settings) {
      await this.saveSettings(userId, data.settings);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const newHash = await this.hashPassword(password);
    return newHash === hash;
  }
}

export const db = new IndexedDBManager();