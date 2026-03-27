// src/store/useChatStore.js
import { create } from "zustand";
import { io } from "socket.io-client";
import { auth } from "../services/firebase";
import api from "../services/api";

// ── Socket singleton ──────────────────────────────────────────────────────────
// Bug fixed: the old module-level socketInstance was never reset on disconnect,
// so a stale disconnected socket would be reused forever. Now the store owns
// the socket and can tear it down and rebuild it cleanly.
let socketInstance = null;

async function getSocket() {
  // If we already have a live connection, reuse it
  if (socketInstance?.connected) return socketInstance;

  // If there's a broken instance, kill it before creating a new one
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");

  socketInstance = io(
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
      "http://localhost:5000",
    {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    },
  );

  return socketInstance;
}

// ── Chat store (per active booking chat) ─────────────────────────────────────
export const useChatStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────────────────────────
  messages: [],
  loading: false,
  sending: false,
  connected: false,
  typingUsers: new Set(),
  error: null,
  bottomRef: { current: null }, // stable ref object — components attach .current

  // ── Conversations list (separate slice) ──────────────────────────────────────
  conversations: [],
  conversationsLoading: false,

  // ── Internal: active booking id and typing timer ─────────────────────────────
  _bookingId: null,
  _typingTimer: null,

  // ── Scroll helper ────────────────────────────────────────────────────────────
  scrollToBottom: () => {
    setTimeout(() => {
      get().bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  },

  // ── Load message history ─────────────────────────────────────────────────────
  loadMessages: async (bookingId) => {
    if (!bookingId) return;
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/chat/${bookingId}/messages`);
      const data = res.data?.data?.messages ?? res.data?.messages ?? [];
      set({ messages: Array.isArray(data) ? data : [] });
      get().scrollToBottom();
    } catch {
      set({ error: "Failed to load messages" });
    } finally {
      set({ loading: false });
    }
  },

  // ── Connect socket and bind all event listeners ───────────────────────────────
  // Returns a cleanup function — call it on component unmount.
  connectChat: async (bookingId, currentUserId) => {
    if (!bookingId || !currentUserId) return () => {};

    set({ _bookingId: bookingId });

    // Load history first (non-blocking — connect runs in parallel)
    get().loadMessages(bookingId);

    try {
      const socket = await getSocket();

      const onConnect = () => {
        set({ connected: true });
        socket.emit("chat:join", { bookingId });
      };

      const onDisconnect = () => set({ connected: false });

      const onMessage = (msg) => {
        set((state) => {
          // Deduplicate by _id
          if (state.messages.some((m) => m._id === msg._id)) return state;
          return { messages: [...state.messages, msg] };
        });
        get().scrollToBottom();
        api.patch(`/chat/${bookingId}/read`).catch(() => {});
      };

      const onTyping = ({ userId: typingId, isTyping }) => {
        if (typingId === currentUserId) return;
        set((state) => {
          const next = new Set(state.typingUsers);
          isTyping ? next.add(typingId) : next.delete(typingId);
          return { typingUsers: next };
        });
      };

      const onError = ({ message }) => set({ error: message });

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("chat:message", onMessage);
      socket.on("chat:typing", onTyping);
      socket.on("chat:error", onError);

      // If already connected, join room immediately
      if (socket.connected) {
        set({ connected: true });
        socket.emit("chat:join", { bookingId });
      } else {
        socket.connect();
      }

      // Return cleanup — removes only THIS booking's listeners
      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("chat:message", onMessage);
        socket.off("chat:typing", onTyping);
        socket.off("chat:error", onError);
        set({
          connected: false,
          messages: [],
          typingUsers: new Set(),
          _bookingId: null,
        });
      };
    } catch (err) {
      console.error("Socket connection error:", err);
      set({ error: "Could not connect to chat" });
      return () => {};
    }
  },

  // ── Send a message ────────────────────────────────────────────────────────────
  sendMessage: async (text) => {
    // 🚨 UPDATE 1: Add `messages` and `scrollToBottom` to the destructured state
    const { _bookingId, sending, messages, scrollToBottom } = get();
    if (!text.trim() || sending || !_bookingId) return;

    set({ sending: true });
    try {
      // 🚨 UPDATE 2: ALWAYS save via the REST API first.
      // This replaces the old if/else statement.
      const res = await api.post(`/chat/${_bookingId}/messages`, {
        text: text.trim(),
      });
      const savedMsg = res.data?.data ?? res.data;

      // 🚨 UPDATE 3: Instantly update the sender's screen (no waiting for socket)
      if (!messages.some((m) => m._id === savedMsg._id)) {
        set({ messages: [...messages, savedMsg] });
        scrollToBottom();
      }

      // 🚨 UPDATE 4: Tell the backend to broadcast the FULL saved message
      // to the other person.
      if (socketInstance?.connected) {
        socketInstance.emit("chat:message", {
          bookingId: _bookingId,
          ...savedMsg, // Pass the entire saved message (with _id, timestamps, etc.)
        });
      }
    } catch {
      set({ error: "Failed to send message" });
    } finally {
      set({ sending: false });
    }
  },
  listenForGlobalNotifications: async () => {
    try {
      const socket = await getSocket(); // Uses your existing getSocket() function

      const handleNotification = () => {
        // When a notification arrives, instantly refresh the conversations list
        get().fetchConversations();
      };

      socket.on("notification:message", handleNotification);

      // Make sure we are connected even if we aren't in a specific room
      if (!socket.connected) socket.connect();

      // Return a cleanup function
      return () => {
        socket.off("notification:message", handleNotification);
      };
    } catch (err) {
      console.error("Global socket error:", err);
      return () => {};
    }
  },

  // ── Typing indicator ──────────────────────────────────────────────────────────
  emitTyping: (isTyping) => {
    const { _bookingId } = get();
    socketInstance?.emit("chat:typing", { bookingId: _bookingId, isTyping });
  },

  handleTyping: () => {
    const { emitTyping, _typingTimer } = get();
    emitTyping(true);
    if (_typingTimer) clearTimeout(_typingTimer);
    const timer = setTimeout(() => emitTyping(false), 2000);
    set({ _typingTimer: timer });
  },

  // ── Conversations list ────────────────────────────────────────────────────────
  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await api.get("/chat/conversations");
      const data = res.data?.data ?? res.data ?? [];
      set({ conversations: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      set({ conversationsLoading: false });
    }
  },

  // ── Fully disconnect and reset (e.g. on logout) ───────────────────────────────
  disconnectAll: () => {
    if (socketInstance) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketInstance = null;
    }
    const { _typingTimer } = get();
    if (_typingTimer) clearTimeout(_typingTimer);
    set({
      messages: [],
      loading: false,
      sending: false,
      connected: false,
      typingUsers: new Set(),
      error: null,
      conversations: [],
      conversationsLoading: false,
      _bookingId: null,
      _typingTimer: null,
    });
  },
}));
