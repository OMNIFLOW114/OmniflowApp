const handleSubmit = async (e) => {
  e.preventDefault();
  if (!image) return alert("Please select an image.");

  setUploading(true);

  try {
    // Upload image to Cloudinary
    const formData = new FormData();
    formData.append("file", image);
    formData.append("upload_preset", "unsigned_omni_upload"); // ⬅️ replace
    const res = await fetch("https://api.cloudinary.com/v1_1/omniflow/image/upload", { // ⬅️ replace
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (!data.secure_url) throw new Error("Cloudinary upload failed");

    const imageUrl = data.secure_url;

    // Product data
    const productData = {
      name: productName,
      description,
      price: parseFloat(price),
      imageUrl,
      storeId,
      createdAt: serverTimestamp()
    };

    // Save to general marketplace
    const productRef = await addDoc(collection(db, "products"), productData);

    // Save to store's own subcollection
    await addDoc(collection(db, `stores/${storeId}/products`), {
      ...productData,
      productId: productRef.id,
    });

    alert(`✅ Product "${productName}" added successfully!`);
    onClose();
  } catch (error) {
    console.error("Upload or Firestore error:", error);
    alert("❌ Failed to upload or save product.");
  } finally {
    setUploading(false);
  }
};
