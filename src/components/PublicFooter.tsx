import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Lock } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="bg-white dark:bg-gray-900 pt-20 pb-10 border-t border-gray-100 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg overflow-hidden">
                <img src="https://i.pinimg.com/736x/c0/e7/e3/c0e7e34714b381275cabc59cf5e41c78.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Snapy Message</span>
            </Link>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed mb-8">
              The full safe chat platform designed for the modern era. Connect with confidence and privacy.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-all">
                <Globe className="w-5 h-5" />
              </div>
              <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-all">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Platform</h4>
            <ul className="space-y-4 text-gray-500 dark:text-gray-400 text-sm">
              <li><Link to="/features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</Link></li>
              <li><Link to="/security" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Security</Link></li>
              <li><Link to="/download" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Download</Link></li>
              <li><Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Company</h4>
            <ul className="space-y-4 text-gray-500 dark:text-gray-400 text-sm">
              <li><a href="https://orynxdigital.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Orynx Digital</a></li>
              <li><Link to="/about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About Us</Link></li>
              <li><Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400 dark:text-gray-500">
          <p>© 2026 Snapy Message. All rights reserved.</p>
          <p>Crafted with <Link to="/admin" className="hover:scale-110 inline-block transition-transform">❤️</Link> by <a href="https://orynxdigital.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Orynx Digital</a></p>
        </div>
      </div>
    </footer>
  );
}
