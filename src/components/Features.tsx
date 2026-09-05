import React from 'react';
import { motion } from 'motion/react';
import { Zap, Globe, Users, MessageSquare, Image as ImageIcon, Shield, Smartphone, Bell, Search } from 'lucide-react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function Features() {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Lightning Fast Messaging",
      desc: "Experience real-time messaging with zero lag. Our optimized infrastructure ensures your messages are delivered instantly, no matter where you are."
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: "Secure & Private",
      desc: "Your privacy is our priority. With robust encryption and a secure database backend, your conversations stay between you and your friends."
    },
    {
      icon: <ImageIcon className="w-8 h-8 text-purple-500" />,
      title: "Rich Media Sharing",
      desc: "Share photos and images seamlessly within your chats. Our built-in image viewer and download options make media sharing a breeze."
    },
    {
      icon: <Users className="w-8 h-8 text-indigo-500" />,
      title: "Community & Friends",
      desc: "Easily find, add, and manage your friends. Our intuitive request system lets you build your network safely."
    },
    {
      icon: <Bell className="w-8 h-8 text-red-500" />,
      title: "Real-time Notifications",
      desc: "Never miss a message. Get instant updates when someone sends you a message or a friend request."
    },
    {
      icon: <Search className="w-8 h-8 text-blue-500" />,
      title: "Global Search",
      desc: "Find anyone on the platform quickly with our powerful global search feature. Connect with people worldwide."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors">
      <PublicNavbar />
      
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">Powerful Features for <span className="text-indigo-600 dark:text-indigo-400">Modern Chat</span></h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Everything you need to stay connected, share moments, and communicate securely in one seamless application.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="mb-6 bg-gray-50 dark:bg-gray-700 w-16 h-16 flex items-center justify-center rounded-2xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
