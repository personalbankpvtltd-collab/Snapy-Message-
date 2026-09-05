import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Send, User as UserIcon, ShieldCheck, Search, 
  Plus, Clock, Check, CheckCheck, AlertTriangle, Ban, RefreshCw, 
  X, ChevronRight, Sparkles, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiService } from '../services/api';
import { cn } from '../lib/utils';
import { ChatMessage } from '../types';

interface AdminSupportChatsProps {
  admin: { uid: string; email: string; role: string; name?: string };
  initialSelectedUserUid?: string;
  onWarnUser?: (uid: string, name: string) => void;
  onBanUser?: (uid: string, name: string) => void;
}

const QUICK_RESPONSES = [
  "👋 Hello! How can our support team assist you today?",
  "🔍 Thank you for the details. We are actively investigating this for you.",
  "✅ This issue has now been resolved. Please let us know if everything looks good!",
  "⚠️ Please remember to review our platform community guidelines.",
  "🔒 For security reasons, please do not share sensitive passwords or credentials in chat."
];

const getLastMessageText = (lastMessage: any): string => {
  if (!lastMessage) return 'No messages yet';
  if (typeof lastMessage === 'string') return lastMessage;
  if (typeof lastMessage === 'object' && typeof lastMessage.text === 'string') {
    return lastMessage.text;
  }
  return 'No messages yet';
};

