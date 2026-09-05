import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Users, AlertTriangle, Ban, CheckCircle, Trash2, 
  MessageSquare, UserPlus, LogOut, Search, ShieldAlert,
  Clock, ShieldCheck, User as UserIcon, ArrowLeft,
  Activity, BarChart3, Filter, Download, Sparkles, KeyRound
} from 'lucide-react';
import { apiService } from '../services/api';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import AdminAnalytics from './AdminAnalytics';
import AdminSupportChats from './AdminSupportChats';

interface AdminUser {
  uid: string;
  email: string;
  role: 'super' | 'admin' | 'staff' | 'moderator';
  name?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('snapy_admin');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'analytics' | 'chats' | 'users' | 'reports' | 'admins'>('analytics');
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [supportChatsCount, setSupportChatsCount] = useState(0);
  const [selectedChatUserUid, setSelectedChatUserUid] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'online' | 'banned' | 'reported'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [warningModal, setWarningModal] = useState<{ uid: string, name: string } | null>(null);
  const [warningText, setWarningText] = useState('');
  const [banModal, setBanModal] = useState<{ uid: string, name: string } | null>(null);
  const [banDays, setBanDays] = useState<number>(1);
  const [addAdminModal, setAddAdminModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ 
    name: '',
    email: '', 
    password: '', 
    role: 'staff' as 'super' | 'admin' | 'staff' | 'moderator',
    title: 'Customer Support Specialist'
  });

  useEffect(() => {
    if (admin) {
      fetchData();
    }
  }, [admin, activeTab]);

  // Subscribe to support chats count in real time
  useEffect(() => {
    if (!admin) return;
    const unsub = apiService.subscribeAdminSupportChats?.((chats) => {
      setSupportChatsCount(chats.length);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [admin]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'users' || activeTab === 'analytics') {
        const res = await apiService.adminGetUsers();
        if (res && res.success) setUsers(res.data || []);
      }
      if (activeTab === 'reports' || activeTab === 'analytics') {
        const res = await apiService.adminGetReports();
        if (res && res.success) setReports(res.data || []);
      }
      if (activeTab === 'admins') {
        const res = await apiService.adminGetStaff();
        if (res && res.success) setAdmins(res.data || []);
      }
      if (activeTab === 'chats') {
        const res = await apiService.adminGetSupportChats();
        if (res && res.success) setSupportChatsCount(res.data?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.adminLogin({ email, password });
      if (res.success) {
        setAdmin(res.data);
        localStorage.setItem('snapy_admin', JSON.stringify(res.data));
      } else {
        setError(res.message || 'Invalid admin credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAdmin(null);
    localStorage.removeItem('snapy_admin');
  };

  const handleBan = async (uid: string, days: number) => {
    try {
      const res = await apiService.adminBanUser(uid, days);
      if (res.success) {
        fetchData();
        setBanModal(null);
      }
    } catch (err) {
      alert('Error banning user');
    }
  };

  const handleUnban = async (uid: string) => {
    try {
      const res = await apiService.adminUnbanUser(uid);
      if (res.success) fetchData();
    } catch (err) {
      alert('Error unbanning user');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await apiService.adminDeleteReport(reportId);
      if (res.success) fetchData();
    } catch (err) {
      alert('Error deleting report');
    }
  };

  const handleSendWarning = async () => {
    if (!warningModal || !warningText.trim()) return;
    try {
      const res = await apiService.adminSendWarning(warningModal.uid, warningText);
      if (res.success) {
        setWarningModal(null);
        setWarningText('');
        alert('Warning sent successfully');
      }
    } catch (err) {
      alert('Error sending warning');
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.adminAddStaff(newStaff);
      if (res.success) {
        setAddAdminModal(false);
        setNewStaff({ 
          name: '', 
          email: '', 
          password: '', 
          role: 'staff', 
          title: 'Customer Support Specialist' 
        });
        fetchData();
      } else {
        alert((res as any)?.message || 'Failed to create staff account');
      }
    } catch (err: any) {
      alert('Error adding staff: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteStaff = async (uid: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      const res = await apiService.adminDeleteStaff(uid);
      if (res && res.success) {
        fetchData();
      } else {
        alert((res as any)?.message || 'Failed to remove staff');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting staff');
    }
  };

  const handleInitiateChatWithUser = (userUid: string) => {
    setSelectedChatUserUid(userUid);
    setActiveTab('chats');
  };

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-8 relative"
        >
          <button 
            onClick={() => navigate('/')}
            className="absolute top-6 left-6 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
            <p className="text-gray-500 dark:text-gray-400">Authorized Personnel Only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="admin@snapy.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Login to Dashboard'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (u.displayName && u.displayName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (userFilter === 'online') {
      return u.status === 'online';
    }
    if (userFilter === 'banned') {
      return (
        u.isPermanentlyBanned ||
        (u.banExpires && new Date(u.banExpires) > new Date()) ||
        (u.banUntil && new Date(u.banUntil) > new Date())
      );
    }
    if (userFilter === 'reported') {
      return u.reportCount && u.reportCount > 0;
    }
    return true;
  });

  const handleExportUsersCSV = () => {
    if (users.length === 0) return;
    const headers = ['UID', 'DisplayName', 'Email', 'Username', 'Status', 'Reports', 'JoinedDate'];
    const rows = filteredUsers.map((u) => [
      u.uid || '',
      `"${(u.displayName || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      u.isPermanentlyBanned ? 'Permanent Ban' : u.status || 'offline',
      u.reportCount || 0,
      u.createdAt || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `snapy_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-gray-900 dark:text-white">Snapy Admin</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Live DB
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{admin.role} Access</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Refresh current data"
          >
            <Clock className={cn("w-5 h-5", refreshing && "animate-spin")} />
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 hidden md:flex flex-col p-4 gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm",
              activeTab === 'analytics' 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <Activity className="w-5 h-5" />
            Analytics
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button 
            onClick={() => setActiveTab('chats')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm",
              activeTab === 'chats' 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <MessageSquare className="w-5 h-5" />
            Support Chats
            {supportChatsCount > 0 && (
              <span className="ml-auto bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {supportChatsCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm",
              activeTab === 'users' 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <Users className="w-5 h-5" />
            Users
            <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
              {users.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm",
              activeTab === 'reports' 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <AlertTriangle className="w-5 h-5" />
            Reports
            {reports.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {reports.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('admins')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm",
              activeTab === 'admins' 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <ShieldCheck className="w-5 h-5" />
            Staff & Admins
            <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
              {admins.length}
            </span>
          </button>

          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 space-y-1">
            <p>Database: <span className="text-emerald-500 font-semibold">Firebase (1st)</span></p>
            <p>Backup: <span className="text-indigo-500 font-semibold">Sheets (2nd)</span></p>
          </div>
        </aside>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'analytics' ? "bg-indigo-600 text-white" : "text-gray-500"
            )}
          >
            <Activity className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'chats' ? "bg-indigo-600 text-white" : "text-gray-500"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Support ({supportChatsCount})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'users' ? "bg-indigo-600 text-white" : "text-gray-500"
            )}
          >
            <Users className="w-4 h-4" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'reports' ? "bg-indigo-600 text-white" : "text-gray-500"
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'admins' ? "bg-indigo-600 text-white" : "text-gray-500"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Staff
          </button>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* TAB 1: ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && <AdminAnalytics />}

          {/* TAB 2: SUPPORT CHATS */}
          {activeTab === 'chats' && (
            <AdminSupportChats
              admin={admin}
              initialSelectedUserUid={selectedChatUserUid}
              onWarnUser={(uid, name) => setWarningModal({ uid, name })}
              onBanUser={(uid, name) => setBanModal({ uid, name })}
            />
          )}

          {/* TAB 2: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Filter and Search Bar */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search users, email, @username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter chips */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'online', label: 'Online' },
                      { id: 'banned', label: 'Banned' },
                      { id: 'reported', label: 'Reported' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setUserFilter(f.id as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          userFilter === f.id 
                            ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-xs" 
                            : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* CSV Export */}
                  <button
                    onClick={handleExportUsersCSV}
                    className="px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Reports</th>
                        <th className="px-6 py-4">Joined</th>
                        <th className="px-6 py-4 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredUsers.map((user, index) => {
                        const isBanned =
                          user.isPermanentlyBanned ||
                          (user.banExpires && new Date(user.banExpires) > new Date()) ||
                          (user.banUntil && new Date(user.banUntil) > new Date());
                        const isOnline = user.status === 'online';

                        return (
                          <tr key={`${user.uid}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                                  {user.photoURL ? (
                                    <img src={user.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <UserIcon className="w-5 h-5" />
                                    </div>
                                  )}
                                  {isOnline && (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    {user.displayName || 'Unnamed User'}
                                    {user.adminWarning && (
                                      <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.2 rounded font-bold" title={user.adminWarning.message}>
                                        Warned
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                                  {user.username && <div className="text-[10px] text-indigo-500 font-mono">@{user.username}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {user.isPermanentlyBanned ? (
                                <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full uppercase">
                                  Permanent Ban
                                </span>
                              ) : user.banUntil && new Date(user.banUntil) > new Date() ? (
                                <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-bold rounded-full uppercase">
                                  Banned until {new Date(user.banUntil).toLocaleDateString()}
                                </span>
                              ) : isOnline ? (
                                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Online
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-full uppercase">
                                  Offline
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "font-bold text-sm",
                                (user.reportCount || 0) > 3 ? "text-red-500" : (user.reportCount || 0) > 0 ? "text-amber-500" : "text-gray-400"
                              )}>
                                {user.reportCount || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => handleInitiateChatWithUser(user.uid)}
                                  className="px-2.5 py-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors flex items-center gap-1" 
                                  title="Open Direct Chat with User"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Chat</span>
                                </button>
                                <button 
                                  onClick={() => setWarningModal({ uid: user.uid, name: user.displayName })}
                                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" 
                                  title="Send Warning Message"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                                {isBanned ? (
                                  <button 
                                    onClick={() => handleUnban(user.uid)}
                                    className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" 
                                    title="Unban Account"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => setBanModal({ uid: user.uid, name: user.displayName })}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" 
                                    title="Ban Account"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-gray-400 text-sm">
                      No users match the search and filter criteria.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REPORTS MODERATION */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Content Moderation & Reports</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Review user complaints, suspicious activity, and enforce platform guidelines.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-full">
                  {reports.length} Reports Logged
                </span>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Reporter</th>
                        <th className="px-6 py-4">Reported User</th>
                        <th className="px-6 py-4">Reason / Complaint</th>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {reports.map((report, index) => (
                        <tr key={`${report.id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {report.reporterName || report.reporterUser?.displayName || 'Anonymous'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-red-500">
                              {report.reportedName || report.reportedUser?.displayName || report.reportedUid}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                            <div className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50 text-xs">
                              {report.reason}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                            {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {report.reportedUid && (
                                <button
                                  onClick={() => setBanModal({ uid: report.reportedUid, name: report.reportedName || 'User' })}
                                  className="px-2.5 py-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors"
                                  title="Ban Reported User"
                                >
                                  Ban
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteReport(report.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Dismiss / Resolve Report"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reports.length === 0 && (
                    <div className="p-16 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                      <span>All clear! No pending user reports require moderation.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STAFF & ADMIN MANAGEMENT */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Staff & Admin Team</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Authorize and manage support agents, community moderators, and system operators.
                  </p>
                </div>
                <button 
                  onClick={() => setAddAdminModal(true)}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  Add New Staff
                </button>
              </div>

              {/* Staff Overview Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-400 font-bold uppercase">Total Team</p>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{admins.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-purple-500 font-bold uppercase">Super Admins</p>
                  <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                    {admins.filter(a => a.role === 'super').length}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-emerald-500 font-bold uppercase">Support Staff</p>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {admins.filter(a => a.role === 'staff').length}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-blue-500 font-bold uppercase">Admins & Mods</p>
                  <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                    {admins.filter(a => a.role === 'admin' || a.role === 'moderator').length}
                  </p>
                </div>
              </div>

              {/* Staff Table */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Staff Member</th>
                        <th className="px-6 py-4">Department / Title</th>
                        <th className="px-6 py-4">System Role</th>
                        <th className="px-6 py-4">Access Password</th>
                        <th className="px-6 py-4">Added On</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {admins.map((adm, index) => {
                        const isRoot = adm.uid === 'admin_root' || adm.email === 'admin@snapy.com';
                        const roleColor = {
                          super: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
                          admin: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                          staff: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                          moderator: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                        }[adm.role as string] || "bg-gray-100 text-gray-600";

                        return (
                          <tr key={`${adm.uid}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                  <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white text-sm">
                                    {adm.name || 'Platform Staff'}
                                  </p>
                                  <p className="text-xs text-gray-400 font-mono">{adm.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
                              {adm.title || 'Support Specialist'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase",
                                roleColor
                              )}>
                                {adm.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                              {adm.password || '••••••••'}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500">
                              {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'Active'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {!isRoot ? (
                                <button
                                  onClick={() => handleDeleteStaff(adm.uid)}
                                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Remove Staff Access"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                                  Root Master
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {warningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Send Warning</h2>
              <p className="text-sm text-gray-500 mb-6">To: <span className="font-bold text-indigo-600">{warningModal.name}</span></p>
              <textarea 
                value={warningText}
                onChange={(e) => setWarningText(e.target.value)}
                placeholder="Type your warning message here..."
                className="w-full h-32 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-6 resize-none"
              />
              <div className="flex gap-3">
                <button onClick={() => setWarningModal(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">Cancel</button>
                <button onClick={handleSendWarning} className="flex-1 py-3 font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">Send Warning</button>
              </div>
            </motion.div>
          </div>
        )}

        {banModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Ban User</h2>
              <p className="text-sm text-gray-500 mb-6">User: <span className="font-bold text-red-500">{banModal.name}</span></p>
              
              <div className="space-y-3 mb-8">
                <button 
                  onClick={() => setBanDays(1)}
                  className={cn("w-full py-3 rounded-xl border font-bold transition-all", banDays === 1 ? "bg-orange-50 border-orange-200 text-orange-600" : "border-gray-100 text-gray-500")}
                >1 Day Ban</button>
                <button 
                  onClick={() => setBanDays(7)}
                  className={cn("w-full py-3 rounded-xl border font-bold transition-all", banDays === 7 ? "bg-orange-50 border-orange-200 text-orange-600" : "border-gray-100 text-gray-500")}
                >7 Days Ban</button>
                <button 
                  onClick={() => setBanDays(30)}
                  className={cn("w-full py-3 rounded-xl border font-bold transition-all", banDays === 30 ? "bg-orange-50 border-orange-200 text-orange-600" : "border-gray-100 text-gray-500")}
                >30 Days Ban</button>
                {admin.role?.toLowerCase().includes('super') && (
                  <button 
                    onClick={() => setBanDays(-1)}
                    className={cn("w-full py-3 rounded-xl border font-bold transition-all", banDays === -1 ? "bg-red-50 border-red-200 text-red-600" : "border-gray-100 text-gray-500")}
                  >Permanent Ban</button>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setBanModal(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">Cancel</button>
                <button onClick={() => handleBan(banModal.uid, banDays)} className="flex-1 py-3 font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20">Confirm Ban</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ADD NEW STAFF MODAL */}
        {addAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-7 shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Staff Member</h2>
                  <p className="text-xs text-gray-400">Create access credentials for moderation or support.</p>
                </div>
              </div>

              <form onSubmit={handleAddStaffSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Full Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Staff Email</label>
                  <input 
                    type="email"
                    required
                    placeholder="sarah@support.snapy.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Login Password</label>
                  <input 
                    type="text"
                    required
                    placeholder="Secure password..."
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Job Title / Department</label>
                  <input 
                    type="text"
                    placeholder="e.g. Senior Support Agent, Trust & Safety"
                    value={newStaff.title}
                    onChange={(e) => setNewStaff({...newStaff, title: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">System Role & Permissions</label>
                  <select 
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value as any})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="staff">Support Staff (Chat Support & User Assistance)</option>
                    <option value="moderator">Community Moderator (Content Reports & Bans)</option>
                    <option value="admin">Operations Admin (Full Moderation & Tools)</option>
                    {admin.role?.toLowerCase().includes('super') && (
                      <option value="super">Super Admin (Root System Privileges)</option>
                    )}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setAddAdminModal(false)} 
                    className="flex-1 py-2.5 font-bold text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2.5 font-bold text-xs bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
