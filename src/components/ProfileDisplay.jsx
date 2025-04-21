import { motion } from 'framer-motion';

function ProfileDisplay({ profile }) {
  return (
    <motion.div
      className="p-6 max-w-xl mx-auto bg-white rounded-lg shadow-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Overview</h2>
      <div className="space-y-4">
        <div><strong className="text-gray-700">First Name:</strong> {profile.firstName}</div>
        <div><strong className="text-gray-700">Last Name:</strong> {profile.lastName}</div>
        <div><strong className="text-gray-700">Job Title:</strong> {profile.jobTitle}</div>
        <div><strong className="text-gray-700">Email:</strong> {profile.email}</div>
        <div><strong className="text-gray-700">Mobile:</strong> {profile.mobile}</div>
        <div>
          <strong className="text-gray-700">LinkedIn:</strong> 
          {profile.linkedin ? (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              View LinkedIn
            </a>
          ) : (
            <span className="text-gray-400">Not available</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ProfileDisplay;
