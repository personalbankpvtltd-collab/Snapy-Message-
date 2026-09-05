import { UserProfile, FriendRequest, ChatSession, ChatMessage } from '../types';
import { firebaseService } from './firebaseService';
import { sheetsBackupService } from './sheetsBackup';

export const SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwFEeliH_wyW1AtHwgPAE4NRP95tr1sPbl0cp6NebcSwODI4MIH0UwtYfE-t1nOhbTG2w/exec';

console.log('Snapy Storage Architecture: 1st Primary (Firebase Firestore) | 2nd Secondary Backup (Google Sheets)');

// Helper to handle Apps Script's GET/POST structure for secondary backup and admin
export const request = async (action: string, data: any = {}, retries = 2) => {
  if (!SCRIPT_URL) {
    console.error('VITE_GOOGLE_APPS_SCRIPT_URL is not set');
    return null;
  }

  const payload = JSON.stringify({ action, ...data });

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isAbort = error.name === 'AbortError';
      const message = isAbort ? 'Request timed out (30s)' : error.message;

      console.warn(`Attempt ${i + 1} failed for ${action}: ${message}`);

      if (i === retries) {
        let detailedError = `Connection to Sheets backup failed: ${message}`;
        console.warn(detailedError);
        throw new Error(detailedError);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

export const apiService = {
  // --- AUTH & ACCOUNTS ---
  // 1st: Primary in Firebase. 2nd: Secondary backup in Sheets.
  signup: async (data: any) => {
    // 1st: Write to Firebase
    const fbRes = await firebaseService.signup(data);

    // 2nd: Secondary backup to Sheets in background
    sheetsBackupService.queueBackup('signup', {
      ...data,
      uid: fbRes.data.uid,
    });

    return fbRes;
  },

  login: async (credentials: { email: string; pass: string }) => {
    // 1st: Try Firebase login
    try {
      const fbUser = await firebaseService.login(credentials.email, credentials.pass);
      if (fbUser && fbUser.success) {
        // Backup status update to Sheets
        sheetsBackupService.queueBackup('updateStatus', {
          uid: fbUser.data.uid,
          status: 'online',
        });
        return fbUser;
      }
    } catch (fbErr: any) {
      // If it failed specifically on invalid password, rethrow
      if (fbErr.message === 'Invalid password') {
        throw fbErr;
      }
      console.warn('Firebase login attempt failed or not found, checking Sheets backup:', fbErr.message);
    }

    // Fallback: If not in Firebase yet, check Sheets backup and migrate to Firebase
    try {
      const sheetsRes = await request('login', credentials);
      if (sheetsRes && sheetsRes.success && sheetsRes.data) {
        // Migrate to Firebase as Primary
        await firebaseService.importUserFromSheets(sheetsRes.data);
        return sheetsRes;
      }
    } catch (sheetsErr: any) {
      console.warn('Sheets fallback login failed:', sheetsErr.message);
    }

    throw new Error('Invalid email or password');
  },

  // --- PROFILE ---
  getProfile: async (uid: string) => {
    // 1st: Primary from Firebase
    const profile = await firebaseService.getProfile(uid);
    if (profile) {
      return { success: true, data: profile };
    }

    // Fallback: check Sheets backup
    try {
      const sheetsRes = await request('getProfile', { uid });
      if (sheetsRes && sheetsRes.success && sheetsRes.data) {
        await firebaseService.importUserFromSheets(sheetsRes.data);
        return sheetsRes;
      }
    } catch (e) {
      console.warn('Profile not found in Sheets backup:', e);
    }

    return { success: false, message: 'Profile not found' };
  },

  updateProfile: async (uid: string, data: any) => {
    // 1st: Save to Firebase
    await firebaseService.updateProfile(uid, data);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('updateProfile', { uid, ...data });

    return { success: true };
  },

  updateStatus: async (uid: string, status: string) => {
    // 1st: Save to Firebase
    firebaseService.updateStatus(uid, status as 'online' | 'offline');

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('updateStatus', { uid, status });

    return { success: true };
  },

  changePassword: async (uid: string, oldPassword: string, newPassword: string) => {
    // 1st: Save to Firebase
    const res = await firebaseService.changePassword(uid, oldPassword, newPassword);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('changePassword', { uid, oldPassword, newPassword });

    return res;
  },

  changeUsername: async (uid: string, newUsername: string) => {
    // 1st: Save to Firebase
    const res = await firebaseService.changeUsername(uid, newUsername);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('changeUsername', { uid, newUsername });

    return res;
  },

  // --- SEARCH & FRIENDS ---
  searchUsers: async (query: string, currentUid?: string) => {
    const res = await firebaseService.searchUsers(query, currentUid);
    if (res && res.success && res.data.length > 0) {
      return res;
    }
    // Fallback: if Firebase is empty, query Sheets backup and cache
    try {
      const sheetsRes = await request('searchUsers', { query });
      if (sheetsRes && sheetsRes.success && Array.isArray(sheetsRes.data)) {
        sheetsRes.data.forEach((u: any) => firebaseService.importUserFromSheets(u));
        return sheetsRes;
      }
    } catch (e) {
      // Ignored
    }
    return res;
  },

  sendFriendRequest: async (fromUid: string, toUid: string) => {
    // 1st: Save to Firebase
    const res = await firebaseService.sendFriendRequest(fromUid, toUid);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('sendFriendRequest', { fromUid, toUid });

    return res;
  },

  getFriendRequests: async (uid: string) => {
    // 1st: Primary from Firebase
    const res = await firebaseService.getFriendRequests(uid);
    const fbReceived = res?.data?.received?.length || 0;
    const fbSent = res?.data?.sent?.length || 0;

    if (res && res.success && (fbReceived > 0 || fbSent > 0)) {
      return res;
    }

    // Check Sheets backup if nothing in Firebase yet
    try {
      const sheetsRes = await request('getFriendRequests', { uid });
      if (sheetsRes && sheetsRes.success && sheetsRes.data) {
        const received = sheetsRes.data.received || [];
        const sent = sheetsRes.data.sent || [];

        // Save Sheets requests to Firebase so Firestore has the documents
        received.forEach((r: any) => firebaseService.importFriendRequest(r));
        sent.forEach((r: any) => firebaseService.importFriendRequest(r));

        return {
          success: true,
          data: {
            received,
            sent,
          },
        };
      }
    } catch (e) {
      console.warn('Sheets fallback for getFriendRequests error:', e);
    }
    return res;
  },

  respondToFriendRequest: async (
    requestId: string,
    status: string,
    fromUid?: string,
    toUid?: string
  ) => {
    // 1st: Save to Firebase (safe setDoc merge)
    try {
      await firebaseService.respondToFriendRequest(requestId, status as any, { fromUid, toUid });
    } catch (fbErr: any) {
      console.warn('Firebase respondToFriendRequest warning:', fbErr.message);
    }

    // 2nd: Secondary backup to Sheets
    try {
      await request('respondToFriendRequest', { requestId, status });
    } catch (sheetsErr: any) {
      sheetsBackupService.queueBackup('respondToFriendRequest', { requestId, status });
    }

    return { success: true };
  },

  getFriends: async (uid: string) => {
    // 1st: Primary from Firebase
    const res = await firebaseService.getFriends(uid);
    if (res && res.success && res.data.length > 0) {
      return res;
    }
    // Fallback: check Sheets backup
    try {
      const sheetsRes = await request('getFriends', { uid });
      if (sheetsRes && sheetsRes.success && Array.isArray(sheetsRes.data)) {
        sheetsRes.data.forEach((f: any) => firebaseService.importUserFromSheets(f));
        return sheetsRes;
      }
    } catch (e) {}
    return res;
  },

  unfriend: async (uid: string, friendUid: string) => {
    // 1st: Save to Firebase
    const res = await firebaseService.unfriend(uid, friendUid);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('unfriend', { uid, friendUid });

    return res;
  },

  // --- CHATS & MESSAGES ---
  getChats: async (uid: string) => {
    // 1st: Primary from Firebase
    const res = await firebaseService.getChats(uid);
    if (res && res.success && res.data.length > 0) {
      return res;
    }
    // Fallback: check Sheets backup
    try {
      const sheetsRes = await request('getChats', { uid });
      if (sheetsRes && sheetsRes.success) return sheetsRes;
    } catch (e) {}
    return res;
  },

  getUnreadMessages: async (uid: string) => {
    // 1st: Primary from Firebase
    const res = await firebaseService.getUnreadMessages(uid);
    if (res && res.success && res.data.length > 0) {
      return res;
    }
    // Fallback: check Sheets backup
    try {
      const sheetsRes = await request('getUnreadMessages', { uid });
      if (sheetsRes && sheetsRes.success) return sheetsRes;
    } catch (e) {}
    return res;
  },

  getMessages: async (chatId: string, uid: string) => {
    // 1st: Primary from Firebase
    const res = await firebaseService.getMessages(chatId, uid);
    if (res && res.success && res.data.messages.length > 0) {
      return res;
    }
    // Fallback: check Sheets backup if Firebase has no messages yet
    try {
      const sheetsRes = await request('getMessages', { chatId, uid });
      if (sheetsRes && sheetsRes.success && sheetsRes.data?.messages?.length > 0) {
        // Sync sheets messages into Firebase
        sheetsRes.data.messages.forEach((m: any) => {
          firebaseService.sendMessage(chatId, m.senderUid, m.text, m.id).catch(() => {});
        });
        return sheetsRes;
      }
    } catch (e) {}
    return res;
  },

  sendMessage: async (chatId: string, senderUid: string, text: string) => {
    const messageId = Date.now().toString() + Math.random().toString(36).substring(7);

    // 1st: Primary in Firebase Firestore (instant delivery!)
    const fbRes = await firebaseService.sendMessage(chatId, senderUid, text, messageId);

    // 2nd: Secondary backup to Sheets in background
    sheetsBackupService.queueBackup('sendMessage', { chatId, senderUid, text, messageId });

    return fbRes;
  },

  markAsRead: async (chatId: string, messageId: string) => {
    // 1st: Firebase
    firebaseService.markAsRead(chatId, messageId);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('markAsRead', { chatId, messageId });

    return { success: true };
  },

  markAllAsRead: async (chatId: string, uid: string) => {
    // 1st: Firebase
    firebaseService.markAllAsRead(chatId, uid);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('markAllAsRead', { chatId, uid });

    return { success: true };
  },

  cleanChatHistory: async (chatId: string, uid: string) => {
    // 1st: Firebase
    const res = await firebaseService.cleanChatHistory(chatId, uid);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('cleanChatHistory', { chatId, uid });

    return res;
  },

  blockUser: async (uid: string, blockedUid: string) => {
    // 1st: Firebase
    const res = await firebaseService.blockUser(uid, blockedUid);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('blockUser', { uid, blockedUid });

    return res;
  },

  unblockUser: async (uid: string, blockedUid: string) => {
    // 1st: Firebase
    const res = await firebaseService.unblockUser(uid, blockedUid);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('unblockUser', { uid, blockedUid });

    return res;
  },

  reportUser: async (reporterUid: string, reportedUid: string, reason: string) => {
    // 1st: Firebase
    const res = await firebaseService.reportUser(reporterUid, reportedUid, reason);

    // 2nd: Secondary backup to Sheets
    sheetsBackupService.queueBackup('reportUser', { reporterUid, reportedUid, reason });

    return res;
  },

  getOnlineUserCount: async () => {
    // 1st: Primary from Firebase
    const fbRes = await firebaseService.getOnlineUserCount();
    return fbRes;
  },

  getAppStats: async () => {
    // 1st: Primary from Firebase
    const fbStats = await firebaseService.getAppStats();
    if (fbStats && fbStats.success && fbStats.data.usersCount > 0) {
      return fbStats;
    }
    // If Firebase has 0 users yet, fallback to Sheets stats
    try {
      const sheetsStats = await request('getAppStats');
      if (sheetsStats && sheetsStats.success) {
        return sheetsStats;
      }
    } catch (e) {}
    return fbStats;
  },

  // Real-time subscriptions
  subscribeMessages: (chatId: string, callback: (msgs: ChatMessage[]) => void) => {
    return firebaseService.subscribeMessages(chatId, callback);
  },

  subscribeChats: (uid: string, callback: (chats: any[]) => void) => {
    return firebaseService.subscribeChats(uid, callback);
  },

  // --- ADMIN ACTIONS (Firebase Primary + Sheets Secondary) ---
  adminLogin: async (data: any) => {
    // 1st: Check Firebase staff / root superadmin
    try {
      const fbStaff = await firebaseService.adminLoginStaff(data);
      if (fbStaff && fbStaff.success) {
        return fbStaff;
      }
    } catch (e: any) {
      if (e.message === 'Invalid staff password') {
        throw e;
      }
    }

    // Default root superadmin credentials check or Sheets check
    if (data.email === 'admin@snapy.com' && data.password === 'admin123') {
      return {
        success: true,
        data: { uid: 'admin_root', email: 'admin@snapy.com', name: 'Chief Administrator', role: 'super' as const },
      };
    }
    return request('adminLogin', data);
  },

  adminGetAnalytics: async () => {
    return firebaseService.getAdminAnalytics();
  },

  adminGetUsers: async () => {
    const fbRes = await firebaseService.adminGetUsers();
    if (fbRes.success && fbRes.data.length > 0) {
      return fbRes;
    }
    // Fallback to sheets
    try {
      const sheetsRes = await request('adminGetUsers');
      if (sheetsRes && sheetsRes.success && Array.isArray(sheetsRes.data)) {
        sheetsRes.data.forEach((u: any) => firebaseService.importUserFromSheets(u));
        return sheetsRes;
      }
    } catch (e) {}
    return fbRes;
  },

  adminGetReports: async () => {
    const fbRes = await firebaseService.adminGetReports();
    if (fbRes.success && fbRes.data.length > 0) {
      return fbRes;
    }
    try {
      const sheetsRes = await request('adminGetReports');
      if (sheetsRes && sheetsRes.success) return sheetsRes;
    } catch (e) {}
    return fbRes;
  },

  adminDeleteReport: async (reportId: string) => {
    await firebaseService.adminDeleteReport(reportId).catch(() => {});
    sheetsBackupService.queueBackup('adminDeleteReport', { reportId });
    return { success: true };
  },

  adminBanUser: async (uid: string, days: number) => {
    const res = await firebaseService.adminBanUser(uid, days);
    sheetsBackupService.queueBackup('adminBanUser', { uid, days });
    return res;
  },

  adminUnbanUser: async (uid: string) => {
    const res = await firebaseService.adminUnbanUser(uid);
    sheetsBackupService.queueBackup('adminUnbanUser', { uid });
    return res;
  },

  // Staff & Admin Management
  adminGetStaff: async () => {
    const fbRes = await firebaseService.adminGetStaff();
    if (fbRes.success && fbRes.data.length > 0) {
      return fbRes;
    }
    try {
      const sheetsRes = await request('adminGetAdmins');
      if (sheetsRes && sheetsRes.success && Array.isArray(sheetsRes.data)) {
        return { success: true, data: sheetsRes.data };
      }
    } catch (e) {}
    return fbRes;
  },

  adminAddStaff: async (staffData: {
    email: string;
    password: string;
    name?: string;
    role: 'super' | 'admin' | 'staff' | 'moderator';
    title?: string;
  }) => {
    const res = await firebaseService.adminAddStaff(staffData);
    sheetsBackupService.queueBackup('adminAddAdmin', staffData);
    return res;
  },

  adminDeleteStaff: async (uid: string) => {
    return firebaseService.adminDeleteStaff(uid);
  },

  adminUpdateStaff: async (uid: string, updates: any) => {
    return firebaseService.adminUpdateStaff(uid, updates);
  },

  adminAddAdmin: (data: any) => request('adminAddAdmin', data),
  adminGetAdmins: () => request('adminGetAdmins'),

  adminSendWarning: async (uid: string, message: string) => {
    const res = await firebaseService.adminSendWarning(uid, message);
    sheetsBackupService.queueBackup('adminSendWarning', { uid, message });
    return res;
  },

  // Support Chat Methods
  getOrCreateAdminSupportChat: async (userUid: string) => {
    return firebaseService.getOrCreateAdminSupportChat(userUid);
  },

  adminGetSupportChats: async () => {
    return firebaseService.adminGetSupportChats();
  },

  subscribeAdminSupportChats: (callback: (chats: any[]) => void) => {
    return firebaseService.subscribeAdminSupportChats(callback);
  },

  adminSendUserMessage: async (chatId: string, text: string, staffMember?: any) => {
    const res = await firebaseService.adminSendUserMessage(chatId, text, staffMember);
    sheetsBackupService.queueBackup('sendMessage', {
      chatId,
      senderUid: 'admin_support',
      text,
      messageId: res.data.id,
    });
    return res;
  },

  adminInitiateChatWithUser: async (userUid: string, initialMessage?: string, staffMember?: any) => {
    return firebaseService.adminInitiateChatWithUser(userUid, initialMessage, staffMember);
  },

  getSystemAnnouncements: () => firebaseService.getSystemAnnouncements(),
  saveSystemAnnouncement: (announcement: any) => firebaseService.saveSystemAnnouncement(announcement),
  deleteSystemAnnouncement: (id: string) => firebaseService.deleteSystemAnnouncement(id),

  deleteAccount: (uid: string, pass: string) => request('deleteAccount', { uid, pass }),

  testConnection: async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=test`, {
        method: 'GET',
        mode: 'cors',
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (e: any) {
      console.warn('GET test failed, trying POST...', e.message);
    }
    return request('test');
  },
};
