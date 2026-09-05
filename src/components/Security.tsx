import React from 'react';
import { motion } from 'motion/react';
import { Shield, CheckCircle2, Lock, EyeOff, Server, AlertTriangle } from 'lucide-react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function Security() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors">
      <PublicNavbar />
      
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/30 rounded-full mb-6">
                <Shield className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">Enterprise-Grade <span className="text-green-600 dark:text-green-400">Security</span></h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                We believe your conversations belong to you. That's why we've built Snapy Message from the ground up with privacy and security as our core principles.
              </p>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 leading-tight">How we protect your data</h2>
              <div className="space-y-8">
                {[
                  { 
                    icon: <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
                    title: "Secure Authentication", 
                    desc: "Your account is protected by robust authentication mechanisms ensuring only you can access your profile." 
                  },
                  { 
                    icon: <EyeOff className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
                    title: "No Data Tracking", 
                    desc: "We don't sell your data, track your conversations for advertising, or share your personal information with third parties." 
                  },
                  { 
                    icon: <Server className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
                    title: "Protected Infrastructure", 
                    desc: "Our backend is built on secure cloud infrastructure with multi-layer defenses against unauthorized access." 
                  },
                  { 
                    icon: <AlertTriangle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
                    title: "Community Moderation", 
                    desc: "Built-in reporting and blocking tools empower you to maintain a safe environment. Abusive accounts are swiftly banned." 
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="mt-1 bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl h-fit">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.title}</h4>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-green-400 to-emerald-600 rounded-[3rem] p-8 shadow-2xl">
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 shadow-inner transition-colors">
                  <div className="flex items-center gap-4 mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
                    <Shield className="w-10 h-10 text-green-500 dark:text-green-400" />
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Security Status</h3>
                      <p className="text-green-600 dark:text-green-400 font-medium text-sm">All systems secure</p>
                    </div>
                  </div>
                  <ul className="space-y-4">
                    {[
                      "End-to-end encryption active",
                      "Database connections secured",
                      "Authentication servers online",
                      "Zero data breaches reported"
                    ].map((text, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium">
                        <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
