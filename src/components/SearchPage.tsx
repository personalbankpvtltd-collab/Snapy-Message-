import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, UserPlus, Clock, User as UserIcon } from 'lucide-react';
import { apiService } from '../services/api';

export default function SearchPage() {
  const { user: authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Record<string, string>>({}); // toUid -> requestId
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) return;
    fetchRequestsAndSuggestions();
  }, [authUser]);

  const fetchRequestsAndSuggestions = async () => {
    if (!authUser) return;
    try {
      const [reqsRes, friendsRes, allUsersRes] = await Promise.all([
        apiService.getFriendRequests(authUser.uid),
        apiService.getFriends(authUser.uid),
        apiService.searchUsers('') // Get all users to suggest
      ]);
      
      let currentSentRequests: Record<string, string> = {};
      if (reqsRes && reqsRes.success && reqsRes.data?.sent) {
        reqsRes.data.sent.forEach((req: any) => {
          currentSentRequests[req.toUid] = req.id;
        });
        setSentRequests(currentSentRequests);
      }

      if (allUsersRes && allUsersRes.success && Array.isArray(allUsersRes.data)) {
        const friendsList = friendsRes?.success && Array.isArray(friendsRes.data) ? friendsRes.data.map((f: any) => f.uid) : [];
        const suggestions = allUsersRes.data.filter((u: UserProfile) => 
          u.uid !== authUser.uid && 
          !friendsList.includes(u.uid) &&
          !currentSentRequests[u.uid]
        ).slice(0, 10); // Show top 10 suggestions
        setSuggestedFriends(suggestions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !authUser) return;
    setLoading(true);
    try {
      const res = await apiService.searchUsers(searchTerm.trim());
      if (res && res.success && Array.isArray(res.data)) {
        setResults(res.data.filter((u: UserProfile) => u.uid !== authUser.uid));
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (toUid: string) => {
    if (!authUser) return;
    setError(null);
    setSendingRequestTo(toUid);
    try {
      const res = await apiService.sendFriendRequest(authUser.uid, toUid);
      if (res && res.success) {
        await fetchRequestsAndSuggestions();
      } else {
        setError((res as any)?.message || 'Error sending friend request');
      }
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      setError(err.message || 'Error sending friend request');
    } finally {
      setSendingRequestTo(null);
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    try {
      await apiService.respondToFriendRequest(requestId, 'cancelled', authUser?.uid);
      fetchRequestsAndSuggestions();
    } catch (error) {
      console.error('Error cancelling friend request:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto max-w-4xl mx-auto p-4 md:p-8 dark:bg-gray-950 transition-colors">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Find Friends</h1>
        <p className="text-gray-600 dark:text-gray-400">Search for users by their email address or @username to connect.</p>
      </div>

      <form onSubmit={handleSearch} className="relative mb-8">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter email or @username..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-6 h-6" />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">✕</button>
        </motion.div>
      )}

      {!searchTerm && suggestedFriends.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Suggested Friends</h2>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {(searchTerm ? results : suggestedFriends).map((user, index) => (
            <motion.div
              key={`${user.uid}-${index}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-500 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <UserIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{user.displayName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                    {user.username || user.email}
                  </p>
                </div>
              </div>

              {sentRequests[user.uid] ? (
                <button
                  onClick={() => cancelFriendRequest(sentRequests[user.uid])}
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all"
                >
                  <Clock className="w-4 h-4" />
                  Pending
                </button>
              ) : (
                <button
                  onClick={() => sendFriendRequest(user.uid)}
                  disabled={sendingRequestTo === user.uid}
                  className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all disabled:opacity-50"
                >
                  {sendingRequestTo === user.uid ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full"
                    />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {sendingRequestTo === user.uid ? 'Sending...' : 'Add Friend'}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!loading && results.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No users found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try searching with a different email or @username.</p>
        </div>
      )}
    </div>
  );
}
