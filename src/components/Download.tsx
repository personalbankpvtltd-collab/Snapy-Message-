import React from 'react';
import { motion } from 'motion/react';
import { Download as DownloadIcon, Smartphone, Monitor, Apple, Check } from 'lucide-react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function Download() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <PublicNavbar />
      
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl font-extrabold text-gray-900 mb-6">Get <span className="text-indigo-600">Snapy Message</span></h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Download the app for your favorite devices and stay connected wherever you go.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Android APK */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-indigo-100 p-4 rounded-2xl">
                  <Smartphone className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Android APK</h3>
                  <p className="text-gray-500">Version 2.1.0</p>
                </div>
              </div>
              <ul className="space-y-3 mb-10">
                <li className="flex items-center gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500" /> Requires Android 8.0+</li>
                <li className="flex items-center gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500" /> 24MB Download Size</li>
                <li className="flex items-center gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500" /> Full feature support</li>
              </ul>
              <a 
                href="https://sites.google.com/view/snapy-massage-apk-download/download" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <DownloadIcon className="w-5 h-5" />
                Download APK
              </a>
            </motion.div>

            {/* Web App */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-purple-100 p-4 rounded-2xl">
                  <Monitor className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Web App</h3>
                  <p className="text-gray-500">Use in browser</p>
                </div>
              </div>
              <ul className="space-y-3 mb-10">
                <li className="flex items-center gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500" /> Works on any modern browser</li>
                <li className="flex items-center gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500" /> No installation required</li>
                <li className="flex items-center gap-3 text-gray-600"><Check className="w-5 h-5 text-green-500" /> Always up to date</li>
              </ul>
              <a 
                href="/login" 
                className="flex items-center justify-center gap-3 w-full bg-white border-2 border-gray-200 text-gray-900 py-4 rounded-xl font-bold text-lg hover:border-indigo-600 hover:text-indigo-600 transition-all"
              >
                Open Web App
              </a>
            </motion.div>
          </div>

          <div className="mt-20 text-center">
            <p className="text-gray-500 mb-6">Coming soon to other platforms</p>
            <div className="flex justify-center gap-6 opacity-50 grayscale">
              <div className="flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-full">
                <Apple className="w-5 h-5" />
                <span className="font-medium">iOS App Store</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-full">
                <Monitor className="w-5 h-5" />
                <span className="font-medium">Windows Desktop</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
