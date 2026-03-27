// // src/hooks/useChat.js
// import { useState, useEffect, useRef, useCallback } from "react";
// import { io } from "socket.io-client";
// import { useAuthStore } from "../store/useAuthStore";
// import api from "../services/api";
// import { auth } from "../services/firebase";

// let socketInstance = null;

// // ─── Get or create a singleton socket ────────────────────────────────────────
// async function getSocket() {
//   if (socketInstance?.connected) return socketInstance;

//   const token = await auth.currentUser?.getIdToken();
//   if (!token) throw new Error("Not authenticated");

//   socketInstance = io(
//     import.meta.env.VITE_API_URL?.replace("/api", "") ||
//       "http://localhost:5000",
//     {
//       auth: { token },
//       transports: ["websocket"],
//       reconnection: true,
//       reconnectionAttempts: 5,
//       reconnectionDelay: 1000,
//     },
//   );

//   return socketInstance;
// }

// // ─── useChat hook ─────────────────────────────────────────────────────────────
// export function useChat(bookingId) {
//   const user = useAuthStore((s) => s.user);

//   const [messages, setMessages] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [sending, setSending] = useState(false);
//   const [connected, setConnected] = useState(false);
//   const [typingUsers, setTypingUsers] = useState(new Set());
//   const [error, setError] = useState(null);

//   const socketRef = useRef(null);
//   const typingTimer = useRef(null);
//   const bottomRef = useRef(null);

//   // ── Scroll to bottom ────────────────────────────────────────────────────────
//   const scrollToBottom = useCallback(() => {
//     setTimeout(
//       () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
//       50,
//     );
//   }, []);

//   // ── Load message history ────────────────────────────────────────────────────
//   const loadMessages = useCallback(async () => {
//     if (!bookingId) return;
//     try {
//       setLoading(true);
//       const res = await api.get(`/chat/${bookingId}/messages`);
//       const data = res.data?.data?.messages ?? res.data?.messages ?? [];
//       setMessages(Array.isArray(data) ? data : []);
//       scrollToBottom();
//     } catch (err) {
//       setError("Failed to load messages");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, [bookingId, scrollToBottom]);

//   // ── Connect socket ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!bookingId || !user) return;

//     let mounted = true;

//     const connect = async () => {
//       try {
//         const socket = await getSocket();
//         socketRef.current = socket;

//         socket.on("connect", () => {
//           if (!mounted) return;
//           setConnected(true);
//           socket.emit("chat:join", { bookingId });
//         });

//         socket.on("disconnect", () => {
//           if (mounted) setConnected(false);
//         });

//         socket.on("chat:message", (msg) => {
//           if (!mounted) return;
//           setMessages((prev) => {
//             // Avoid duplicates
//             if (prev.some((m) => m._id === msg._id)) return prev;
//             return [...prev, msg];
//           });
//           scrollToBottom();
//           // Mark as read
//           api.patch(`/chat/${bookingId}/read`).catch(() => {});
//         });

//         socket.on("chat:typing", ({ userId: typingId, isTyping }) => {
//           if (!mounted || typingId === user._id) return;
//           setTypingUsers((prev) => {
//             const next = new Set(prev);
//             isTyping ? next.add(typingId) : next.delete(typingId);
//             return next;
//           });
//         });

//         socket.on("chat:error", ({ message }) => {
//           if (mounted) setError(message);
//         });

//         // If already connected, join room immediately
//         if (socket.connected) {
//           setConnected(true);
//           socket.emit("chat:join", { bookingId });
//         } else {
//           socket.connect();
//         }
//       } catch (err) {
//         console.error("Socket connection error:", err);
//         setError("Could not connect to chat");
//       }
//     };

//     loadMessages();
//     connect();

//     return () => {
//       mounted = false;
//       if (socketRef.current) {
//         socketRef.current.off("chat:message");
//         socketRef.current.off("chat:typing");
//         socketRef.current.off("chat:error");
//         socketRef.current.off("connect");
//         socketRef.current.off("disconnect");
//       }
//     };
//   }, [bookingId, user, loadMessages, scrollToBottom]);

//   // ── Send message ────────────────────────────────────────────────────────────
//   const sendMessage = useCallback(
//     async (text) => {
//       if (!text.trim() || sending) return;
//       setSending(true);
//       try {
//         if (socketRef.current?.connected) {
//           // Primary: send via socket
//           socketRef.current.emit("chat:message", {
//             bookingId,
//             text: text.trim(),
//           });
//         } else {
//           // Fallback: REST API
//           const res = await api.post(`/chat/${bookingId}/messages`, {
//             text: text.trim(),
//           });
//           const msg = res.data?.data ?? res.data;
//           setMessages((prev) => [...prev, msg]);
//           scrollToBottom();
//         }
//       } catch (err) {
//         setError("Failed to send message");
//       } finally {
//         setSending(false);
//       }
//     },
//     [bookingId, sending, scrollToBottom],
//   );

//   // ── Typing indicator ────────────────────────────────────────────────────────
//   const emitTyping = useCallback(
//     (isTyping) => {
//       socketRef.current?.emit("chat:typing", { bookingId, isTyping });
//     },
//     [bookingId],
//   );

//   const handleTyping = useCallback(() => {
//     emitTyping(true);
//     clearTimeout(typingTimer.current);
//     typingTimer.current = setTimeout(() => emitTyping(false), 2000);
//   }, [emitTyping]);

//   return {
//     messages,
//     loading,
//     sending,
//     connected,
//     typingUsers,
//     error,
//     bottomRef,
//     sendMessage,
//     handleTyping,
//   };
// }

// // ─── useConversations hook ────────────────────────────────────────────────────
// export function useConversations() {
//   const [conversations, setConversations] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetch = async () => {
//       try {
//         setLoading(true);
//         const res = await api.get("/chat/conversations");
//         const data = res.data?.data ?? res.data ?? [];
//         setConversations(Array.isArray(data) ? data : []);
//       } catch (err) {
//         console.error("Failed to load conversations:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetch();
//   }, []);

//   return { conversations, loading };
// }
