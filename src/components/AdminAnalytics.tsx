import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, MessageSquare, Shield, AlertTriangle, Activity, 
  Database, RefreshCw, Download, Radio, Send, CheckCircle, 
  Clock, ShieldAlert, Sparkles, Server, HardDrive, Check,
  ChevronRight, AlertCircle, Bell, ArrowUpRight, TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell 
} from 'recharts';
import { apiService } from '../services/api';
import { sheetsBackupService } from '../services/sheetsBackup';
import { cn } from '../lib/utils';

interface AnalyticsData {
  metrics: {
    totalUsers: number;
    onlineUsers: number;
    bannedUsers: number;
    reportedUsers: number;
    totalMessages: number;
    totalChats: number;
    totalFriendRequests: number;
    acceptedFriendships: number;
    pendingFriendRequests: number;
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    avgMessagesPerUser: string;
  };
  timeline: { date: string; users: number; messages: number }[];
  userStatusDistribution: { name: string; value: number; color: string }[];
  recentUsers: any[];
  recentReports: any[];
  storageOverview: {
    primaryDatabase: string;
    primaryLatency: string;
    backupDatabase: string;
    backupStatus: string;
    counts: {
      users: number;
      messages: number;
      chats: number;
      friendRequests: number;
      reports: number;
    };
  };
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('14d');
  const [data, setData] = useState<AnalyticsData | null>(null);

  // System Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceType, setAnnounceType] = useState<'info' | 'warning' | 'alert' | 'success'>('info');
  const [announceLoading, setAnnounceLoading] = useState(false);

  // Backup Ping test state
  const [backupTesting, setBackupTesting] = useState(false);
  const [backupResult, setBackupResult] = useState<{ status: string; latency?: number } | null>(null);
  const [queueCount, setQueueCount] = useState<number>(sheetsBackupService.getStatus().pendingCount);

