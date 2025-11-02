import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FaSearch, FaEllipsisV, FaStore, FaTimes, FaStar, FaRegStar,
  FaCog, FaPlus, FaComment, FaCircle, FaRegCircle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import "./Messages.css";

const Messages = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers] = useState(new Set());
  const [userDetails, setUserDetails] = useState({});
  const [storeDetails, setStoreDetails] = useState({});
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showMenu, setShowMenu] = useState(false);

  const searchInputRef = useRef(null);
  const menuRef = useRef(null);

  // Auto-detect dark mode
  const isDark = document.documentElement.classList.contains("dark");

  useEffect(() => { searchInputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ────── FETCHERS ──────
  const fetchUserDetails = useCallback(async (ids) => {
    if (!ids.length) return;
    const { data } = await supabase.from("users").select("id, full_name, avatar_url").in("id", ids);
    const map = {};
    data.forEach(u => {
      map[u.id] = { name: u.full_name || "Customer", avatar: u.avatar_url };
    });
    setUserDetails(prev => ({ ...prev, ...map }));
  }, []);

  const fetchStoreDetails = useCallback(async (ids) => {
    if (!ids.length) return;
    const { data } = await supabase.from("stores").select("id, name, owner_id").in("id", ids);
    const map = {};
    data.forEach(s => {
      map[s.id] = { name: s.name || "My Store", owner_id: s.owner_id };
    });
    setStoreDetails(prev => ({ ...prev, ...map }));
  }, []);

  // ────── MAIN FETCH ──────
  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);

    try {
      const { data: myStores } = await supabase.from("stores").select("id").eq("owner_id", currentUser.id);
      const myStoreIds = myStores?.map(s => s.id) || [];

      let query = supabase
        .from("store_messages")
        .select("id, store_id, user_id, sender_role, content, created_at, product_id, is_read")
        .order("created_at", { ascending: false });

      if (myStoreIds.length) {
        query = query.or(`user_id.eq.${currentUser.id},store_id.in.(${myStoreIds.join(",")})`);
      } else {
        query = query.eq("user_id", currentUser.id);
      }

      const { data: msgs } = await query;

      const storeIds = [...new Set(msgs.map(m => m.store_id))];
      const userIds = [...new Set(msgs.map(m => m.user_id).filter(id => id !== currentUser.id))];

      await Promise.all([fetchStoreDetails(storeIds), fetchUserDetails(userIds)]);

      const convMap = new Map();

      msgs.forEach(msg => {
        const isBuyer = msg.user_id === currentUser.id;
        const storeId = msg.store_id;
        const otherUserId = isBuyer ? storeDetails[storeId]?.owner_id : msg.user_id;
        const key = `${storeId}-${msg.product_id || "general"}`;

        if (!convMap.has(key)) {
          convMap.set(key, {
            id: key,
            store_id: storeId,
            product_id: msg.product_id,
            user_id: otherUserId || msg.user_id,
            store_name: storeDetails[storeId]?.name || "Loading Store...",
            last_message: msg.content || "Photo",
            last_message_time: msg.created_at,
            unread_count: 0,
            is_buyer: isBuyer,
            is_pinned: false,
          });
        }

        const conv = convMap.get(key);
        if (new Date(msg.created_at) > new Date(conv.last_message_time)) {
          conv.last_message = msg.content || "Photo";
          conv.last_message_time = msg.created_at;
        }

        const fromOther = isBuyer
          ? msg.sender_role === "seller"
          : msg.sender_role === "buyer";

        if (fromOther && !msg.is_read) conv.unread_count++;
      });

      const sorted = Array.from(convMap.values())
        .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));

      setConversations(sorted);
    } catch (e) {
      toast.error("Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, fetchStoreDetails, fetchUserDetails]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Fake online (no re-render)
  useEffect(() => {
    const iv = setInterval(() => {
      const dots = document.querySelectorAll(".online-dot");
      dots.forEach(dot => {
        dot.style.opacity = Math.random() > 0.5 ? "1" : "0";
      });
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 36e5;
    if (diff < 1) return "now";
    if (diff < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 48) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getName = (c) => {
    return c.is_buyer
      ? c.store_name
      : userDetails[c.user_id]?.name || "Customer";
  };

  const filtered = conversations.filter(c => {
    const name = getName(c).toLowerCase();
    const msg = c.last_message.toLowerCase();
    const matches = !searchTerm || name.includes(searchTerm.toLowerCase()) || msg.includes(searchTerm.toLowerCase());
    return selectedFilter === "unread" ? matches && c.unread_count > 0 : matches;
  });

  const togglePin = (id, e) => {
    e.stopPropagation();
    setConversations(p => p.map(c => c.id === id ? { ...c, is_pinned: !c.is_pinned } : c));
  };

  const openChat = (c) => {
    navigate("/chat", {
      state: {
        conversation: c,
        userDetails: userDetails[c.user_id],
        storeDetails: storeDetails[c.store_id],
      },
    });
  };

  const markAllRead = () => {
    setConversations(p => p.map(c => ({ ...c, unread_count: 0 })));
    toast.success("All marked as read");
    setShowMenu(false);
  };

  // ────── MEMOIZED ITEM ──────
  const ChatItem = memo(({ c }) => {
    const name = getName(c);
    const avatar = c.is_buyer ? null : userDetails[c.user_id]?.avatar;

    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`conversation ${c.is_pinned ? "pinned" : ""} ${c.unread_count > 0 ? "unread" : ""}`}
        onClick={() => openChat(c)}
        style={{ height: 72 }}
      >
        <div className="avatar-wrapper">
          {c.is_buyer ? (
            <div className="avatar store"><FaStore /></div>
          ) : avatar ? (
            <img src={avatar} alt={name} className="avatar" />
          ) : (
            <div className="avatar user"><span>{name[0]}</span></div>
          )}
          <div className="online-dot" />
        </div>

        <div className="body">
          <div className="top">
            <h3>{name}</h3>
            <div className="meta">
              <span>{formatTime(c.last_message_time)}</span>
              <button onClick={(e) => togglePin(c.id, e)} className="pin">
                {c.is_pinned ? <FaStar color="#f59e0b" /> : <FaRegStar />}
              </button>
            </div>
          </div>
          <div className="preview">
            <p>{c.last_message}</p>
            {c.unread_count > 0 && <span className="badge">{c.unread_count > 99 ? "99+" : c.unread_count}</span>}
          </div>
        </div>
      </motion.div>
    );
  });

  const Skeleton = () => (
    <div className="conversation skeleton" style={{ height: 72 }}>
      <div className="avatar skeleton-avatar" />
      <div className="body">
        <div className="top">
          <div className="line short" />
          <div className="line tiny" />
        </div>
        <div className="preview">
          <div className="line long" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`page ${isDark ? "dark" : ""}`}>
      <div className="container">
        <header className="header fixed">
          <div className="header-inner">
            <div className="title">
              <h1>Chats</h1>
              <span className="count">{conversations.length}</span>
            </div>

            <div className="search-wrapper">
              <FaSearch className="icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="clear">
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="filters">
              <button className={selectedFilter === "all" ? "active" : ""} onClick={() => setSelectedFilter("all")}>
                <FaRegCircle /> All
              </button>
              <button className={selectedFilter === "unread" ? "active" : ""} onClick={() => setSelectedFilter("unread")}>
                <FaCircle /> Unread
              </button>
            </div>

            <div className="menu" ref={menuRef}>
              <button onClick={() => setShowMenu(v => !v)} className="menu-btn">
                <FaEllipsisV />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div className="dropdown" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <button onClick={() => { toast("Coming soon"); setShowMenu(false); }}>
                      <FaPlus /> New Chat
                    </button>
                    <button onClick={markAllRead}>
                      <FaRegCircle /> Mark All Read
                    </button>
                    <button onClick={() => { navigate("/settings"); setShowMenu(false); }}>
                      <FaCog /> Settings
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="list">
          {isLoading ? (
            [...Array(8)].map((_, i) => <Skeleton key={i} />)
          ) : filtered.length > 0 ? (
            filtered.map(c => <ChatItem key={c.id} c={c} />)
          ) : (
            <div className="empty">
              <FaComment />
              <h3>No chats</h3>
              <p>{searchTerm ? "Try another search" : "Start a conversation!"}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Messages;