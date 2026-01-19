/**
 * ConversationHistoryService - IndexedDB를 사용한 대화 기록 저장
 */

// 대화 메시지 타입
export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioData?: string; // Base64 encoded (선택적)
}

// 대화 세션 타입
export interface ConversationSession {
  id: string;
  startTime: number;
  endTime?: number;
  messageCount: number;
  summary?: string;
}

const DB_NAME = 'AntiGravityDB';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';
const SESSIONS_STORE = 'sessions';

export class ConversationHistoryService {
  private db: IDBDatabase | null = null;
  private currentSessionId: string | null = null;

  /**
   * IndexedDB 초기화
   */
  async initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('⚠️ IndexedDB를 지원하지 않는 브라우저입니다');
        resolve(false);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ IndexedDB 열기 실패:', request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB 초기화 완료');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 메시지 저장소
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          messagesStore.createIndex('sessionId', 'sessionId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 세션 저장소
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
          sessionsStore.createIndex('startTime', 'startTime', { unique: false });
        }
      };
    });
  }

  /**
   * 새 세션 시작
   */
  async startSession(): Promise<string> {
    const sessionId = this.generateId();
    this.currentSessionId = sessionId;

    const session: ConversationSession = {
      id: sessionId,
      startTime: Date.now(),
      messageCount: 0,
    };

    await this.saveSession(session);
    console.log('📝 새 대화 세션 시작:', sessionId);

    return sessionId;
  }

  /**
   * 세션 종료
   */
  async endSession(): Promise<void> {
    if (!this.currentSessionId) return;

    const session = await this.getSession(this.currentSessionId);
    if (session) {
      session.endTime = Date.now();
      await this.saveSession(session);
    }

    console.log('📝 대화 세션 종료:', this.currentSessionId);
    this.currentSessionId = null;
  }

  /**
   * 메시지 저장
   */
  async saveMessage(
    role: 'user' | 'assistant',
    content: string,
    audioData?: ArrayBuffer
  ): Promise<string | null> {
    if (!this.db || !this.currentSessionId) {
      // DB가 없으면 세션 시작 시도
      if (!this.currentSessionId) {
        await this.initialize();
        await this.startSession();
      }
      if (!this.db) return null;
    }

    const message: ConversationMessage = {
      id: this.generateId(),
      sessionId: this.currentSessionId!,
      role,
      content,
      timestamp: Date.now(),
      audioData: audioData ? this.arrayBufferToBase64(audioData) : undefined,
    };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([MESSAGES_STORE, SESSIONS_STORE], 'readwrite');
      const messagesStore = transaction.objectStore(MESSAGES_STORE);
      const sessionsStore = transaction.objectStore(SESSIONS_STORE);

      // 메시지 저장
      messagesStore.add(message);

      // 세션 메시지 카운트 업데이트
      const sessionRequest = sessionsStore.get(this.currentSessionId!);
      sessionRequest.onsuccess = () => {
        const session = sessionRequest.result as ConversationSession;
        if (session) {
          session.messageCount++;
          sessionsStore.put(session);
        }
      };

      transaction.oncomplete = () => {
        resolve(message.id);
      };

      transaction.onerror = () => {
        console.error('❌ 메시지 저장 실패:', transaction.error);
        resolve(null);
      };
    });
  }

  /**
   * 세션의 모든 메시지 조회
   */
  async getSessionMessages(sessionId: string): Promise<ConversationMessage[]> {
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MESSAGES_STORE, 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        const messages = (request.result as ConversationMessage[])
          .sort((a, b) => a.timestamp - b.timestamp);
        resolve(messages);
      };

      request.onerror = () => {
        console.error('❌ 메시지 조회 실패:', request.error);
        resolve([]);
      };
    });
  }

  /**
   * 모든 세션 조회
   */
  async getAllSessions(): Promise<ConversationSession[]> {
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(SESSIONS_STORE, 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const sessions = (request.result as ConversationSession[])
          .sort((a, b) => b.startTime - a.startTime);
        resolve(sessions);
      };

      request.onerror = () => {
        console.error('❌ 세션 조회 실패:', request.error);
        resolve([]);
      };
    });
  }

  /**
   * 최근 N개 메시지 조회
   */
  async getRecentMessages(limit: number = 50): Promise<ConversationMessage[]> {
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(MESSAGES_STORE, 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('timestamp');
      const messages: ConversationMessage[] = [];

      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && messages.length < limit) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          resolve(messages.reverse());
        }
      };

      request.onerror = () => {
        console.error('❌ 메시지 조회 실패:', request.error);
        resolve([]);
      };
    });
  }

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([MESSAGES_STORE, SESSIONS_STORE], 'readwrite');
      const messagesStore = transaction.objectStore(MESSAGES_STORE);
      const sessionsStore = transaction.objectStore(SESSIONS_STORE);

      // 세션의 모든 메시지 삭제
      const index = messagesStore.index('sessionId');
      const request = index.openCursor(sessionId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // 세션 삭제
      sessionsStore.delete(sessionId);

      transaction.oncomplete = () => {
        console.log('🗑️ 세션 삭제 완료:', sessionId);
        resolve(true);
      };

      transaction.onerror = () => {
        console.error('❌ 세션 삭제 실패:', transaction.error);
        resolve(false);
      };
    });
  }

  /**
   * 모든 데이터 삭제
   */
  async clearAll(): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([MESSAGES_STORE, SESSIONS_STORE], 'readwrite');

      transaction.objectStore(MESSAGES_STORE).clear();
      transaction.objectStore(SESSIONS_STORE).clear();

      transaction.oncomplete = () => {
        console.log('🗑️ 모든 대화 기록 삭제 완료');
        resolve(true);
      };

      transaction.onerror = () => {
        console.error('❌ 데이터 삭제 실패:', transaction.error);
        resolve(false);
      };
    });
  }

  /**
   * 저장 용량 확인 (대략적)
   */
  async getStorageUsage(): Promise<{ used: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return null;
  }

  /**
   * 현재 세션 ID 반환
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // === Private Helpers ===

  private async saveSession(session: ConversationSession): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(SESSIONS_STORE, 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      store.put(session);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error('❌ 세션 저장 실패:', transaction.error);
        resolve();
      };
    });
  }

  private async getSession(sessionId: string): Promise<ConversationSession | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(SESSIONS_STORE, 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.get(sessionId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// 싱글톤 인스턴스
export const conversationHistoryService = new ConversationHistoryService();
