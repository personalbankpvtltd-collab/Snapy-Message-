import React from 'react';
import { motion } from 'motion/react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <PublicNavbar />
      
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-12 border-b border-gray-100 pb-8">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
              <p className="text-gray-500">Last updated: April 6, 2026</p>
            </div>

            <div className="space-y-10 text-gray-600 leading-relaxed text-lg">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                <p>
                  At Snapy Message (operated by Orynx Digital), we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website or use our application and tell you about your privacy rights and how the law protects you.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. The Data We Collect About You</h2>
                <p className="mb-4">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
                  <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
                  <li><strong>Profile Data</strong> includes your username and password, your interests, preferences, feedback and survey responses.</li>
                  <li><strong>Usage Data</strong> includes information about how you use our website, products and services.</li>
                  <li><strong>Communications Data</strong> includes your chat messages, images shared, and friend connections.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Personal Data</h2>
                <p className="mb-4">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing the chat service).</li>
                  <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                  <li>Where we need to comply with a legal obligation.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
                <p>
                  We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
                <p>
                  We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact Us</h2>
                <p>
                  If you have any questions about this privacy policy or our privacy practices, please contact us via the Orynx Digital website at <a href="https://orynxdigital.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">orynxdigital.netlify.app</a>.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
