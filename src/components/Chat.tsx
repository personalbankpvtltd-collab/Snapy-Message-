import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from '../App';
import { ChatMessage, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, User as UserIcon, MoreVertical, Image as ImageIcon, Smile, Check, CheckCheck, X, Clock, Trash2, UserMinus, AlertTriangle, UserX, Download, WifiOff, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn, safeStorage, resizeImage } from '../lib/utils';
import { apiService } from '../services/api';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

export default function Chat({ chatId, onBack }: { chatId: string, onBack: () => void }) {
  const { user: authUser, profile: authProfile, refreshProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const cached = safeStorage.getItem(`snapy_msgs_${chatId}`);
    if (cached && cached !== 'undefined') {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached messages:', e);
        return [];
      }
    }
    return [];
  });
  const [otherUser, setOtherUser] = useState<UserProfile | null>(() => {
    if (chatId.startsWith('admin_support_')) {
      return {
        uid: 'admin_support',
        email: 'support@snapy.com',
        displayName: 'Snapy Admin Support',
        photoURL: 'https://i.pinimg.com/736x/c0/e7/e3/c0e7e34714b381275cabc59cf5e41c78.jpg',
        status: 'online',
      } as any;
    }
    const cached = safeStorage.getItem(`snapy_user_${chatId}`);
    if (cached && cached !== 'undefined') {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached other user:', e);
        return null;
      }
    }
    return null;
  });
  const isSupportChat = chatId.startsWith('admin_support_') || otherUser?.uid === 'admin_support';
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(messages.length === 0);
  const [pendingMessages, setPendingMessages] = useState<{id: string, text: string, createdAt: string}[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'prompt';
    onConfirm?: (value?: string) => void;
    onCancel?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });
  const [promptValue, setPromptValue] = useState('');
  const [sending, setSending] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const handleDownloadImage = (dataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    isFirstLoad.current = true;
  }, [chatId]);

  useLayoutEffect(() => {
    if (scrollRef.current && messages.length > 0 && isFirstLoad.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatId, messages.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!authUser || !chatId) return;
    fetchMessages();
    
    // Real-time Firestore message subscription (1st primary)
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = apiService.subscribeMessages?.(chatId, (liveMessages) => {
        if (liveMessages && liveMessages.length > 0) {
          setConnectionError(false);
          setMessages(liveMessages);
          safeStorage.setItem(`snapy_msgs_${chatId}`, JSON.stringify(liveMessages));
          setLoading(false);
        }
      });
    } catch (e) {
      console.warn('Real-time message subscription error:', e);
    }

    // Periodic poll for user presence and secondary sync
    const interval = setInterval(fetchMessages, 5000);
    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [chatId, authUser]);

  const isFetching = useRef(false);

  const fetchMessages = async () => {
    if (!authUser || !chatId || isFetching.current) return;
    isFetching.current = true;
    try {
      const res = await apiService.getMessages(chatId, authUser.uid);
      if (res && res.success) {
        setConnectionError(false);
        // Always update otherUser if it's returned, even if messages haven't changed
        if (res.data.otherUser) {
          setOtherUser(res.data.otherUser);
          safeStorage.setItem(`snapy_user_${chatId}`, JSON.stringify(res.data.otherUser));
        }

        // Only update if messages have changed to prevent unnecessary re-renders and scroll resets
        const newMessages = res.data.messages;
        if (JSON.stringify(newMessages) !== JSON.stringify(messages)) {
          setMessages(newMessages);
          safeStorage.setItem(`snapy_msgs_${chatId}`, JSON.stringify(newMessages));
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setConnectionError(true);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !authUser || sending) return;

    const text = newMessage.trim();
    const image = selectedImage;
    
    setSending(true);
    setNewMessage('');
    setSelectedImage(null);
    setShowEmojiPicker(false);

    const finalMessage = image ? `[IMG]${image}` : text;
    const tempId = Date.now().toString() + Math.random().toString(36).substring(7);
    
    setPendingMessages(prev => [...prev, { id: tempId, text: finalMessage, createdAt: new Date().toISOString() }]);

    try {
      await apiService.sendMessage(chatId, authUser.uid, finalMessage);
      setPendingMessages(prev => prev.filter(m => m.id !== tempId));
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setPendingMessages(prev => prev.filter(m => m.id !== tempId));
      setModalConfig({
        isOpen: true,
        title: 'Send Failed',
        message: 'Failed to send message. Please check your internet connection and ensure the Google Apps Script is correctly deployed.',
        type: 'alert',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setSending(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 400) { // 400MB limit
        setModalConfig({
          isOpen: true,
          title: 'File Too Large',
          message: 'File too large! Please choose a file under 400MB.',
          type: 'alert',
          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }
      
      try {
        // Resize to max 500x500 for chat images
        // Note: Google Sheets cell limit is 50k chars, so we compress heavily
        // 500x500 at 0.4 quality is usually around 20-35KB.
        const compressedBase64 = await resizeImage(file, 500, 500, 0.4);
        setSelectedImage(compressedBase64);
      } catch (err) {
        console.error('Error processing image:', err);
      }
    }
  };

  const handleCleanHistory = async () => {
    if (!authUser || !chatId) return;
    setModalConfig({
      isOpen: true,
      title: 'Clean Chat History',
      message: 'Are you sure you want to clean chat history? This cannot be undone.',
      type: 'confirm',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.cleanChatHistory(chatId, authUser.uid);
          setMessages([]);
          safeStorage.removeItem(`snapy_msgs_${chatId}`);
          setShowMenu(false);
        } catch (error) {
          console.error('Error cleaning history:', error);
        }
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleUnfriend = async () => {
    if (!authUser || !otherUser) return;
    setModalConfig({
      isOpen: true,
      title: 'Unfriend User',
      message: `Are you sure you want to unfriend ${otherUser.displayName}?`,
      type: 'confirm',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.unfriend(authUser.uid, otherUser.uid);
          onBack();
        } catch (error) {
          console.error('Error unfriending:', error);
        }
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleReport = async () => {
    if (!authUser || !otherUser) return;
    setPromptValue('');
    setModalConfig({
      isOpen: true,
      title: 'Report User',
      message: 'Please enter the reason for reporting this user:',
      type: 'prompt',
      onConfirm: async (reason) => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        if (!reason) return;
        try {
          const res = await apiService.reportUser(authUser.uid, otherUser.uid, reason);
          if (res && res.success) {
            setModalConfig({
              isOpen: true,
              title: 'Report Submitted',
              message: 'User reported successfully. We will review your report.',
              type: 'alert',
              onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
            setShowMenu(false);
          }
        } catch (error) {
          console.error('Error reporting user:', error);
        }
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleBlock = async () => {
    if (!authUser || !otherUser) return;
    setModalConfig({
      isOpen: true,
      title: 'Block User',
      message: `Are you sure you want to block ${otherUser.displayName}?`,
      type: 'confirm',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.blockUser(authUser.uid, otherUser.uid);
          setModalConfig({
            isOpen: true,
            title: 'User Blocked',
            message: 'User blocked successfully.',
            type: 'alert',
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
          });
          await refreshProfile();
          setShowMenu(false);
        } catch (error) {
          console.error('Error blocking user:', error);
        }
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleUnblock = async () => {
    if (!authUser || !otherUser) return;
    try {
      await apiService.unblockUser(authUser.uid, otherUser.uid);
      setModalConfig({
        isOpen: true,
        title: 'User Unblocked',
        message: 'User unblocked successfully.',
        type: 'alert',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      await refreshProfile();
      setShowMenu(false);
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  };

  const isBlockedByMe = authProfile?.blockedUsers?.includes(otherUser?.uid || '');
  const isBlockedByThem = otherUser?.blockedUsers?.includes(authUser?.uid || '');

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 150;
      
      // Always scroll to bottom on first load or if user is already near bottom
      if (isFirstLoad.current || isAtBottom) {
        // Use requestAnimationFrame to ensure the scroll happens after the DOM has updated
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
        
        if (messages.length > 0 || pendingMessages.length > 0) {
          isFirstLoad.current = false;
        }
      }
    }
  }, [messages, pendingMessages]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all">
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                {otherUser?.photoURL ? (
                  <img src={otherUser.photoURL} alt={otherUser.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    {isSupportChat ? <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <UserIcon className="w-5 h-5" />}
                  </div>
                )}
              </div>
              {otherUser?.status === 'online' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-900 dark:text-white leading-tight">
                  {otherUser?.displayName || (isSupportChat ? 'Snapy Admin Support' : 'User')}
                </h3>
                {isSupportChat && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                    <ShieldCheck className="w-3 h-3" /> Staff
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isSupportChat ? (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Official Platform Administration</p>
                ) : otherUser?.status === 'online' ? (
                  <p className="text-xs text-green-500 dark:text-green-400 font-medium">Online</p>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {otherUser?.lastSeen ? `Last seen ${formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}` : 'Offline'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              "p-2 rounded-full transition-all",
              showMenu ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
            )}
          >
            <MoreVertical className="w-6 h-6" />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50"
              >
                {isSupportChat ? (
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <ShieldCheck className="w-4 h-4" /> Official Support
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Encrypted channel direct to Snapy system admins.</p>
                  </div>
                ) : null}
                <button 
                  onClick={handleCleanHistory}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  Clean Chat History
                </button>
                {!isSupportChat && (
                  <>
                    <button 
                      onClick={handleUnfriend}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors"
                    >
                      <UserMinus className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      Unfriend User
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-2"></div>
                    <button 
                      onClick={handleReport}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      Report User
                    </button>
                    {isBlockedByMe ? (
                      <button 
                        onClick={handleUnblock}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 transition-colors"
                      >
                        <UserIcon className="w-5 h-5" />
                        Unblock User
                      </button>
                    ) : (
                      <button 
                        onClick={handleBlock}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                      >
                        <UserX className="w-5 h-5" />
                        Block User
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
      
      {connectionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 animate-pulse">
          <WifiOff className="w-4 h-4" />
          Connection lost. Retrying...
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {isSupportChat && messages.length === 0 && !loading && (
          <div className="py-8 px-4 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Snapy Admin Support</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
              Welcome to Snapy Official Support. Type your question, feedback, or account issue below and our administration team will respond directly.
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, index) => {
            const isMe = msg.senderUid === authUser?.uid;
            const showAvatar = index === 0 || messages[index - 1].senderUid !== msg.senderUid;
            
            return (
              <motion.div
                key={`${msg.id}-${index}`}
                initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={cn(
                  "flex items-end gap-2 max-w-[85%]",
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 mb-1">
                    {showAvatar && (
                      otherUser?.photoURL ? (
                        <img src={otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {!isMe && (msg.isAdmin || msg.senderUid === 'admin_support') && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pl-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{msg.senderName || 'Staff Support'}</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "px-4 py-2 rounded-2xl text-sm shadow-sm",
                      isMe 
                        ? "bg-indigo-600 text-white rounded-br-none" 
                        : (msg.isAdmin || msg.senderUid === 'admin_support')
                        ? "bg-indigo-50/90 dark:bg-indigo-950/40 text-gray-900 dark:text-white rounded-bl-none border border-indigo-200 dark:border-indigo-800 shadow-xs"
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700"
                    )}
                  >
                    {msg.text.startsWith('[IMG]data:image') ? (
                      <div className="relative group inline-block">
                        <img 
                          src={msg.text.replace('[IMG]', '')} 
                          alt="Shared" 
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setViewingImage(msg.text.replace('[IMG]', ''))}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadImage(msg.text.replace('[IMG]', ''), `snapy-image-${msg.id}.png`);
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 shadow-sm"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5",
                    isMe ? "justify-end" : "justify-start"
                  )}>
                    {msg.createdAt && (
                      <span title={new Date(msg.createdAt).toLocaleString()}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {isMe && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-indigo-400 dark:text-indigo-500 uppercase">sent</span>
                        {msg.read ? <CheckCheck className="w-3 h-3 text-indigo-400 dark:text-indigo-500" /> : <Check className="w-3 h-3" />}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Pending Messages */}
          {pendingMessages.map((msg, index) => (
            <motion.div
              key={`pending-${msg.id}-${index}`}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              className="flex items-end gap-2 max-w-[85%] ml-auto flex-row-reverse"
            >
              <div className="flex flex-col gap-1">
                <div className="px-4 py-2 rounded-2xl text-sm shadow-sm bg-indigo-400 dark:bg-indigo-500 text-white rounded-br-none opacity-70">
                  {msg.text.startsWith('[IMG]data:image') ? (
                    <img 
                      src={msg.text.replace('[IMG]', '')} 
                      alt="Sending" 
                      className="max-w-full rounded-lg"
                    />
                  ) : (
                    msg.text
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 justify-end">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase animate-pulse">sending...</span>
                  <Clock className="w-3 h-3 animate-spin" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 relative transition-colors">
        {isBlockedByMe ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 mb-2">You have blocked this user.</p>
            <button 
              onClick={handleUnblock}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Unblock to send messages
            </button>
          </div>
        ) : isBlockedByThem ? (
          <div className="text-center py-4">
            <p className="text-red-500 dark:text-red-400 font-medium">You have been blocked by this user.</p>
          </div>
        ) : (
          <>
            {selectedImage && (
              <div className="mb-4 relative inline-block">
                <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-gray-200 dark:border-gray-600" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-full left-4 z-50 mb-2 shadow-2xl rounded-2xl overflow-hidden">
                <EmojiPicker 
                  onEmojiClick={onEmojiClick} 
                  theme={Theme.AUTO}
                  width={300}
                  height={400}
                />
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "p-2 transition-all rounded-full active:scale-90",
                  showEmojiPicker ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Smile className="w-6 h-6" />
              </button>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all active:scale-90"
              >
                <ImageIcon className="w-6 h-6" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={(!newMessage.trim() && !selectedImage) || sending}
                className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all active:scale-90 disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20"
              >
                <Send className={cn("w-5 h-5", sending && "animate-pulse")} />
              </button>
            </form>
          </>
        )}
      </div>

      {/* Custom Modal */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{modalConfig.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{modalConfig.message}</p>
              
              {modalConfig.type === 'prompt' && (
                <input
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  className="w-full px-4 py-3 mb-6 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Enter reason..."
                  autoFocus
                />
              )}

              <div className="flex justify-end gap-3">
                {modalConfig.type !== 'alert' && (
                  <button
                    onClick={modalConfig.onCancel}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => modalConfig.onConfirm?.(modalConfig.type === 'prompt' ? promptValue : undefined)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                >
                  {modalConfig.type === 'alert' ? 'OK' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {viewingImage && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setViewingImage(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewingImage(null)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <img 
                src={viewingImage} 
                alt="Full size" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
              <button
                onClick={() => handleDownloadImage(viewingImage, `snapy-image-${Date.now()}.png`)}
                className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center gap-2 transition-colors backdrop-blur-md"
              >
                <Download className="w-5 h-5" />
                Download Image
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
