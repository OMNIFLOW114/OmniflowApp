// src/pages/TrustSection.jsx
import React from "react";
import { ShieldCheck, Globe, ThumbsUp } from "lucide-react";

const TrustSection = () => {
  return (
    <section className="w-full py-12 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <ShieldCheck className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold">Verified Sellers</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All sellers go through a strict verification process to ensure product authenticity.
          </p>
        </div>
        <div className="flex flex-col items-center space-y-4">
          <Globe className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold">Global Shipping</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Trade confidently across borders with fast, tracked delivery options.
          </p>
        </div>
        <div className="flex flex-col items-center space-y-4">
          <ThumbsUp className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold">Trusted Marketplace</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Built with security-first technology to protect every transaction you make.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
