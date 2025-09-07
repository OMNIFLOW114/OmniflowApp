export const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file); // user's image
    formData.append('upload_preset', 'unsigned_omni_upload'); // your preset name
  
    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/omniflow/image/upload', {
        method: 'POST',
        body: formData
      });
  
      const data = await res.json();
      return data.secure_url; // the link to the image
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return null;
    }
  };
  