import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { ChatSession, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, User as UserIcon, ArrowRight, RefreshCw, Download, Bell, X as CloseIcon, ShieldCheck, Headphones } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn, safeStorage } from '../lib/utils';
import Chat from './Chat';
import { apiService } from '../services/api';
import { notificationService } from '../services/notificationService';

export default function Dashboard() {
  const { user: authUser, onlineUserCount } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatParam = searchParams.get('chat');
  const [startingAdminChat, setStartingAdminChat] = useState(false);
  const [chats, setChats] = useState<(ChatSession & { otherUser?: UserProfile })[]>(() => {
    const cached = safeStorage.getItem('snapy_chats');
    if (cached && cached !== 'undefined') {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached chats:', e);
        return [];
      }
    }
    return [];
  });
  const [selectedChatId, setSelectedChatId] = useState<string | null>(chatParam);
  const [loading, setLoading] = useState(chats.length === 0);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [notifPermission, setNotifPermission] = useState(notificationService.getPermissionState());
  const [repairing, setRepairing] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>(() => {
    const saved = safeStorage.getItem('snapy_dismissed_announcements');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    apiService.getSystemAnnouncements().then((res) => {
      if (res && res.success && Array.isArray(res.data)) {
        setAnnouncements(res.data.filter((a: any) => a.active));
      }
    }).catch((e) => console.warn('Announcements fetch error:', e));
  }, []);

  const handleDismissAnnouncement = (id: string) => {
    const updated = [...dismissedAnnouncements, id];
    setDismissedAnnouncements(updated);
    safeStorage.setItem('snapy_dismissed_announcements', JSON.stringify(updated));
  };

  useEffect(() => {
    const checkPermission = () => {
      setNotifPermission(notificationService.getPermissionState());
    };
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already dismissed this session
      if (!safeStorage.getItem('snapy_install_dismissed')) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      if (!safeStorage.getItem('snapy_notif_dismissed')) {
        setShowNotificationBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setNotifPermission(notificationService.getPermissionState());
    if (granted) {
      setShowNotificationBanner(false);
      notificationService.showNotification('Notifications Enabled!', {
        body: 'You will now receive alerts for new messages.'
      });
    }
  };

  const handleRepair = async () => {
    setRepairing(true);
    await notificationService.repairNotifications();
    setTimeout(() => {
      setNotifPermission(notificationService.getPermissionState());
      setRepairing(false);
    }, 2000);
  };

  useEffect(() => {
    if (chatParam) {
      setSelectedChatId(chatParam);
    }
  }, [chatParam]);

  useEffect(() => {
    if (!authUser) return;
    fetchChats();

    // Real-time Firestore chat subscription (1st primary)
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = apiService.subscribeChats?.(authUser.uid, (liveChats) => {
        if (liveChats) {
          setChats(liveChats);
          safeStorage.setItem('snapy_chats', JSON.stringify(liveChats));
          setLoading(false);
        }
      });
    } catch (e) {
      console.warn('Real-time chat subscription error:', e);
    }

    const interval = setInterval(fetchChats, 5000);
    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [authUser]);

  const isFetching = React.useRef(false);

  const fetchChats = async () => {
    if (!authUser || isFetching.current) return;
    isFetching.current = true;
    try {
      const res = await apiService.getChats(authUser.uid);
      if (res && res.success && Array.isArray(res.data)) {
        if (JSON.stringify(res.data) !== JSON.stringify(chats)) {
          setChats(res.data);
          safeStorage.setItem('snapy_chats', JSON.stringify(res.data));
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const handleBack = () => {
    setSelectedChatId(null);
    setSearchParams({});
  };

  const handleStartAdminChat = async () => {
    if (!authUser || startingAdminChat) return;
    setStartingAdminChat(true);
    try {
      const res = await apiService.getOrCreateAdminSupportChat(authUser.uid);
      if (res && res.chatId) {
        setSelectedChatId(res.chatId);
      }
    } catch (e: any) {
      console.error('Failed to start admin chat:', e);
    } finally {
      setStartingAdminChat(false);
    }
  };

  if (selectedChatId) {
    return <Chat chatId={selectedChatId} onBack={handleBack} />;
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950 transition-colors">
      <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <AnimatePresence mode="wait">
              <motion.span 
                key={onlineUserCount}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                className="text-xs font-bold text-green-600 dark:text-green-400"
              >
                {onlineUserCount} Users Online
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartAdminChat}
            disabled={startingAdminChat}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-all active:scale-95 shadow-xs border border-indigo-100 dark:border-indigo-800"
            title="Chat with Admin & Staff"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">{startingAdminChat ? 'Connecting...' : 'Chat with Admin'}</span>
            <span className="sm:hidden">{startingAdminChat ? '...' : 'Admin'}</span>
          </button>
          <button 
            onClick={() => {
              setLoading(true);
              fetchChats();
            }}
            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-90"
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5", isFetching.current && "animate-spin")} />
          </button>
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
            <img src="https://i.pinimg.com/736x/c0/e7/e3/c0e7e34714b381275cabc59cf5e41c78.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showInstallBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600 text-white overflow-hidden"
          >
            <div className="p-4 flex items-center justify-between gap-4 max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Install Snapy App</p>
                  <p className="text-xs text-indigo-100">Get a better experience and real-time alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleInstall}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-indigo-50 transition-all"
                >
                  Install
                </button>
                <button 
                  onClick={() => {
                    setShowInstallBanner(false);
                    safeStorage.setItem('snapy_install_dismissed', 'true');
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showNotificationBanner && !showInstallBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-600 text-white overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Enable Notifications</p>
                    <p className="text-xs text-blue-100">Never miss a message from your friends</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleEnableNotifications}
                    className="bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-50 transition-all"
                  >
                    {notifPermission === 'denied' ? 'Fix Denied' : 'Enable'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowNotificationBanner(false);
                      safeStorage.setItem('snapy_notif_dismissed', 'true');
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {notifPermission === 'denied' && (
                <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80">How to fix:</p>
                  <p className="text-xs leading-relaxed">
                    Click the <strong>Lock icon</strong> 🔒 in your browser's address bar (top left), find <strong>Notifications</strong>, and change it to <strong>"Allow"</strong>. Then refresh the page.
                  </p>
                  <button 
                    onClick={handleRepair}
                    disabled={repairing}
                    className="mt-2 text-[10px] font-black uppercase tracking-widest bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all disabled:opacity-50"
                  >
                    {repairing ? 'Repairing...' : 'Repair System Channel'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Live System Broadcast Announcements Banner */}
        {announcements
          .filter((a) => !dismissedAnnouncements.includes(a.id))
          .map((item) => (
            <motion.div
              key={item.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                "text-white overflow-hidden shadow-xs",
                item.type === 'alert' && "bg-rose-600",
                item.type === 'warning' && "bg-amber-600",
                item.type === 'success' && "bg-emerald-600",
                (!item.type || item.type === 'info') && "bg-indigo-600"
              )}
            >
              <div className="p-3.5 flex items-center justify-between gap-4 max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-white/20 rounded">
                        Notice
                      </span>
                      <p className="text-xs font-bold leading-snug">{item.title}</p>
                    </div>
                    <p className="text-[11px] opacity-90 leading-tight mt-0.5">{item.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismissAnnouncement(item.id)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-all shrink-0 text-white/80 hover:text-white"
                  title="Dismiss Announcement"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Official Admin & Staff Support Quick Card */}
        <div
          onClick={handleStartAdminChat}
          className="p-3.5 mb-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-indigo-50/90 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 dark:shadow-indigo-950">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">Snapy Admin Support</h4>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  Staff
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Need help or have questions? Chat directly with the platform administration
              </p>
            </div>
          </div>
          <button
            disabled={startingAdminChat}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            {startingAdminChat ? 'Connecting...' : 'Chat Now'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {chats.map((chat, index) => {
            const isSupportChat = chat.isSupport || chat.id.startsWith('admin_support_') || chat.otherUser?.uid === 'admin_support';
            return (
              <motion.div
                key={`${chat.id}-${index}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedChatId(chat.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group active:scale-[0.98]",
                  isSupportChat 
                    ? "border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 shadow-xs" 
                    : "border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-100 dark:hover:border-indigo-800"
                )}
              >
                <div className="relative">
                  <div className={cn(
                    "w-14 h-14 rounded-full overflow-hidden border-2 shadow-sm",
                    isSupportChat ? "border-indigo-400 dark:border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40" : "border-white dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
                  )}>
                    {chat.otherUser?.photoURL ? (
                      <img src={chat.otherUser.photoURL} alt={chat.otherUser.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                        {isSupportChat ? <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /> : <UserIcon className="w-7 h-7" />}
                      </div>
                    )}
                  </div>
                  {chat.otherUser?.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{chat.otherUser?.displayName || 'Unknown User'}</h3>
                      {isSupportChat && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 shrink-0">
                          <ShieldCheck className="w-3 h-3" /> Staff
                        </span>
                      )}
                    </div>
                    {chat.updatedAt && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {chat.lastMessage ? (
                      typeof chat.lastMessage === 'string' ? (
                        chat.lastMessage
                      ) : (
                        <>
                          {chat.lastMessage.senderUid === authUser?.uid ? 'You: ' : ''}
                          {chat.lastMessage.text || 'Message'}
                        </>
                      )
                    ) : (
                      'No messages yet. Say hi!'
                    )}
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-indigo-400" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!loading && chats.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No conversations yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Start a conversation by adding friends or chatting with admin support.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button 
                onClick={() => navigate('/friends')}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
              >
                Find Friends
              </button>
              <button 
                onClick={handleStartAdminChat}
                disabled={startingAdminChat}
                className="bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                {startingAdminChat ? 'Connecting...' : 'Chat with Admin'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
