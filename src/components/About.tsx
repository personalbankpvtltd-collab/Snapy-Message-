import React from 'react';
import { motion } from 'motion/react';
import { Users, Target, Heart, Globe, Zap, Shield } from 'lucide-react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function About() {
  const values = [
    {
      icon: <Target className="w-8 h-8 text-indigo-500" />,
      title: "Our Mission",
      desc: "To provide a seamless, secure, and lightning-fast communication platform that brings people closer together, no matter where they are in the world."
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: "Privacy First",
      desc: "We believe privacy is a fundamental human right. Snapy Message is built from the ground up to protect your data and keep your conversations secure."
    },
    {
      icon: <Heart className="w-8 h-8 text-red-500" />,
      title: "User-Centric Design",
      desc: "Every feature we build is designed with you in mind. We strive for simplicity, elegance, and an intuitive user experience."
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
              <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">About <span className="text-indigo-600 dark:text-indigo-400">Us</span></h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                We are <a href="https://orynxdigital.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Orynx Digital</a>, the passionate team behind Snapy Message. We build digital experiences that matter.
              </p>
            </motion.div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-8 md:p-16 shadow-xl border border-gray-100 dark:border-gray-700 mb-20 transition-colors">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Who is Orynx Digital?</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  Orynx Digital is a forward-thinking technology company dedicated to creating innovative software solutions. We specialize in building scalable, secure, and user-friendly applications that solve real-world problems.
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
                  Snapy Message is our flagship communication platform, born out of the need for a chat application that doesn't compromise on speed, features, or user privacy.
                </p>
                <a 
                  href="https://orynxdigital.netlify.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  Visit Orynx Digital
                </a>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="aspect-square rounded-[2rem] overflow-hidden shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" 
                    alt="Team collaboration" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 -left-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-full">
                      <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">10k+</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Users</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Core Values</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="mb-6 bg-gray-50 dark:bg-gray-700 w-16 h-16 flex items-center justify-center rounded-2xl">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{value.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
