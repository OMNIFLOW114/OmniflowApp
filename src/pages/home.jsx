import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '@/firebase';
import TestBackendConnection from "./TestBackendConnection";
// ...
<TestBackendConnection />

const Home = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white p-6 border-r border-gray-200 shadow-sm">
        {user && (
          <>
            <div className="mb-8 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-300 rounded-full mb-2" />
              <h2 className="text-lg font-semibold">{user.displayName || user.email}</h2>
              <p className="text-sm text-gray-500">My Profile</p>
            </div>

            {/* Navigation links removed */}
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {user ? (
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {user.displayName || user.email}</h1>
            <p className="text-gray-600 mb-6">Start exploring opportunities and networking.</p>

            {/* Placeholder for future dashboard content */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <p className="text-gray-500">Your feed or widgets will appear here soon.</p>
            </div>
          </div>
        ) : (
          <div className="text-center mt-20">
            <p className="text-xl text-gray-600">Please log in to access your dashboard.</p>
            <Link
              to="/login"
              className="mt-4 inline-block text-blue-500 hover:underline"
            >
              Go to Login
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
