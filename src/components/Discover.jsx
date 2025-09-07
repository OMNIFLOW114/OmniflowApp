import React, { useState, useEffect, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { motion } from "framer-motion";
import {
  FaSearch, FaStar, FaBookOpen, FaHeart, FaCommentDots, FaShareAlt
} from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import "./Discover.css";

const reactionOptions = ["❤️", "🔥", "😂", "😮"];
const PAGE_SIZE = 10;

const Discover = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [commentInput, setCommentInput] = useState({});
  const [reactionMenu, setReactionMenu] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (pg = 1) => {
    const from = (pg - 1) * PAGE_SIZE;
    const to = pg * PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("user_posts")
      .select(`*, users!user_posts_user_id_fkey(full_name, avatar_url)`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Post fetch error:", error.message);
      return;
    }

    if (data) {
      setPosts(prev => pg === 1 ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
  }, []);

  const fetchLikes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("post_likes")
      .select("post_id, reaction")
      .eq("user_id", user.id);

    if (error) {
      console.error("Likes fetch error:", error.message);
      return;
    }

    setLikes(Object.fromEntries(data.map(({ post_id, reaction }) => [post_id, reaction])));
  }, [user]);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("post_comments")
      .select("*, users!post_comments_user_id_fkey(full_name, avatar_url)")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Comments fetch error:", error.message);
      return;
    }

    if (data && Array.isArray(data)) {
      const grouped = {};
      data.forEach(c => {
        if (!grouped[c.post_id]) grouped[c.post_id] = [];
        grouped[c.post_id].push(c);
      });
      setComments(grouped);
    } else {
      setComments({});
    }
  }, []);

  const loadMore = () => {
    setPage(prev => {
      fetchPosts(prev + 1);
      return prev + 1;
    });
  };

  const handleLike = async (postId, reaction = null) => {
    if (!user) return toast.error("Log in to react.");
    const current = likes[postId];

    if (current) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id, reaction });
    }

    fetchLikes();
  };

  const handleComment = async postId => {
    const text = (commentInput[postId] || "").trim();
    if (!text || !user) return;
    await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, comment: text });
    setCommentInput(prev => ({ ...prev, [postId]: "" }));
    fetchComments();
  };

  const handleShare = postId => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    toast.info("🔗 Link copied!");
  };

  useEffect(() => {
    fetchPosts();
    fetchLikes();
    fetchComments();
  }, [fetchPosts, fetchLikes, fetchComments]);

  const filtered = posts.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const stories = filtered.filter(p => p.image_url);

  return (
    <div className={`discover-page ${document.body.classList.contains("dark") ? "dark" : ""}`}>
      <div className="discover-header">
        <h1 className="discover-title">
          <FaBookOpen /> Discover OmniFlow
        </h1>
        <p className="welcome-message">
          Welcome back, {user?.user_metadata?.full_name || "Explorer"}!
        </p>
        <motion.div className="search-bar" whileHover={{ scale: 1.02 }}>
          <input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button><FaSearch /></button>
        </motion.div>
      </div>

      {stories.length > 0 && (
        <Swiper slidesPerView={3} spaceBetween={10} className="stories-slider">
          {stories.map(p => (
            <SwiperSlide key={p.id}>
              <img
                src={p.image_url}
                className="story-slide"
                onClick={() => document.getElementById(`post-${p.id}`)?.scrollIntoView({ behavior: "smooth" })}
                alt={p.title}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      <InfiniteScroll
        dataLength={filtered.length}
        next={loadMore}
        hasMore={hasMore}
        loader={<h4 className="loader-text">Loading more...</h4>}
        endMessage={<p className="loader-text">You’re all caught up!</p>}
      >
        {filtered.map(post => (
          <motion.div
            className="post-card-social"
            id={`post-${post.id}`}
            key={post.id}
            whileHover={{ scale: 1.01 }}
          >
            <div className="post-header">
              <div className="profile-preview">
                <img src={post.users?.avatar_url || "/default-avatar.png"} alt="" className="avatar" />
                <strong>{post.users?.full_name || "User"}</strong>
              </div>
              <span className="time-stamp">{new Date(post.created_at).toLocaleString()}</span>
            </div>

            {post.mood && <div className="post-mood">Mood: {post.mood}</div>}

            {post.tags && (
              <div className="post-tags">
                {(typeof post.tags === "string" ? post.tags.split(",") : post.tags)
                  .filter(Boolean)
                  .map((tag, i) => (
                    <span key={i} className="tag">#{tag.trim()}</span>
                  ))}
              </div>
            )}

            {post.image_url && (
              <img className="post-image" src={post.image_url} alt={post.title} />
            )}

            <div className="post-body">
              <h3>{post.title}</h3>
              <p>{post.content}</p>
            </div>

            <div className="post-actions">
              <button
                onMouseDown={e => e.detail && setReactionMenu(post.id)}
                onClick={() => handleLike(post.id)}
              >
                <FaHeart color={likes[post.id] ? "red" : "gray"} />{" "}
                {likes[post.id] || "Like"}
              </button>
              {reactionMenu === post.id && (
                <div className="reaction-popup">
                  {reactionOptions.map(r => (
                    <span key={r} onClick={() => handleLike(post.id, r)}>{r}</span>
                  ))}
                </div>
              )}

              <button
                onClick={() => document.getElementById(`comment-${post.id}`)?.scrollIntoView({ behavior: "smooth" })}
              >
                <FaCommentDots /> Comment ({comments[post.id]?.length || 0})
              </button>
              <button onClick={() => handleShare(post.id)}>
                <FaShareAlt /> Share
              </button>
            </div>

            <div className="post-comments" id={`comment-${post.id}`}>
              {(comments[post.id] || []).map(c => (
                <div className="comment" key={c.id}>
                  <div className="comment-bubble">
                    <img src={c.users?.avatar_url || "/default-avatar.png"} alt="" className="comment-avatar" />
                    <div>
                      <strong>{c.users?.full_name}</strong>
                      <p>{c.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
              <input
                placeholder="Write a comment..."
                value={commentInput[post.id] || ""}
                onChange={e =>
                  setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))
                }
                onKeyDown={e => e.key === "Enter" && handleComment(post.id)}
              />
            </div>
          </motion.div>
        ))}
      </InfiniteScroll>

      <motion.button className="explore-more-btn" whileHover={{ scale: 1.1 }}>
        <FaStar /> Explore More
      </motion.button>
    </div>
  );
};

export default Discover;
