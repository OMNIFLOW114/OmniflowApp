import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { FaTrash } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import "./Create.css";

const Create = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [mood, setMood] = useState("😎");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("user_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch posts");
      return;
    }

    setPosts(data || []);
  };

  const handlePost = async () => {
    setIsPosting(true);

    if (!user) {
      toast.error("You must be logged in to post.");
      setIsPosting(false);
      return;
    }

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("post-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("user_posts").insert([
        {
          title,
          content,
          mood,
          visibility,
          tags: tags.split(",").map((t) => t.trim()),
          image_url: imageUrl,
          video_url: videoUrl,
          user_id: user.id,
        },
      ]);

      if (error) throw error;

      toast.success("🎉 Post created!");
      setTitle("");
      setContent("");
      setTags("");
      setImageFile(null);
      setVideoUrl("");
      fetchMyPosts();
    } catch (err) {
      console.error(err);
      toast.error(`Post failed: ${err.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    const { error } = await supabase
      .from("user_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id); // prevent others from deleting

    if (error) {
      toast.error("Failed to delete post.");
    } else {
      toast.success("Post deleted.");
      fetchMyPosts();
    }
  };

  return (
    <div className={`create-container ${document.body.classList.contains("dark") ? "dark" : ""}`}>
      <div className="create-card">
        <h2>Create Something Epic</h2>

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="What's on your mind..."
          value={content}
          rows={5}
          onChange={(e) => setContent(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
        />

        <input
          type="text"
          placeholder="Video URL (optional)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />

        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="public">🌍 Public</option>
          <option value="private">🔒 Private</option>
        </select>

        <div className="form-group-inline">
          <label>Mood:</label>
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            <option value="😎">😎 Cool</option>
            <option value="🔥">🔥 Lit</option>
            <option value="💡">💡 Inspired</option>
            <option value="😂">😂 Funny</option>
            <option value="🤯">🤯 Mind-blown</option>
          </select>
        </div>

        <button onClick={handlePost} disabled={isPosting}>
          {isPosting ? "Posting..." : "Post Now"}
        </button>
      </div>

      <div className="my-posts-section">
        <h3>Your Posts</h3>
        {posts.length === 0 ? (
          <p className="no-posts">No posts yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="user-post-card">
              <img
                src={post.image_url || "https://via.placeholder.com/200x120?text=No+Image"}
                alt="post"
              />
              <div className="post-info">
                <h4>{post.title}</h4>
                <p>{post.content}</p>
                <div className="post-meta">
                  <span>{post.visibility}</span>
                  <span>{post.mood}</span>
                  <button onClick={() => handleDelete(post.id)} className="delete-btn">
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Create;
