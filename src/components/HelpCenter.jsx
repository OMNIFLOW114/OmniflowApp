import React from 'react';

const HelpCenter = () => {
  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Help Center</h1>
      <p className="text-gray-700">
        Welcome to the Help Center! Here you can find answers to common questions, contact support, and explore resources to get the most out of the application.
      </p>
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
        <ul className="mt-4 space-y-3">
          <li className="text-sm">
            <strong>How do I create an account?</strong>
            <p className="text-gray-600">To create an account, click on the "Sign Up" button on the homepage and fill out the registration form.</p>
          </li>
          <li className="text-sm">
            <strong>How do I reset my password?</strong>
            <p className="text-gray-600">If you've forgotten your password, click on "Forgot Password" during login to reset it.</p>
          </li>
          <li className="text-sm">
            <strong>How can I contact support?</strong>
            <p className="text-gray-600">You can reach our support team by emailing support@omniflow.com or visiting our Contact Us page.</p>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HelpCenter;
