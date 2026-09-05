import React from 'react';
import { motion } from 'motion/react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function Terms() {
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
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Terms of Service</h1>
              <p className="text-gray-500">Last updated: April 6, 2026</p>
            </div>

            <div className="space-y-10 text-gray-600 leading-relaxed text-lg">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
                <p>
                  By accessing or using Snapy Message, a service provided by Orynx Digital, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site and application.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use License</h2>
                <p className="mb-4">
                  Permission is granted to temporarily download one copy of the materials (information or software) on Snapy Message for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>modify or copy the materials;</li>
                  <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
                  <li>attempt to decompile or reverse engineer any software contained on Snapy Message;</li>
                  <li>remove any copyright or other proprietary notations from the materials; or</li>
                  <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Conduct</h2>
                <p className="mb-4">
                  You agree to use Snapy Message only for lawful purposes. You are prohibited from posting on or transmitting through Snapy Message any material that is:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Defamatory, abusive, obscene, or threatening.</li>
                  <li>Infringing on any intellectual property rights.</li>
                  <li>In violation of any law or regulation.</li>
                  <li>Spam, malware, or malicious code.</li>
                </ul>
                <p className="mt-4">
                  We reserve the right to terminate accounts that violate these guidelines, including through our automated reporting and banning systems.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Disclaimer</h2>
                <p>
                  The materials on Snapy Message are provided on an 'as is' basis. Orynx Digital makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Limitations</h2>
                <p>
                  In no event shall Orynx Digital or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Snapy Message, even if Orynx Digital or an authorized representative has been notified orally or in writing of the possibility of such damage.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Revisions and Errata</h2>
                <p>
                  The materials appearing on Snapy Message could include technical, typographical, or photographic errors. Orynx Digital does not warrant that any of the materials on its website are accurate, complete, or current. Orynx Digital may make changes to the materials contained on its website at any time without notice.
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
