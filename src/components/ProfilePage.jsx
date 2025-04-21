import { useState } from 'react';
import ProfileForm from './ProfileForm';
import ProfileDisplay from './ProfileDisplay';

function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    email: '',
    mobile: '',
    linkedin: '',
    // Add the rest of the 26 fields
  });

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Form on the left */}
        <ProfileForm profile={profile} setProfile={setProfile} />

        {/* Profile Display on the right */}
        <ProfileDisplay profile={profile} />
      </div>
    </div>
  );
}

export default ProfilePage;
