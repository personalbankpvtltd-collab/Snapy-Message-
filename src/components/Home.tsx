import React, { useEffect, useState, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useInView, useSpring, useTransform } from 'motion/react';
import { MessageSquare, Shield, Zap, Globe, Download, ArrowRight, CheckCircle2, Lock, Users } from 'lucide-react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import { useAuth } from '../App';
import { apiService } from '../services/api';

function CountUp({ value, suffix = "" }: { value: number | string, suffix?: string }) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
  const isDecimal = typeof value === 'string' && value.includes('.');
  
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: 2000,
  });

  const displayValue = useTransform(springValue, (latest) => {
    if (isDecimal) return latest.toFixed(1);
    return Math.floor(latest).toLocaleString();
  });

  const [current, setCurrent] = useState("0");

  useEffect(() => {
    if (isInView) {
      springValue.set(numericValue);
    }
  }, [isInView, numericValue, springValue]);

  useEffect(() => {
    return displayValue.on("change", (latest) => {
      setCurrent(latest);
    });
  }, [displayValue]);

  return <span ref={ref}>{current}{suffix}</span>;
}

export default function Home() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({
    usersCount: 0,
    messagesCount: 0,
    countriesCount: 0,
    uptime: "100"
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiService.getAppStats();
        if (response && response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                New: Version 2.0 is now live
              </div>
              
              <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-gray-900 dark:text-white leading-[1.1] lg:leading-[1.05] mb-8 tracking-tight">
                Messaging for the <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Next Generation.</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
                Snapy Message combines military-grade security with a beautiful, intuitive interface. Experience privacy without compromise.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link to="/signup" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/40 group active:scale-95">
                  Get Started Free
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/features" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white px-10 py-5 rounded-2xl font-bold text-xl hover:border-indigo-600 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95">
                  Explore Features
                </Link>
              </div>

              <div className="mt-16 flex flex-col items-center gap-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <img 
                      key={i}
                      src={`https://picsum.photos/seed/avatar${i}/100/100`} 
                      className="w-12 h-12 rounded-full border-4 border-white dark:border-gray-950 shadow-lg" 
                      alt="User"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    ))}
                  </div>
                  <p className="font-medium">Trusted by <span className="text-gray-900 dark:text-white font-bold"><CountUp value={stats.usersCount} />+</span> happy users</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900/30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">Everything you need to <br /> stay connected.</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">We've built the most comprehensive set of features for the modern communicator.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
            {/* Large Card */}
            <div className="md:col-span-2 md:row-span-2 bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
              <div className="relative z-10">
                <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/30 w-16 h-16 flex items-center justify-center rounded-2xl text-indigo-600 dark:text-indigo-400">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Uncompromising Security</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md">Our end-to-end encryption ensures that only you and the person you're communicating with can read what is sent.</p>
              </div>
              <div className="absolute bottom-[-20%] right-[-10%] w-2/3 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
                <Lock className="w-full h-full text-indigo-600" />
              </div>
            </div>

            {/* Small Card 1 */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-xl hover:shadow-indigo-200 dark:hover:shadow-indigo-900/40 transition-all flex flex-col justify-between group">
              <Zap className="w-10 h-10 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-xl font-bold mb-2">Instant Delivery</h3>
                <p className="text-indigo-100 text-sm">Messages delivered in milliseconds across the globe.</p>
              </div>
            </div>

            {/* Small Card 2 */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group">
              <Globe className="w-10 h-10 text-blue-500 group-hover:rotate-12 transition-transform" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Global Network</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Optimized servers in 40+ regions for zero lag.</p>
              </div>
            </div>

            {/* Medium Card */}
            <div className="md:col-span-3 bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Find Your People</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400">Our intuitive friend discovery system makes it easy to connect with the people who matter most to you.</p>
                <Link to="/signup" className="mt-8 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:gap-4 transition-all">
                  Try it now <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex -space-x-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-20 h-20 rounded-3xl border-4 border-white dark:border-gray-950 overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform">
                      <img src={`https://picsum.photos/seed/friend${i}/200/200`} className="w-full h-full object-cover" alt="Friend" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: "Active Users", value: stats.usersCount, suffix: "+" },
              { label: "Messages Sent", value: stats.messagesCount, suffix: "+" },
              { label: "Countries", value: stats.countriesCount, suffix: "+" },
              { label: "Uptime", value: stats.uptime, suffix: "%" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl lg:text-5xl font-black text-indigo-600 dark:text-indigo-400 mb-2">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-gray-900 dark:bg-white rounded-[4rem] p-12 lg:p-24 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500 rounded-full blur-[120px]"></div>
          </div>
          
          <h2 className="text-5xl lg:text-7xl font-black text-white dark:text-gray-900 mb-8 relative z-10 tracking-tight">Ready to switch to <br /> Snapy?</h2>
          <p className="text-xl text-gray-400 dark:text-gray-500 mb-12 max-w-2xl mx-auto relative z-10">
            Join thousands of users who have already made the switch to the most secure and intuitive messaging platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10">
            <Link to="/signup" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-12 py-5 rounded-2xl font-bold text-xl hover:scale-105 transition-all shadow-2xl active:scale-95">
              Create Free Account
            </Link>
            <a 
              href="https://sites.google.com/view/snapy-massage-apk-download/download" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 px-12 py-5 rounded-2xl font-bold text-xl hover:scale-105 transition-all active:scale-95"
            >
              Download APK
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