export default function AdminSupportChats({
  admin,
  initialSelectedUserUid,
  onWarnUser,
  onBanUser,
}: AdminSupportChatsProps) {
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);

  // New Chat Initiation Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedTargetUser, setSelectedTargetUser] = useState<any | null>(null);
  const [initialGreeting, setInitialGreeting] = useState('Hello! This is Snapy Platform Administration reaching out to you.');
  const [startingNewChat, setStartingNewChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load and subscribe to support chats in real-time
  useEffect(() => {
    setLoadingChats(true);
    const unsubscribe = apiService.subscribeAdminSupportChats((chats) => {
      setSupportChats(chats);
      setLoadingChats(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // If initialSelectedUserUid is provided, find or select that chat
  useEffect(() => {
    if (initialSelectedUserUid && supportChats.length > 0) {
      const match = supportChats.find(
        (c) => c.userUid === initialSelectedUserUid || c.id === `admin_support_${initialSelectedUserUid}`
      );
      if (match) {
        setSelectedChat(match);
      }
    }
  }, [initialSelectedUserUid, supportChats]);

  // Subscribe to messages of the selected chat in real-time
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const unsub = apiService.subscribeMessages(selectedChat.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    return () => {
      if (unsub) unsub();
    };
  }, [selectedChat?.id]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedChat || sending) return;

    const textToSend = replyText.trim();
    setReplyText('');
    setSending(true);

    try {
      await apiService.adminSendUserMessage(selectedChat.id, textToSend, {
        name: admin.name || (admin.role === 'super' ? 'Chief Administrator' : 'Support Staff'),
        role: admin.role || 'staff',
      });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      alert('Failed to send reply: ' + (err.message || 'Unknown error'));
      setReplyText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleOpenNewChatModal = async () => {
    setShowNewChatModal(true);
    try {
      const res = await apiService.adminGetUsers();
      if (res && res.success) {
        setAllUsers(res.data || []);
      }
    } catch (e) {
      console.error('Error fetching users for new chat modal:', e);
    }
  };

  const handleStartNewChatWithUser = async () => {
    if (!selectedTargetUser || startingNewChat) return;
    setStartingNewChat(true);
    try {
      const res = await apiService.adminInitiateChatWithUser(
        selectedTargetUser.uid,
        initialGreeting.trim() || undefined,
        {
          name: admin.name || 'Platform Administrator',
          role: admin.role || 'admin',
        }
      );
      if (res && (res as any).chatId) {
        const targetChatId = (res as any).chatId;
        const existing = supportChats.find((c) => c.id === targetChatId);
        if (existing) {
          setSelectedChat(existing);
        } else {
          setSelectedChat({
            id: targetChatId,
            userUid: selectedTargetUser.uid,
            userName: selectedTargetUser.displayName,
            userEmail: selectedTargetUser.email,
            userPhotoURL: selectedTargetUser.photoURL,
            userStatus: selectedTargetUser.status,
            lastMessage: initialGreeting.trim()
              ? {
                  text: initialGreeting.trim(),
                  createdAt: new Date().toISOString(),
                  senderUid: 'admin_support',
                }
              : undefined,
            updatedAt: new Date().toISOString(),
          });
        }
        setShowNewChatModal(false);
        setSelectedTargetUser(null);
      }
    } catch (err: any) {
      alert('Failed to initiate conversation: ' + (err.message || 'Unknown error'));
    } finally {
      setStartingNewChat(false);
    }
  };

  const filteredChats = supportChats.filter((chat) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const name = (chat.userName || '').toLowerCase();
    const email = (chat.userEmail || '').toLowerCase();
    const uid = (chat.userUid || '').toLowerCase();
    const lastMsg = getLastMessageText(chat.lastMessage).toLowerCase();
    return name.includes(term) || email.includes(term) || uid.includes(term) || lastMsg.includes(term);
  });

  const filteredModalUsers = allUsers.filter((u) => {
    const term = userSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      (u.displayName && u.displayName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term))
    );
  });

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Left Column: Support Chats List */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0",
        selectedChat ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Support Tickets</h3>
                <p className="text-[11px] text-gray-400">{supportChats.length} active sessions</p>
              </div>
            </div>
            <button
              onClick={handleOpenNewChatModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/20"
              title="Message any user"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user, email or ticket..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 p-2 space-y-1">
          {loadingChats ? (
            <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
              <span>Loading user support chats...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="font-semibold text-gray-600 dark:text-gray-300">No support chats found</p>
              <p className="text-[11px]">When users click "Chat with Admin", tickets will appear here automatically in real time.</p>
              <button
                onClick={handleOpenNewChatModal}
                className="mt-3 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                + Initiate Chat with a User
              </button>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const hasUnread = (chat.unreadCountAdmin || 0) > 0;

              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 relative group",
                    isSelected 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                      : "hover:bg-white dark:hover:bg-gray-800/80 text-gray-900 dark:text-white"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm",
                      isSelected ? "bg-indigo-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    )}>
                      {chat.userPhoto ? (
                        <img src={chat.userPhoto} alt={chat.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="w-5 h-5" />
                      )}
                    </div>
                    {chat.userStatus === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-bold text-xs truncate">
                        {chat.userName || 'Community User'}
                      </p>
                      {chat.updatedAt && (
                        <span className={cn(
                          "text-[10px] shrink-0",
                          isSelected ? "text-indigo-200" : "text-gray-400"
                        )}>
                          {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>

                    <p className={cn(
                      "text-[11px] truncate leading-relaxed",
                      isSelected ? "text-indigo-100" : "text-gray-500 dark:text-gray-400"
                    )}>
                      {getLastMessageText(chat.lastMessage)}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn(
                        "text-[9px] font-mono px-1.5 py-0.2 rounded uppercase",
                        isSelected ? "bg-indigo-500/50 text-indigo-100" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                      )}>
                        UID: {chat.userUid?.slice(0, 8)}...
                      </span>
                      {hasUnread && (
                        <span className="ml-auto bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Chat Conversation Thread */}
      <div className={cn(
        "flex-1 flex flex-col bg-white dark:bg-gray-900",
        !selectedChat ? "hidden md:flex" : "flex"
      )}>
        {selectedChat ? (
          <>
            {/* Conversation Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>

                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-600">
                    {selectedChat.userPhoto ? (
                      <img src={selectedChat.userPhoto} alt={selectedChat.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="w-5 h-5" />
                    )}
                  </div>
                  {selectedChat.userStatus === 'online' && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                      {selectedChat.userName || 'Community User'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                      Support Ticket
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{selectedChat.userEmail || 'No email registered'}</span>
                    <span>•</span>
                    <span className="font-mono text-[10px] text-gray-400">UID: {selectedChat.userUid}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {onWarnUser && selectedChat.userUid && (
                  <button
                    onClick={() => onWarnUser(selectedChat.userUid, selectedChat.userName || 'User')}
                    className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                    title="Send official warning notice"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Warn</span>
                  </button>
                )}
                {onBanUser && selectedChat.userUid && (
                  <button
                    onClick={() => onBanUser(selectedChat.userUid, selectedChat.userName || 'User')}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                    title="Ban this user account"
                  >
                    <Ban className="w-4 h-4" />
                    <span className="hidden sm:inline">Ban</span>
                  </button>
                )}
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50/40 dark:bg-gray-950/40">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-gray-400 space-y-2 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-gray-700 dark:text-gray-200">Start of Support Session</p>
                  <p className="text-xs">
                    This support channel is directly connected to <strong>{selectedChat.userName}</strong>. All messages sent here are delivered instantly with official admin verification.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isAdminMsg = msg.isAdmin || msg.senderUid === 'admin_support' || msg.senderUid === admin.uid;

                  return (
                    <div
                      key={`${msg.id}-${index}`}
                      className={cn(
                        "flex flex-col max-w-[80%] space-y-1",
                        isAdminMsg ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {/* Sender label */}
                      <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold">
                        {isAdminMsg ? (
                          <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{msg.senderName || 'Admin Staff'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <UserIcon className="w-3.5 h-3.5" />
                            <span>{selectedChat.userName || 'User'}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-gray-400 font-normal">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs",
                          isAdminMsg
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-bl-none"
                        )}
                      >
                        {msg.text.startsWith('[IMG]data:image') ? (
                          <img
                            src={msg.text.replace('[IMG]', '')}
                            alt="Attachment"
                            className="max-w-xs rounded-xl"
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick response chips */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/70 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Templates:
              </span>
              {QUICK_RESPONSES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => setReplyText(tmpl)}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 whitespace-nowrap transition-colors"
                >
                  {tmpl.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Reply Input Bar */}
            <form
              onSubmit={handleSendReply}
              className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${selectedChat.userName || 'user'} as Staff...`}
                className="flex-1 px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none shrink-0"
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Select a Support Session</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Choose a conversation from the left sidebar or initiate a direct chat with any registered user to assist them in real time.
            </p>
            <button
              onClick={handleOpenNewChatModal}
              className="mt-6 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Start New Chat With User
            </button>
          </div>
        )}
      </div>

      {/* MODAL: Initiate Chat with any User */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Direct Chat with User</h3>
                    <p className="text-xs text-gray-400">Select any platform user to initiate an official staff conversation.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User search */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Select Recipient</label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, or @username..."
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
                  {filteredModalUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No users found</div>
                  ) : (
                    filteredModalUsers.map((u) => {
                      const isChosen = selectedTargetUser?.uid === u.uid;
                      return (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() => setSelectedTargetUser(u)}
                          className={cn(
                            "w-full text-left p-2.5 flex items-center justify-between gap-3 text-xs transition-colors",
                            isChosen ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold" : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                              {u.photoURL ? (
                                <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <UserIcon className="w-4 h-4" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="font-bold truncate">{u.displayName || 'Unnamed User'}</p>
                              <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          {isChosen && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Initial message */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Opening Message</label>
                <textarea
                  value={initialGreeting}
                  onChange={(e) => setInitialGreeting(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Type an opening greeting or reason for reaching out..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartNewChatWithUser}
                  disabled={!selectedTargetUser || startingNewChat}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {startingNewChat ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Start Conversation</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
