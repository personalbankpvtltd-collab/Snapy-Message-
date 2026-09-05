import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { UserProfile, FriendRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, User as UserIcon, MessageSquare, Clock } from 'lucide-react';
import { apiService } from '../services/api';
import { safeStorage } from '../lib/utils';

export default function Friends() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [incomingRequests, setIncomingRequests] = useState<(FriendRequest & { fromUser?: UserProfile })[]>(() => {
    const cached = safeStorage.getItem('snapy_requests');
    if (cached && cached !== 'undefined') {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached requests:', e);
        return [];
      }
    }
    return [];
  });
  const [friends, setFriends] = useState<UserProfile[]>(() => {
    const cached = safeStorage.getItem('snapy_friends');
    if (cached && cached !== 'undefined') {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached friends:', e);
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(friends.length === 0 && incomingRequests.length === 0);

  useEffect(() => {
    if (!authUser) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [authUser]);

  const isFetching = React.useRef(false);

  const fetchData = async () => {
    if (!authUser || isFetching.current) return;
    isFetching.current = true;
    try {
      const [reqsRes, friendsRes] = await Promise.all([
        apiService.getFriendRequests(authUser.uid),
        apiService.getFriends(authUser.uid)
      ]);
      
      if (reqsRes && reqsRes.success && reqsRes.data?.received) {
        if (JSON.stringify(reqsRes.data.received) !== JSON.stringify(incomingRequests)) {
          setIncomingRequests(reqsRes.data.received);
          safeStorage.setItem('snapy_requests', JSON.stringify(reqsRes.data.received));
        }
      }
      if (friendsRes && friendsRes.success && Array.isArray(friendsRes.data)) {
        if (JSON.stringify(friendsRes.data) !== JSON.stringify(friends)) {
          setFriends(friendsRes.data);
          safeStorage.setItem('snapy_friends', JSON.stringify(friendsRes.data));
        }
      }
    } catch (error) {
      console.error('Error fetching friends data:', error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const acceptRequest = async (request: FriendRequest) => {
    try {
      // Optimistic update
      setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));
      await apiService.respondToFriendRequest(request.id, 'accepted', request.fromUid, request.toUid);
      fetchData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      fetchData();
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      const targetReq = incomingRequests.find((r) => r.id === requestId);
      // Optimistic update
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      await apiService.respondToFriendRequest(
        requestId,
        'declined',
        targetReq?.fromUid,
        targetReq?.toUid
      );
      fetchData();
    } catch (error) {
      console.error('Error declining friend request:', error);
      fetchData();
    }
  };

  const startChat = (friendUid: string) => {
    if (!authUser) return;
    const chatId = [authUser.uid, friendUid].sort().join('_');
    navigate(`/app?chat=${chatId}`);
  };

  return (
    <div className="h-full overflow-y-auto max-w-4xl mx-auto p-4 md:p-8 dark:bg-gray-950 transition-colors">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Incoming Requests
          {incomingRequests.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{incomingRequests.length}</span>
          )}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {incomingRequests.map((req, index) => (
              <motion.div
                key={`${req.id}-${index}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {req.fromUser?.photoURL ? (
                      <img src={req.fromUser.photoURL} alt={req.fromUser.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{req.fromUser?.displayName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sent a friend request</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(req)}
                    className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-600 hover:text-white dark:hover:bg-green-600 dark:hover:text-white transition-all active:scale-90"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => declineRequest(req.id)}
                    className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-all active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {incomingRequests.length === 0 && !loading && (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">No pending requests.</p>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          My Friends
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {friends.map((friend, index) => (
              <motion.div
                key={`${friend.uid}-${index}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-500 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{friend.displayName}</h3>
                    <p className="text-xs text-green-500 dark:text-green-400 font-medium">{friend.status || 'offline'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => startChat(friend.uid)}
                  className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {friends.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">You haven't added any friends yet.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Go to search to find people you know!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
