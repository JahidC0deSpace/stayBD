// src/pages/chat/ConversationsPage.jsx
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { FiArrowLeft } from "react-icons/fi";
import { format, isValid, parseISO, isToday, isYesterday } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatLastSeen = (val) => {
  if (!val) return "";
  const d = typeof val === "string" ? parseISO(val) : new Date(val);
  if (!isValid(d)) return "";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

const TYPE_ICONS = { property: "🏠", service: "🔧", experience: "🎨" };

// ─── Conversation card ────────────────────────────────────────────────────────
function ConversationCard({ convo, currentUserId }) {
  const otherPerson =
    convo.guest?._id === currentUserId || convo.guest === currentUserId
      ? (convo.host ?? convo.provider)
      : convo.guest;

  const item = convo.property ?? convo.service ?? convo.experience ?? null;
  const typeIcon = TYPE_ICONS[convo.bookingType] ?? "📋";
  const lastMsg = convo.lastMessage;
  const unread = convo.unreadCount ?? 0;
  const isMyMsg =
    lastMsg?.sender === currentUserId || lastMsg?.sender?._id === currentUserId;

  return (
    <Link
      to={`/chat/${convo._id}`}
      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition group"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          {otherPerson?.avatar ? (
            <img
              src={otherPerson.avatar}
              alt={otherPerson?.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-emerald-700 font-bold text-lg">
              {otherPerson?.name?.charAt(0) ?? "?"}
            </span>
          )}
        </div>
        {/* Type icon badge */}
        <span className="absolute -bottom-0.5 -right-0.5 text-sm">
          {typeIcon}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-gray-900 text-sm truncate">
            {otherPerson?.name ?? "Unknown"}
          </p>
          <span className="text-[11px] text-gray-400 shrink-0">
            {formatLastSeen(lastMsg?.createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {item?.title ?? "Booking"}
        </p>
        <p
          className={`text-sm mt-1 truncate ${
            unread > 0 ? "font-semibold text-gray-800" : "text-gray-400"
          }`}
        >
          {lastMsg ? (
            <>
              {isMyMsg && <span className="text-gray-400">You: </span>}
              {lastMsg.text}
            </>
          ) : (
            <span className="italic">No messages yet</span>
          )}
        </p>
      </div>

      {/* Unread badge */}
      {unread > 0 && (
        <div className="shrink-0 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
          {unread > 9 ? "9+" : unread}
        </div>
      )}
    </Link>
  );
}

// ─── Main ConversationsPage ───────────────────────────────────────────────────
export default function ConversationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    conversations,
    conversationsLoading: loading,
    fetchConversations,
    listenForGlobalNotifications, // 👈 Hooked in from the store
  } = useChatStore();

  useEffect(() => {
    // 1. Fetch initial list
    fetchConversations();

    // 2. Setup real-time listener for new messages
    let cleanupSocket = () => {};

    const setupLiveUpdates = async () => {
      // This will connect the socket and listen for "notification:message"
      cleanupSocket = await listenForGlobalNotifications();
    };

    setupLiveUpdates();

    // 3. Clean up the listener when leaving the page
    return () => {
      cleanupSocket();
    };
  }, [fetchConversations, listenForGlobalNotifications]);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount ?? 0),
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors group"
            >
              <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            {totalUnread > 0 && (
              <p className="text-sm text-emerald-600 font-medium mt-0.5">
                {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="xl" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-5xl mb-4">💬</p>
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              No conversations yet
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mb-6">
              Once you make a booking, you can message your host or service
              provider here.
            </p>
            <Link
              to="/"
              className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition text-sm"
            >
              Explore Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((convo) => (
              <ConversationCard
                key={convo._id}
                convo={convo}
                currentUserId={user?._id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
