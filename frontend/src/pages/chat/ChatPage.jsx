// src/pages/chat/ChatPage.jsx
import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { bookingAPI } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { format, isValid, parseISO, isToday, isYesterday } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMsgTime = (val) => {
  if (!val) return "";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  if (!isValid(d)) return "";
  return format(d, "h:mm a");
};

const formatDaySeparator = (val) => {
  if (!val) return "";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  if (!isValid(d)) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
};

const isSameDay = (a, b) => {
  const da = typeof a === "string" ? parseISO(a) : new Date(a);
  const db = typeof b === "string" ? parseISO(b) : new Date(b);
  return (
    isValid(da) &&
    isValid(db) &&
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showAvatar }) {
  return (
    <div
      className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {showAvatar ? (
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mb-1">
          {msg.sender?.avatar ? (
            <img
              src={msg.sender.avatar}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-emerald-700 text-xs font-bold">
              {msg.sender?.name?.charAt(0) ?? "?"}
            </span>
          )}
        </div>
      ) : (
        <div className="w-7 shrink-0" />
      )}

      {/* Bubble */}
      <div className={`max-w-[72%] group`}>
        {showAvatar && !isMine && (
          <p className="text-[10px] text-gray-400 font-medium mb-1 ml-1">
            {msg.sender?.name ?? "User"}
          </p>
        )}
        <div
          className={`
          px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
          ${
            isMine
              ? "bg-emerald-600 text-white rounded-br-sm"
              : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm"
          }
        `}
        >
          {msg.text}
        </div>
        <div
          className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}
        >
          <span className="text-[10px] text-gray-400">
            {formatMsgTime(msg.createdAt)}
          </span>
          {isMine && (
            <span className="text-[10px]">
              {msg.isRead ? (
                <span className="text-emerald-500">✓✓</span>
              ) : (
                <span className="text-gray-300">✓</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day separator ────────────────────────────────────────────────────────────
function DaySeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[11px] text-gray-400 font-medium px-2">
        {formatDaySeparator(date)}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Input bar ────────────────────────────────────────────────────────────────
function ChatInput({ onSend, onTyping, sending, disabled }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || sending || disabled) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-3 p-4 bg-white border-t border-gray-100"
    >
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          disabled={disabled}
          className="w-full resize-none rounded-2xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none px-4 py-3 text-sm text-gray-800 placeholder-gray-400 transition max-h-32 overflow-y-auto"
          style={{ minHeight: 46 }}
        />
      </div>
      <button
        type="submit"
        disabled={!text.trim() || sending || disabled}
        className="shrink-0 w-11 h-11 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
      >
        {sending ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        )}
      </button>
    </form>
  );
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [booking, setBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(true);

  const {
    messages,
    loading,
    sending,
    connected,
    typingUsers,
    error,
    bottomRef,
    sendMessage,
    handleTyping,
    connectChat,
  } = useChatStore();

  // ── Setup Socket Connection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId || !user?._id) return;

    let cleanup = () => {};

    const setupSocket = async () => {
      cleanup = await connectChat(bookingId, user._id);
    };

    setupSocket();

    return () => {
      cleanup();
    };
  }, [bookingId, user?._id, connectChat]);

  // ── Load booking info for header ───────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    const fetch = async () => {
      try {
        const res = await bookingAPI.getBookingDetails(bookingId);
        setBooking(res.data?.data ?? res.data);
      } catch {
        navigate("/");
      } finally {
        setBookingLoading(false);
      }
    };
    fetch();
  }, [bookingId, navigate]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const item =
    booking?.property ?? booking?.service ?? booking?.experience ?? null;
  const otherPerson = booking
    ? user?._id === booking.guest?._id?.toString() ||
      user?._id === booking.guest?.toString()
      ? booking.host
      : booking.guest
    : null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500"
        >
          ←
        </button>

        {bookingLoading ? (
          <div className="flex-1 h-10 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <div className="flex-1 flex items-center gap-3 min-w-0">
            {/* Other person avatar */}
            <div className="w-10 h-10 rounded-full bg-emerald-100 shrink-0 flex items-center justify-center">
              {otherPerson?.avatar ? (
                <img
                  src={otherPerson.avatar}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-emerald-700 font-bold">
                  {otherPerson?.name?.charAt(0) ?? "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {otherPerson?.name ?? "Chat"}
              </p>
              {item?.title && (
                <p className="text-xs text-gray-400 truncate">
                  📋 {item.title}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Connection status dot */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-gray-300"}`}
          />
          <span className="text-xs text-gray-400">
            {connected ? "Live" : "Offline"}
          </span>
        </div>

        {/* Link to booking detail */}
        {booking && (
          <Link
            to={`/bookings/${bookingId}`}
            className="shrink-0 px-3 py-1.5 text-xs font-bold text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition"
          >
            View Booking
          </Link>
        )}
      </div>

      {/* ── Messages area ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-center">
            <p className="text-5xl mb-4">👋</p>
            <p className="font-bold text-gray-700">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Start the conversation about your booking.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const isMine =
              msg.sender?._id === user?._id ||
              msg.sender?._id === user?.mongoId ||
              msg.sender === user?._id;
            const showDay = !prev || !isSameDay(prev.createdAt, msg.createdAt);
            const showAvatar =
              !prev || prev.sender?._id !== msg.sender?._id || showDay;

            return (
              <div key={msg._id ?? idx}>
                {showDay && <DaySeparator date={msg.createdAt} />}
                <MessageBubble
                  msg={msg}
                  isMine={isMine}
                  showAvatar={showAvatar}
                />
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <ChatInput
        onSend={sendMessage}
        onTyping={handleTyping}
        sending={sending}
        disabled={!connected && messages.length === 0}
      />
    </div>
  );
}
