import React from 'react';
import { Link } from 'react-router-dom';

export default function PublicNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
              <img src="https://i.pinimg.com/736x/c0/e7/e3/c0e7e34714b381275cabc59cf5e41c78.jpg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Snapy<span className="hidden min-[400px]:inline"> Message</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/features" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</Link>
            <Link to="/security" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Security</Link>
            <Link to="/download" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Download</Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/login" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Login</Link>
            <Link to="/signup" className="bg-indigo-600 text-white px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 active:scale-95">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
