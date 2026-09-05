import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { FriendRequest, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, User as UserIcon, Bell } from 'lucide-react';
import { apiService } from '../services/api';
import { safeStorage } from '../lib/utils';

import { Link } from 'react-router-dom';

export default function Notifications() {
  const { user: authUser, unreadMessages } = useAuth();
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
  const [loading, setLoading] = useState(incomingRequests.length === 0);

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
      const reqsRes = await apiService.getFriendRequests(authUser.uid);
      
      if (reqsRes && reqsRes.success && reqsRes.data?.received) {
        if (JSON.stringify(reqsRes.data.received) !== JSON.stringify(incomingRequests)) {
          setIncomingRequests(reqsRes.data.received);
          safeStorage.setItem('snapy_requests', JSON.stringify(reqsRes.data.received));
        }
      }
    } catch (error) {
      console.error('Error fetching notifications data:', error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const acceptRequest = async (request: FriendRequest) => {
    try {
      await apiService.respondToFriendRequest(request.id, 'accepted');
      fetchData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      await apiService.respondToFriendRequest(requestId, 'declined');
      fetchData();
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto max-w-4xl mx-auto p-4 md:p-8 dark:bg-gray-950 transition-colors">
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-xl">
          <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your friend requests and alerts.</p>
        </div>
      </div>

      <div className="space-y-6">
        {unreadMessages.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-colors">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Unread Messages ({unreadMessages.length})</h2>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {unreadMessages.map((msg, index) => (
                  <motion.div
                    key={`${msg.id}-${index}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-gray-700">
                        {msg.sender?.photoURL ? (
                          <img src={msg.sender.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-400">
                            <UserIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{msg.sender?.displayName || 'Unknown User'}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px] md:max-w-md">
                          {msg.text.startsWith('[IMG]') ? 'Sent an image' : msg.text}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/app?chat=${msg.chatId}`}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                    >
                      View Chat
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {incomingRequests.length > 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-colors">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Friend Requests ({incomingRequests.length})</h2>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {incomingRequests.map((request, index) => (
                  <motion.div
                    key={`${request.id}-${index}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-gray-700">
                        {request.fromUser?.photoURL ? (
                          <img src={request.fromUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-400">
                            <UserIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{request.fromUser?.displayName || 'Unknown User'}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Wants to be your friend</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptRequest(request)}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-90 shadow-sm"
                        title="Accept"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => declineRequest(request.id)}
                        className="p-2 bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 transition-all active:scale-90 shadow-sm"
                        title="Decline"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          !loading && unreadMessages.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
              <div className="bg-gray-50 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No new notifications</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                You're all caught up! When you receive friend requests or other alerts, they will appear here.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