  useEffect(() => {
    fetchAnalytics();
    fetchAnnouncements();

    const unsubscribe = sheetsBackupService.subscribeStatus((status) => {
      setQueueCount(status.pendingCount);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchAnalytics = async () => {
    setRefreshing(true);
    try {
      const res = await apiService.adminGetAnalytics();
      if (res && res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await apiService.getSystemAnnouncements();
      if (res && res.success) {
        setAnnouncements(res.data);
      }
    } catch (e) {
      console.warn('Error fetching announcements:', e);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle.trim() || !announceMessage.trim()) return;

    setAnnounceLoading(true);
    try {
      await apiService.saveSystemAnnouncement({
        title: announceTitle.trim(),
        message: announceMessage.trim(),
        type: announceType,
        active: true,
      });
      setAnnounceTitle('');
      setAnnounceMessage('');
      setShowAnnounceModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      alert('Failed to save announcement: ' + (err.message || 'Unknown error'));
    } finally {
      setAnnounceLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast announcement?')) return;
    try {
      await apiService.deleteSystemAnnouncement(id);
      fetchAnnouncements();
    } catch (e: any) {
      alert('Error deleting announcement');
    }
  };

  const handleToggleAnnouncement = async (item: any) => {
    try {
      await apiService.saveSystemAnnouncement({
        ...item,
        active: !item.active,
      });
      fetchAnnouncements();
    } catch (e) {
      alert('Error updating announcement status');
    }
  };

  const handleTestBackup = async () => {
    setBackupTesting(true);
    const start = performance.now();
    try {
      const res = await apiService.testConnection();
      const end = performance.now();
      setBackupResult({
        status: res?.status === 'success' || res?.success ? 'Connected' : 'Replied with error',
        latency: Math.round(end - start),
      });
    } catch (err: any) {
      setBackupResult({ status: 'Failed: ' + err.message });
    } finally {
      setBackupTesting(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', data.metrics.totalUsers],
      ['Online Users', data.metrics.onlineUsers],
      ['Banned Users', data.metrics.bannedUsers],
      ['Reported Users', data.metrics.reportedUsers],
      ['Total Messages', data.metrics.totalMessages],
      ['Total Chats', data.metrics.totalChats],
      ['Total Friend Requests', data.metrics.totalFriendRequests],
      ['Accepted Friendships', data.metrics.acceptedFriendships],
      ['Average Messages/User', data.metrics.avgMessagesPerUser],
      ['Exported At', new Date().toISOString()],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `snapy_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snapy_analytics_dump_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Aggregating real-time platform analytics...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalUsers: 0,
    onlineUsers: 0,
    bannedUsers: 0,
    reportedUsers: 0,
    totalMessages: 0,
    totalChats: 0,
    totalFriendRequests: 0,
    acceptedFriendships: 0,
    pendingFriendRequests: 0,
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    avgMessagesPerUser: '0',
  };

  const timeline = data?.timeline || [];
  const statusData = data?.userStatusDistribution || [];

  return (
    <div className="space-y-8">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Platform Analytics</h2>
            <span className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Firebase Primary Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time synchronization across users, chats, moderation, and backup nodes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh */}
          <button
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>

          {/* New Announcement */}
          <button
            onClick={() => setShowAnnounceModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            <Bell className="w-3.5 h-3.5" />
            Broadcast Alert
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 border border-gray-200 dark:border-gray-700">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
              title="Download CSV report"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700" />
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
              title="Download JSON dump"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Users */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalUsers.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {metrics.onlineUsers} online now
          </div>
        </motion.div>

        {/* Total Messages */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Messages Sent</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalMessages.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
            ~{metrics.avgMessagesPerUser} msgs / user
          </div>
        </motion.div>

        {/* Active Chats */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Chats</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalChats.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Direct messaging threads</span>
          </div>
        </motion.div>

        {/* Friend Connections */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Friendships</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.acceptedFriendships.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 font-medium">
            <span>{metrics.pendingFriendRequests} pending requests</span>
          </div>
        </motion.div>

        {/* Moderation & Reports */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Flagged & Reports</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.pendingReports}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="text-red-500 font-medium">{metrics.bannedUsers} banned</span>
            <span>• {metrics.resolvedReports} resolved</span>
          </div>
        </motion.div>

        {/* Dual-Storage Mirror */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Backup Queue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {queueCount === 0 ? 'Synced' : `${queueCount} Q'd`}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Sheets mirror status: OK</span>
          </div>
        </motion.div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Growth Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Growth & Activity Trends</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Daily user signups vs. direct messages volume over time
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-600" />
                <span className="text-gray-600 dark:text-gray-300 font-medium">New Users</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-300 font-medium">Messages</span>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' 
                  }} 
                />
                <Area type="monotone" dataKey="users" name="New Users" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#userGrad)" />
                <Area type="monotone" dataKey="messages" name="Messages" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#msgGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Status Donut Chart (1 col) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">User Status Breakdown</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Real-time user engagement distribution
            </p>

            <div className="h-[190px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      borderRadius: '8px', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: '11px' 
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {metrics.totalUsers}
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                  Total Users
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-400">{item.value} users</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Section: System Broadcast Announcements & Backup Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Announcements Manager */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600" />
                Live Broadcast Announcements
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Send urgent system notices and alert banners directly to all logged-in users
              </p>
            </div>
            <button
              onClick={() => setShowAnnounceModal(true)}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              + New Alert
            </button>
          </div>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
                No active broadcast announcements. Click "+ New Alert" to broadcast maintenance or welcome news.
              </div>
            ) : (
              announcements.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        item.type === 'alert' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        item.type === 'warning' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        item.type === 'success' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                        item.type === 'info' && "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                      )}>
                        {item.type}
                      </span>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</h4>
                      {item.active ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">
                          Live Active
                        </span>
                      ) : (
                        <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{item.message}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleAnnouncement(item)}
                      className={cn(
                        "px-2 py-1 text-[11px] font-bold rounded-lg transition-colors",
                        item.active 
                          ? "bg-amber-50 text-amber-600 hover:bg-amber-100" 
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      )}
                    >
                      {item.active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 text-xs"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Secondary Sheets Backup Health & Diagnostics */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  Dual-Storage Architecture Health
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Real-time synchronization between Primary (Firebase) and Secondary (Google Sheets)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Primary Engine Card */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    1st
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Firebase Firestore (Primary)</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Instant real-time web socket latency &lt; 15ms</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              </div>

              {/* Secondary Backup Card */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    2nd
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Google Sheets (Secondary Backup)</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Asynchronous queue mirror • {queueCount} pending writes
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>

              {/* Backup Test result */}
              {backupResult && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Ping Result:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {backupResult.status} {backupResult.latency ? `(${backupResult.latency}ms)` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-400">Target Applet: ai-studio-snapymessage</span>
            <button
              onClick={handleTestBackup}
              disabled={backupTesting}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', backupTesting && 'animate-spin')} />
              {backupTesting ? 'Pinging Sheets...' : 'Ping Backup Node'}
            </button>
          </div>
        </div>
      </div>

      {/* New Announcement Modal */}
      <AnimatePresence>
        {showAnnounceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Broadcast System Announcement</h3>
                </div>
                <button
                  onClick={() => setShowAnnounceModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Announcement Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'info', label: 'Info', color: 'border-indigo-500 text-indigo-600' },
                      { id: 'warning', label: 'Warning', color: 'border-amber-500 text-amber-600' },
                      { id: 'alert', label: 'Alert', color: 'border-red-500 text-red-600' },
                      { id: 'success', label: 'Update', color: 'border-emerald-500 text-emerald-600' },
                    ].map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setAnnounceType(t.id as any)}
                        className={cn(
                          "py-2 text-xs font-bold rounded-xl border transition-all text-center",
                          announceType === t.id
                            ? `${t.color} bg-indigo-50/50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20`
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Headline / Title
                  </label>
                  <input
                    type="text"
                    value={announceTitle}
                    onChange={(e) => setAnnounceTitle(e.target.value)}
                    placeholder="e.g. Scheduled Server Maintenance at 12:00 AM UTC"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Announcement Message
                  </label>
                  <textarea
                    value={announceMessage}
                    onChange={(e) => setAnnounceMessage(e.target.value)}
                    placeholder="Provide details about the update, new feature, or alert..."
                    rows={3}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowAnnounceModal(false)}
                    className="px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={announceLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {announceLoading ? 'Publishing...' : 'Publish Announcement'}
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
