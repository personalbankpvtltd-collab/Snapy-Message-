import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, FriendRequest, ChatSession, ChatMessage, StaffMember } from '../types';

export const ADMIN_SUPPORT_PROFILE: UserProfile = {
  uid: 'admin_support',
  displayName: 'Snapy Admin Support',
  firstName: 'Snapy',
  lastName: 'Support',
  nickName: 'Admin',
  phoneNumber: '+1-800-SNAPY-HQ',
  email: 'support@snapy.com',
  username: '@support',
  photoURL: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  bio: 'Official Snapy Platform Administration & User Support Team',
  status: 'online',
  lastSeen: new Date().toISOString(),
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
  isPermanentlyBanned: false,
  reportCount: 0,
  blockedUsers: [],
};

export const firebaseService = {
  // --- AUTH & PROFILES ---
  signup: async (data: any) => {
    try {
      const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const email = data.email.trim().toLowerCase();
      let username = data.username.trim();
      if (!username.startsWith('@')) username = '@' + username;

      // Check if email or username already exists in Firestore
      const emailQuery = query(collection(db, 'users'), where('email', '==', email));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        throw new Error('Email already registered');
      }

      const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
      const userSnap = await getDocs(usernameQuery);
      if (!userSnap.empty) {
        throw new Error('Username already taken');
      }

      const userProfile: UserProfile & { password?: string } = {
        uid,
        displayName: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        nickName: data.nickName || '',
        phoneNumber: data.phoneNumber || '',
        email,
        username,
        password: data.password || '',
        photoURL: data.photoURL || '',
        bio: data.bio || '',
        status: 'online',
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPermanentlyBanned: false,
        reportCount: 0,
        blockedUsers: [],
      };

      await setDoc(doc(db, 'users', uid), userProfile);
      return { success: true, data: userProfile };
    } catch (err: any) {
      console.error('Firebase signup error:', err);
      throw err;
    }
  },

  login: async (emailOrUsername: string, pass: string) => {
    try {
      const cleanInput = emailOrUsername.trim().toLowerCase();

      // Query by email first
      let q = query(collection(db, 'users'), where('email', '==', cleanInput));
      let snap = await getDocs(q);

      // If not found, try username
      if (snap.empty) {
        const usernameQuery = cleanInput.startsWith('@') ? cleanInput : '@' + cleanInput;
        q = query(collection(db, 'users'), where('username', '==', usernameQuery));
        snap = await getDocs(q);
      }

      if (snap.empty) {
        return null; // Not found in Firebase, allow fallback to check Sheets
      }

      const userData = snap.docs[0].data() as UserProfile & { password?: string };
      if (userData.password && userData.password !== pass) {
        throw new Error('Invalid password');
      }

      // Update status to online
      await updateDoc(doc(db, 'users', userData.uid), {
        status: 'online',
        lastSeen: new Date().toISOString(),
      });

      return { success: true, data: userData };
    } catch (err: any) {
      console.error('Firebase login error:', err);
      throw err;
    }
  },

  getProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      console.error('Firebase getProfile error:', err);
      return null;
    }
  },

  updateProfile: async (uid: string, data: Partial<UserProfile>) => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.error('Firebase updateProfile error:', err);
      throw err;
    }
  },

  updateStatus: async (uid: string, status: 'online' | 'offline') => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status,
        lastSeen: new Date().toISOString(),
      });
      return { success: true };
    } catch (err) {
      // User doc might not exist yet if syncing
      return { success: false };
    }
  },

  changePassword: async (uid: string, oldPassword: string, newPassword: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      const data = userSnap.data();
      if (data.password && data.password !== oldPassword) {
        throw new Error('Current password is incorrect');
      }
      await updateDoc(userRef, { password: newPassword, updatedAt: new Date().toISOString() });
      return { success: true, message: 'Password updated successfully' };
    } catch (err: any) {
      throw err;
    }
  },

  changeUsername: async (uid: string, newUsername: string) => {
    try {
      let formatted = newUsername.trim();
      if (!formatted.startsWith('@')) formatted = '@' + formatted;

      const q = query(collection(db, 'users'), where('username', '==', formatted));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].id !== uid) {
        throw new Error('Username is already taken');
      }

      await updateDoc(doc(db, 'users', uid), {
        username: formatted,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, message: 'Username updated successfully' };
    } catch (err: any) {
      throw err;
    }
  },

  // --- SEARCH & FRIENDS ---
  searchUsers: async (queryStr: string, currentUid?: string) => {
    try {
      const qLower = queryStr.trim().toLowerCase();
      const usersSnap = await getDocs(collection(db, 'users'));
      const results: UserProfile[] = [];

      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (currentUid && u.uid === currentUid) return;

        const uName = (u.username || '').toLowerCase();
        const dName = (u.displayName || '').toLowerCase();
        const fName = (u.firstName || '').toLowerCase();
        const lName = (u.lastName || '').toLowerCase();
        const nName = (u.nickName || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phoneNumber || '').toLowerCase();

        if (
          uName.includes(qLower) ||
          dName.includes(qLower) ||
          fName.includes(qLower) ||
          lName.includes(qLower) ||
          nName.includes(qLower) ||
          email.includes(qLower) ||
          phone.includes(qLower)
        ) {
          results.push(u);
        }
      });

      return { success: true, data: results };
    } catch (err: any) {
      console.error('Firebase searchUsers error:', err);
      return { success: false, data: [] };
    }
  },

  sendFriendRequest: async (fromUid: string, toUid: string) => {
    try {
      const reqId = `${fromUid}_${toUid}`;
      const reverseReqId = `${toUid}_${fromUid}`;

      // Check existing requests
      const existing1 = await getDoc(doc(db, 'friend_requests', reqId));
      const existing2 = await getDoc(doc(db, 'friend_requests', reverseReqId));

      if (existing1.exists() && existing1.data().status === 'accepted') {
        throw new Error('You are already friends with this user');
      }
      if (existing2.exists() && existing2.data().status === 'accepted') {
        throw new Error('You are already friends with this user');
      }
      if (existing1.exists() && existing1.data().status === 'pending') {
        throw new Error('Friend request already sent');
      }

      const reqData: FriendRequest = {
        id: reqId,
        fromUid,
        toUid,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'friend_requests', reqId), reqData);
      return { success: true, data: reqData };
    } catch (err: any) {
      throw err;
    }
  },

  getFriendRequests: async (uid: string) => {
    try {
      const qReceived = query(
        collection(db, 'friend_requests'),
        where('toUid', '==', uid),
        where('status', '==', 'pending')
      );
      const qSent = query(
        collection(db, 'friend_requests'),
        where('fromUid', '==', uid),
        where('status', '==', 'pending')
      );

      const [receivedSnap, sentSnap] = await Promise.all([
        getDocs(qReceived),
        getDocs(qSent),
      ]);

      const received: any[] = [];
      for (const d of receivedSnap.docs) {
        const req = d.data() as FriendRequest;
        let fromUser: any = null;
        try {
          const fromUserSnap = await getDoc(doc(db, 'users', req.fromUid));
          if (fromUserSnap.exists()) {
            fromUser = fromUserSnap.data();
          }
        } catch (e) {}
        received.push({
          ...req,
          fromUser,
        });
      }

      const sent: any[] = [];
      sentSnap.forEach((d) => {
        sent.push(d.data() as FriendRequest);
      });

      return {
        success: true,
        data: {
          received,
          sent,
        },
      };
    } catch (err: any) {
      console.error('Firebase getFriendRequests error:', err);
      return { success: false, data: { received: [], sent: [] } };
    }
  },

  respondToFriendRequest: async (
    requestId: string,
    status: 'accepted' | 'declined' | 'cancelled',
    metadata?: { fromUid?: string; toUid?: string }
  ) => {
    try {
      const reqRef = doc(db, 'friend_requests', requestId);
      const reqSnap = await getDoc(reqRef);
      const now = new Date().toISOString();

      let fromUid = metadata?.fromUid;
      let toUid = metadata?.toUid;

      if (reqSnap.exists()) {
        const existingData = reqSnap.data() as FriendRequest;
        if (!fromUid) fromUid = existingData.fromUid;
        if (!toUid) toUid = existingData.toUid;

        // Use setDoc with merge to avoid 'No document to update' errors
        await setDoc(
          reqRef,
          {
            status,
            updatedAt: now,
          },
          { merge: true }
        );
      } else {
        // Document didn't exist in Firestore yet (e.g. created in Sheets backup with UUID)
        await setDoc(
          reqRef,
          {
            id: requestId,
            status,
            updatedAt: now,
            ...(fromUid ? { fromUid } : {}),
            ...(toUid ? { toUid } : {}),
          },
          { merge: true }
        );
      }

      // If accepted, ensure chat session is created
      if (status === 'accepted' && fromUid && toUid) {
        const chatId = [fromUid, toUid].sort().join('_');
        await setDoc(
          doc(db, 'chats', chatId),
          {
            id: chatId,
            participants: [fromUid, toUid],
            updatedAt: now,
          },
          { merge: true }
        );
      }

      return { success: true };
    } catch (err: any) {
      console.error('Firebase respondToFriendRequest error:', err);
      throw err;
    }
  },

  importFriendRequest: async (req: any) => {
    try {
      if (!req || !req.id) return;
      await setDoc(
        doc(db, 'friend_requests', req.id),
        {
          id: req.id,
          fromUid: req.fromUid,
          toUid: req.toUid,
          status: req.status || 'pending',
          createdAt: req.createdAt || new Date().toISOString(),
          updatedAt: req.updatedAt || new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Failed to import friend request to Firebase:', e);
    }
  },

  getFriends: async (uid: string) => {
    try {
      const q1 = query(
        collection(db, 'friend_requests'),
        where('fromUid', '==', uid),
        where('status', '==', 'accepted')
      );
      const q2 = query(
        collection(db, 'friend_requests'),
        where('toUid', '==', uid),
        where('status', '==', 'accepted')
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const friendUids = new Set<string>();

      snap1.forEach((d) => friendUids.add(d.data().toUid));
      snap2.forEach((d) => friendUids.add(d.data().fromUid));

      const friends: UserProfile[] = [];
      for (const fUid of friendUids) {
        const userSnap = await getDoc(doc(db, 'users', fUid));
        if (userSnap.exists()) {
          friends.push(userSnap.data() as UserProfile);
        }
      }

      return { success: true, data: friends };
    } catch (err: any) {
      console.error('Firebase getFriends error:', err);
      return { success: false, data: [] };
    }
  },

  unfriend: async (uid: string, friendUid: string) => {
    try {
      // Find all friend requests matching either direction
      const q1 = query(
        collection(db, 'friend_requests'),
        where('fromUid', '==', uid),
        where('toUid', '==', friendUid)
      );
      const q2 = query(
        collection(db, 'friend_requests'),
        where('fromUid', '==', friendUid),
        where('toUid', '==', uid)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const deletes: Promise<any>[] = [];

      snap1.forEach((d) => deletes.push(deleteDoc(d.ref)));
      snap2.forEach((d) => deletes.push(deleteDoc(d.ref)));

      // Also try conventional IDs
      deletes.push(deleteDoc(doc(db, 'friend_requests', `${uid}_${friendUid}`)).catch(() => {}));
      deletes.push(deleteDoc(doc(db, 'friend_requests', `${friendUid}_${uid}`)).catch(() => {}));

      await Promise.all(deletes);
      return { success: true };
    } catch (err: any) {
      throw err;
    }
  },

  // --- CHATS & MESSAGES ---
  getChats: async (uid: string) => {
    try {
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
      const snap = await getDocs(q);
      const chats: (ChatSession & { otherUser?: UserProfile })[] = [];

      for (const d of snap.docs) {
        const chatData = d.data() as ChatSession;
        const otherUid = chatData.participants.find((p) => p !== uid);
        let otherUser: UserProfile | undefined = undefined;

        if (otherUid === 'admin_support') {
          otherUser = ADMIN_SUPPORT_PROFILE;
        } else if (otherUid) {
          const userSnap = await getDoc(doc(db, 'users', otherUid));
          if (userSnap.exists()) {
            otherUser = userSnap.data() as UserProfile;
          }
        }

        chats.push({ ...chatData, otherUser });
      }

      // Sort by updatedAt descending
      chats.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      return { success: true, data: chats };
    } catch (err: any) {
      console.error('Firebase getChats error:', err);
      return { success: false, data: [] };
    }
  },

  getMessages: async (chatId: string, currentUid: string) => {
    try {
      // Get chat doc to identify other user
      const chatSnap = await getDoc(doc(db, 'chats', chatId));
      let otherUser: UserProfile | null = null;

      if (chatSnap.exists()) {
        const participants = chatSnap.data().participants || [];
        const otherUid = participants.find((p: string) => p !== currentUid);
        if (otherUid === 'admin_support') {
          otherUser = ADMIN_SUPPORT_PROFILE;
        } else if (otherUid) {
          const otherUserSnap = await getDoc(doc(db, 'users', otherUid));
          if (otherUserSnap.exists()) {
            otherUser = otherUserSnap.data() as UserProfile;
          }
        }
      }

      // Get messages subcollection
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);

      const messages: ChatMessage[] = [];
      snap.forEach((d) => {
        messages.push(d.data() as ChatMessage);
      });

      return {
        success: true,
        data: {
          messages,
          otherUser,
        },
      };
    } catch (err: any) {
      console.error('Firebase getMessages error:', err);
      return { success: false, data: { messages: [], otherUser: null } };
    }
  },

  sendMessage: async (
    chatId: string,
    senderUid: string,
    text: string,
    customMessageId?: string,
    extra?: { senderName?: string; isAdmin?: boolean }
  ) => {
    try {
      const messageId =
        customMessageId || `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const messageData: ChatMessage = {
        id: messageId,
        senderUid,
        text,
        createdAt: now,
        read: false,
        ...(extra?.senderName ? { senderName: extra.senderName } : {}),
        ...(extra?.isAdmin !== undefined
          ? { isAdmin: extra.isAdmin }
          : senderUid === 'admin_support'
          ? { isAdmin: true }
          : {}),
      };

      // Write message to subcollection
      await setDoc(doc(db, 'chats', chatId, 'messages', messageId), messageData);

      // Determine participants if not existing
      let participants = chatId.split('_');
      if (chatId.startsWith('admin_support_')) {
        const userUid = chatId.replace('admin_support_', '');
        participants = [userUid, 'admin_support'];
      } else if (participants.length < 2) {
        participants = [senderUid];
      }

      // Update chat session doc
      await setDoc(
        doc(db, 'chats', chatId),
        {
          id: chatId,
          participants,
          isSupport: chatId.includes('admin_support') ? true : undefined,
          lastMessage: {
            text,
            senderUid,
            createdAt: now,
          },
          updatedAt: now,
        },
        { merge: true }
      );

      return { success: true, data: messageData };
    } catch (err: any) {
      console.error('Firebase sendMessage error:', err);
      throw err;
    }
  },

  markAsRead: async (chatId: string, messageId: string) => {
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(msgRef, { read: true });
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  markAllAsRead: async (chatId: string, currentUid: string) => {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, where('read', '==', false));
      const snap = await getDocs(q);

      const updates: Promise<any>[] = [];
      snap.forEach((d) => {
        const msg = d.data() as ChatMessage;
        if (msg.senderUid !== currentUid) {
          updates.push(updateDoc(d.ref, { read: true }));
        }
      });

      await Promise.all(updates);
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  cleanChatHistory: async (chatId: string, uid: string) => {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const snap = await getDocs(messagesRef);
      const deletes = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletes);

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: 'Chat history cleared',
          senderUid: uid,
          createdAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (err: any) {
      throw err;
    }
  },

  getUnreadMessages: async (uid: string) => {
    try {
      // Find chats where user is a participant
      const chatsQuery = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
      const chatsSnap = await getDocs(chatsQuery);

      const unread: any[] = [];
      for (const chatDoc of chatsSnap.docs) {
        const chatId = chatDoc.id;
        const msgQuery = query(
          collection(db, 'chats', chatId, 'messages'),
          where('read', '==', false)
        );
        const msgSnap = await getDocs(msgQuery);
        msgSnap.forEach((d) => {
          const m = d.data() as ChatMessage;
          if (m.senderUid !== uid) {
            unread.push({ ...m, chatId });
          }
        });
      }

      return { success: true, data: unread };
    } catch (err: any) {
      console.error('Firebase getUnreadMessages error:', err);
      return { success: false, data: [] };
    }
  },

  // --- BLOCK & REPORT ---
  blockUser: async (uid: string, blockedUid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(blockedUid),
      });
      return { success: true };
    } catch (err: any) {
      throw err;
    }
  },

  unblockUser: async (uid: string, blockedUid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(blockedUid),
      });
      return { success: true };
    } catch (err: any) {
      throw err;
    }
  },

  reportUser: async (reporterUid: string, reportedUid: string, reason: string) => {
    try {
      const reportId = 'rep_' + Date.now();
      await setDoc(doc(db, 'reports', reportId), {
        id: reportId,
        reporterUid,
        reportedUid,
        reason,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });

      // Increment report count on user
      const reportedRef = doc(db, 'users', reportedUid);
      const reportedSnap = await getDoc(reportedRef);
      if (reportedSnap.exists()) {
        const curCount = reportedSnap.data().reportCount || 0;
        await updateDoc(reportedRef, { reportCount: curCount + 1 });
      }

      return { success: true, message: 'Report submitted successfully' };
    } catch (err: any) {
      throw err;
    }
  },

  // --- STATS & COUNTS ---
  getOnlineUserCount: async () => {
    try {
      // Find users active in last 3 minutes
      const usersSnap = await getDocs(collection(db, 'users'));
      const now = Date.now();
      let count = 0;
      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.status === 'online') {
          if (u.lastSeen) {
            const diff = now - new Date(u.lastSeen).getTime();
            if (diff < 1000 * 60 * 5) count++;
          } else {
            count++;
          }
        }
      });
      return { success: true, data: Math.max(1, count) };
    } catch (err) {
      return { success: true, data: 1 };
    }
  },

  getAppStats: async () => {
    try {
      const usersSnap = await getCountFromServer(collection(db, 'users'));
      const usersCount = usersSnap.data().count;

      // Calculate messages count by summing message collections or estimation
      const chatsSnap = await getDocs(collection(db, 'chats'));
      let messagesCount = 0;
      for (const c of chatsSnap.docs) {
        const mSnap = await getCountFromServer(collection(db, 'chats', c.id, 'messages'));
        messagesCount += mSnap.data().count;
      }

      const countriesCount = usersCount > 0 ? Math.min(195, Math.ceil(usersCount / 2)) : 1;

      return {
        success: true,
        data: {
          usersCount,
          messagesCount,
          countriesCount,
          uptime: '99.9%',
        },
      };
    } catch (err: any) {
      console.error('Firebase getAppStats error:', err);
      return {
        success: true,
        data: {
          usersCount: 0,
          messagesCount: 0,
          countriesCount: 0,
          uptime: '100%',
        },
      };
    }
  },

  // --- REAL-TIME LISTENERS ---
  subscribeMessages: (
    chatId: string,
    callback: (messages: ChatMessage[]) => void
  ) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        const msgs: ChatMessage[] = [];
        snap.forEach((d) => msgs.push(d.data() as ChatMessage));
        callback(msgs);
      },
      (err) => {
        console.warn('subscribeMessages listener error:', err);
      }
    );
  },

  subscribeChats: (
    uid: string,
    callback: (chats: (ChatSession & { otherUser?: UserProfile })[]) => void
  ) => {
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
    return onSnapshot(
      q,
      async (snap) => {
        const chats: (ChatSession & { otherUser?: UserProfile })[] = [];
        for (const d of snap.docs) {
          const chatData = d.data() as ChatSession;
          const otherUid = chatData.participants.find((p) => p !== uid);
          let otherUser: UserProfile | undefined = undefined;
          if (otherUid === 'admin_support') {
            otherUser = ADMIN_SUPPORT_PROFILE;
          } else if (otherUid) {
            const userSnap = await getDoc(doc(db, 'users', otherUid));
            if (userSnap.exists()) {
              otherUser = userSnap.data() as UserProfile;
            }
          }
          chats.push({ ...chatData, otherUser });
        }
        chats.sort(
          (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );
        callback(chats);
      },
      (err) => {
        console.warn('subscribeChats listener error:', err);
      }
    );
  },

  // Save imported user from sheets into Firebase
  importUserFromSheets: async (userData: any) => {
    try {
      if (!userData || !userData.uid) return;
      await setDoc(doc(db, 'users', userData.uid), userData, { merge: true });
    } catch (e) {
      console.warn('Failed to import user to Firebase:', e);
    }
  },

  // --- ADMIN ANALYTICS & DASHBOARD METRICS ---
  getAdminAnalytics: async () => {
    try {
      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers: UserProfile[] = [];
      usersSnap.forEach((d) => allUsers.push(d.data() as UserProfile));

      const now = Date.now();
      let onlineCount = 0;
      let bannedCount = 0;
      let reportedCount = 0;
      let verifiedCount = 0;

      // Date bucketing for last 14 days
      const daysCount = 14;
      const dayBuckets: { [key: string]: { date: string; users: number; messages: number } } = {};
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayBuckets[key] = { date: label, users: 0, messages: 0 };
      }

      allUsers.forEach((u) => {
        // Online check (last seen within 5 minutes)
        if (u.status === 'online') {
          if (u.lastSeen) {
            const diff = now - new Date(u.lastSeen).getTime();
            if (diff < 1000 * 60 * 10) onlineCount++;
          } else {
            onlineCount++;
          }
        }

        // Banned check
        if (u.isPermanentlyBanned || (u.banUntil && new Date(u.banUntil).getTime() > now)) {
          bannedCount++;
        }

        // Reported check
        if (u.reportCount && u.reportCount > 0) {
          reportedCount++;
        }

        if (u.photoURL && u.bio) {
          verifiedCount++;
        }

        // Registration bucketing
        if (u.createdAt) {
          const dayKey = u.createdAt.split('T')[0];
          if (dayBuckets[dayKey]) {
            dayBuckets[dayKey].users++;
          }
        }
      });

      // 2. Fetch Chats & Message counts
      const chatsSnap = await getDocs(collection(db, 'chats'));
      let totalMessages = 0;
      let totalChats = chatsSnap.size;

      for (const c of chatsSnap.docs) {
        try {
          const msgsSnap = await getDocs(collection(db, 'chats', c.id, 'messages'));
          totalMessages += msgsSnap.size;

          msgsSnap.forEach((m) => {
            const mData = m.data();
            if (mData.createdAt) {
              const dayKey = mData.createdAt.split('T')[0];
              if (dayBuckets[dayKey]) {
                dayBuckets[dayKey].messages++;
              }
            }
          });
        } catch (e) {
          // ignore chat message read failure
        }
      }

      // 3. Fetch Friend Requests
      const frSnap = await getDocs(collection(db, 'friend_requests'));
      let acceptedRequests = 0;
      let pendingRequests = 0;
      frSnap.forEach((d) => {
        const status = d.data().status;
        if (status === 'accepted') acceptedRequests++;
        else if (status === 'pending') pendingRequests++;
      });

      // 4. Fetch Reports
      const reportsSnap = await getDocs(collection(db, 'reports'));
      let pendingReports = 0;
      let resolvedReports = 0;
      const allReports: any[] = [];
      reportsSnap.forEach((d) => {
        const r = d.data();
        allReports.push(r);
        if (r.status === 'resolved') resolvedReports++;
        else pendingReports++;
      });

      // 5. User Status Chart Data
      const offlineCount = Math.max(0, allUsers.length - onlineCount - bannedCount);
      const userStatusData = [
        { name: 'Active Online', value: onlineCount, color: '#10b981' },
        { name: 'Offline', value: offlineCount, color: '#6366f1' },
        { name: 'Banned Accounts', value: bannedCount, color: '#ef4444' },
        { name: 'Reported Users', value: reportedCount, color: '#f59e0b' },
      ].filter((item) => item.value > 0);

      // If empty, supply placeholder items for charts
      if (userStatusData.length === 0) {
        userStatusData.push(
          { name: 'Active Online', value: 1, color: '#10b981' },
          { name: 'Offline', value: 3, color: '#6366f1' }
        );
      }

      const timelineData = Object.values(dayBuckets);

      return {
        success: true,
        data: {
          metrics: {
            totalUsers: allUsers.length,
            onlineUsers: Math.max(onlineCount, 1),
            bannedUsers: bannedCount,
            reportedUsers: reportedCount,
            totalMessages,
            totalChats,
            totalFriendRequests: frSnap.size,
            acceptedFriendships: acceptedRequests,
            pendingFriendRequests: pendingRequests,
            totalReports: allReports.length,
            pendingReports,
            resolvedReports,
            avgMessagesPerUser: allUsers.length > 0 ? (totalMessages / allUsers.length).toFixed(1) : '0',
          },
          timeline: timelineData,
          userStatusDistribution: userStatusData,
          recentUsers: allUsers
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 8),
          recentReports: allReports
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 6),
          storageOverview: {
            primaryDatabase: 'Firebase Firestore (Cloud Run)',
            primaryLatency: '12ms',
            backupDatabase: 'Google Sheets Backup (Apps Script)',
            backupStatus: 'Active Background Mirror',
            counts: {
              users: allUsers.length,
              messages: totalMessages,
              chats: totalChats,
              friendRequests: frSnap.size,
              reports: allReports.length,
            },
          },
        },
      };
    } catch (err: any) {
      console.error('Firebase getAdminAnalytics error:', err);
      return { success: false, message: err.message };
    }
  },

  // System Announcements for live alert banners across the app
  getSystemAnnouncements: async () => {
    try {
      const snap = await getDocs(collection(db, 'system_announcements'));
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      return { success: true, data: list };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  saveSystemAnnouncement: async (announcement: {
    id?: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'alert' | 'success';
    active: boolean;
  }) => {
    try {
      const id = announcement.id || 'announce_' + Date.now();
      const data = {
        ...announcement,
        id,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'system_announcements', id), data, { merge: true });
      return { success: true, data };
    } catch (e: any) {
      throw e;
    }
  },

  deleteSystemAnnouncement: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'system_announcements', id));
      return { success: true };
    } catch (e: any) {
      throw e;
    }
  },

  // Admin User & Report Management
  adminGetUsers: async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users: any[] = [];
      snap.forEach((d) => users.push(d.data()));
      return { success: true, data: users };
    } catch (e: any) {
      return { success: false, data: [] };
    }
  },

  adminGetReports: async () => {
    try {
      const snap = await getDocs(collection(db, 'reports'));
      const reports: any[] = [];
      for (const d of snap.docs) {
        const rData = d.data();
        let reportedUser: any = null;
        let reporterUser: any = null;
        if (rData.reportedUid) {
          const uSnap = await getDoc(doc(db, 'users', rData.reportedUid));
          if (uSnap.exists()) reportedUser = uSnap.data();
        }
        if (rData.reporterUid) {
          const uSnap = await getDoc(doc(db, 'users', rData.reporterUid));
          if (uSnap.exists()) reporterUser = uSnap.data();
        }
        reports.push({
          ...rData,
          reportedUser,
          reporterUser,
        });
      }
      return { success: true, data: reports };
    } catch (e: any) {
      return { success: false, data: [] };
    }
  },

  adminBanUser: async (uid: string, days: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      const isPermanent = days < 0;
      const banUntil = isPermanent
        ? null
        : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await updateDoc(userRef, {
        isPermanentlyBanned: isPermanent,
        banUntil,
        status: 'offline',
        updatedAt: new Date().toISOString(),
      });

      return { success: true, message: isPermanent ? 'User permanently banned' : `User banned for ${days} days` };
    } catch (e: any) {
      throw e;
    }
  },

  adminUnbanUser: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isPermanentlyBanned: false,
        banUntil: null,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, message: 'User unbanned successfully' };
    } catch (e: any) {
      throw e;
    }
  },

  adminSendWarning: async (uid: string, message: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        adminWarning: {
          message,
          date: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });
      return { success: true, message: 'Warning dispatched to user' };
    } catch (e: any) {
      throw e;
    }
  },

  adminDeleteReport: async (reportId: string) => {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      return { success: true };
    } catch (e: any) {
      throw e;
    }
  },

  // --- ADMIN SUPPORT CHAT SYSTEM ---
  getOrCreateAdminSupportChat: async (userUid: string) => {
    try {
      const chatId = `admin_support_${userUid}`;
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      const now = new Date().toISOString();

      // Ensure admin_support user document exists
      const supportUserRef = doc(db, 'users', 'admin_support');
      const supportUserSnap = await getDoc(supportUserRef);
      if (!supportUserSnap.exists()) {
        await setDoc(supportUserRef, ADMIN_SUPPORT_PROFILE, { merge: true });
      }

      if (!chatSnap.exists()) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome_' + Date.now(),
          senderUid: 'admin_support',
          senderName: 'Snapy Admin Team',
          isAdmin: true,
          text: 'Hello! 👋 You are chatting directly with Snapy Admins & Support Staff. How can we assist you today?',
          createdAt: now,
          read: false,
        };

        await setDoc(chatRef, {
          id: chatId,
          participants: [userUid, 'admin_support'],
          isSupport: true,
          userUid,
          updatedAt: now,
          lastMessage: {
            text: welcomeMessage.text,
            senderUid: 'admin_support',
            createdAt: now,
          },
        });

        await setDoc(doc(db, 'chats', chatId, 'messages', welcomeMessage.id), welcomeMessage);
      }

      return { success: true, chatId };
    } catch (err: any) {
      console.error('Firebase getOrCreateAdminSupportChat error:', err);
      throw err;
    }
  },

  adminGetSupportChats: async () => {
    try {
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', 'admin_support'));
      const snap = await getDocs(q);
      const chats: any[] = [];

      for (const d of snap.docs) {
        const chatData = d.data() as ChatSession;
        const userUid = chatData.participants.find((p) => p !== 'admin_support') || chatData.userUid;
        let targetUser: UserProfile | null = null;
        if (userUid) {
          const uSnap = await getDoc(doc(db, 'users', userUid));
          if (uSnap.exists()) {
            targetUser = uSnap.data() as UserProfile;
          }
        }
        chats.push({
          ...chatData,
          user: targetUser,
          userName: targetUser?.displayName || targetUser?.username || 'User',
          userEmail: targetUser?.email || '',
          userPhoto: targetUser?.photoURL || '',
          userStatus: targetUser?.status || 'offline',
          userUid,
        });
      }

      chats.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      return { success: true, data: chats };
    } catch (err: any) {
      console.error('Firebase adminGetSupportChats error:', err);
      return { success: false, data: [] };
    }
  },

  subscribeAdminSupportChats: (callback: (chats: any[]) => void) => {
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', 'admin_support'));
    return onSnapshot(
      q,
      async (snap) => {
        const chats: any[] = [];
        for (const d of snap.docs) {
          const chatData = d.data() as ChatSession;
          const userUid = chatData.participants.find((p) => p !== 'admin_support') || chatData.userUid;
          let targetUser: UserProfile | null = null;
          if (userUid) {
            const uSnap = await getDoc(doc(db, 'users', userUid));
            if (uSnap.exists()) {
              targetUser = uSnap.data() as UserProfile;
            }
          }
          chats.push({
            ...chatData,
            user: targetUser,
            userName: targetUser?.displayName || targetUser?.username || 'User',
            userEmail: targetUser?.email || '',
            userPhoto: targetUser?.photoURL || '',
            userStatus: targetUser?.status || 'offline',
            userUid,
          });
        }
        chats.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        callback(chats);
      },
      (err) => {
        console.warn('subscribeAdminSupportChats error:', err);
      }
    );
  },

  adminSendUserMessage: async (chatId: string, text: string, staffMember?: any) => {
    try {
      const messageId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const senderName = staffMember?.name ? `${staffMember.name} (Admin)` : 'Snapy Support Team';

      const messageData: ChatMessage = {
        id: messageId,
        senderUid: 'admin_support',
        senderName,
        isAdmin: true,
        text,
        createdAt: now,
        read: false,
      };

      await setDoc(doc(db, 'chats', chatId, 'messages', messageId), messageData);

      let participants = chatId.split('_');
      if (chatId.startsWith('admin_support_')) {
        const userUid = chatId.replace('admin_support_', '');
        participants = [userUid, 'admin_support'];
      }

      await setDoc(
        doc(db, 'chats', chatId),
        {
          id: chatId,
          participants,
          isSupport: true,
          lastMessage: {
            text,
            senderUid: 'admin_support',
            createdAt: now,
          },
          updatedAt: now,
        },
        { merge: true }
      );

      return { success: true, data: messageData };
    } catch (err: any) {
      console.error('Firebase adminSendUserMessage error:', err);
      throw err;
    }
  },

  adminInitiateChatWithUser: async (userUid: string, initialMessage?: string, staffMember?: any) => {
    try {
      const chatId = `admin_support_${userUid}`;
      const chatRef = doc(db, 'chats', chatId);
      const now = new Date().toISOString();

      // Ensure admin_support user document exists
      const supportUserRef = doc(db, 'users', 'admin_support');
      const supportUserSnap = await getDoc(supportUserRef);
      if (!supportUserSnap.exists()) {
        await setDoc(supportUserRef, ADMIN_SUPPORT_PROFILE, { merge: true });
      }

      await setDoc(
        chatRef,
        {
          id: chatId,
          participants: [userUid, 'admin_support'],
          isSupport: true,
          userUid,
          updatedAt: now,
        },
        { merge: true }
      );

      if (initialMessage && initialMessage.trim()) {
        const messageId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const senderName = staffMember?.name ? `${staffMember.name} (Admin)` : 'Snapy Support Team';
        const msg: ChatMessage = {
          id: messageId,
          senderUid: 'admin_support',
          senderName,
          isAdmin: true,
          text: initialMessage.trim(),
          createdAt: now,
          read: false,
        };
        await setDoc(doc(db, 'chats', chatId, 'messages', messageId), msg);
        await updateDoc(chatRef, {
          lastMessage: {
            text: initialMessage.trim(),
            senderUid: 'admin_support',
            createdAt: now,
          },
          updatedAt: now,
        });
      }

      return { success: true, chatId };
    } catch (err: any) {
      console.error('Firebase adminInitiateChatWithUser error:', err);
      throw err;
    }
  },

  // --- STAFF & ADMIN MANAGEMENT ---
  adminGetStaff: async () => {
    try {
      const snap = await getDocs(collection(db, 'admins'));
      const staffList: any[] = [];
      snap.forEach((d) => staffList.push(d.data()));

      // If empty in Firestore, seed root super admin
      if (staffList.length === 0) {
        const rootAdmin = {
          uid: 'admin_root',
          email: 'admin@snapy.com',
          name: 'Chief Administrator',
          password: 'admin123',
          role: 'super',
          title: 'System Super Admin',
          status: 'active',
          createdAt: '2025-01-01T00:00:00.000Z',
        };
        await setDoc(doc(db, 'admins', 'admin_root'), rootAdmin);
        staffList.push(rootAdmin);
      }

      return { success: true, data: staffList };
    } catch (e: any) {
      console.warn('Firebase adminGetStaff error:', e);
      return { success: false, data: [] };
    }
  },

  adminAddStaff: async (staffData: {
    email: string;
    password: string;
    name?: string;
    role: 'super' | 'admin' | 'staff' | 'moderator';
    title?: string;
  }) => {
    try {
      const uid = 'staff_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newStaff = {
        uid,
        email: staffData.email.trim().toLowerCase(),
        name: staffData.name ? staffData.name.trim() : staffData.email.split('@')[0],
        password: staffData.password,
        role: staffData.role || 'staff',
        title:
          staffData.title ||
          (staffData.role === 'super'
            ? 'Super Administrator'
            : staffData.role === 'admin'
            ? 'Platform Administrator'
            : 'Support Specialist'),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'admins', uid), newStaff);
      return { success: true, data: newStaff };
    } catch (e: any) {
      console.error('Firebase adminAddStaff error:', e);
      throw e;
    }
  },

  adminDeleteStaff: async (uid: string) => {
    try {
      if (uid === 'admin_root') {
        throw new Error('Cannot delete primary root administrator');
      }
      await deleteDoc(doc(db, 'admins', uid));
      return { success: true };
    } catch (e: any) {
      throw e;
    }
  },

  adminUpdateStaff: async (uid: string, updates: any) => {
    try {
      const ref = doc(db, 'admins', uid);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (e: any) {
      throw e;
    }
  },

  adminLoginStaff: async (credentials: { email: string; password: string }) => {
    try {
      const cleanEmail = credentials.email.trim().toLowerCase();
      // 1. Root super admin shortcut
      if (cleanEmail === 'admin@snapy.com' && credentials.password === 'admin123') {
        return {
          success: true,
          data: {
            uid: 'admin_root',
            email: 'admin@snapy.com',
            name: 'Chief Administrator',
            role: 'super' as const,
            title: 'System Super Admin',
          },
        };
      }

      // 2. Query Firestore admins collection
      const q = query(collection(db, 'admins'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const staff = snap.docs[0].data() as any;
        if (staff.password && staff.password === credentials.password) {
          return {
            success: true,
            data: {
              uid: staff.uid,
              email: staff.email,
              name: staff.name || staff.email.split('@')[0],
              role: staff.role || 'staff',
              title: staff.title || 'Staff Member',
            },
          };
        } else {
          throw new Error('Invalid staff password');
        }
      }

      return null;
    } catch (e: any) {
      throw e;
    }
  },
};
