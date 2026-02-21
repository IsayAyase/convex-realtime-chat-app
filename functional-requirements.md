# Functional Requirements

## Required Features

### 1. Authentication
- Set up Clerk so users can sign up (email or social login), log in, and log out
- Display the logged-in user's name and avatar
- Store user profiles in Convex so other users can discover them

### 2. User List & Search
- Show all registered users (excluding yourself)
- Add a search bar that filters users by name as you type
- Clicking a user opens or creates a conversation with them

### 3. One-on-One Direct Messages
- Users can have private conversations
- Messages appear in real time for both sides using Convex subscriptions
- Show a sidebar listing all conversations with a preview of the most recent message

### 4. Message Timestamps
- Today's messages show time only (e.g., "2:34 PM")
- Older messages show date + time (e.g., "Feb 15, 2:34 PM")
- Messages from a different year include the year

### 5. Empty States
- Show helpful messages when:
  - No conversations yet
  - No messages in a conversation
  - No search results

### 6. Responsive Layout
- Desktop: sidebar + chat area side by side
- Mobile: conversation list as default view, tapping a conversation opens full-screen chat with a back button

---

## Optional Features

### 7. Online/Offline Status
- Show a green indicator next to users who currently have the app open
- Update in real time when users come online or go offline

### 8. Typing Indicator
- Show "Alex is typing..." or a pulsing dots animation when the other user is typing
- Disappear after 2 seconds of inactivity or when the message is sent

### 9. Unread Message Count
- Show a badge on each conversation in the sidebar with the number of unread messages
- Clear the badge when the user opens that conversation
- Update in real time

### 10. Smart Auto-Scroll
- Scroll to the latest message automatically when new messages arrive
- If the user has scrolled up to read older messages, don't force-scroll
- Show a "↓ New messages" button instead

### 11. Delete Own Messages
- Users can delete messages they sent
- Show "This message was deleted" in italics for all users
- Use soft delete (don't remove the record from Convex)

### 12. Message Reactions
- Users can react to any message with a fixed set of emojis (👍 ❤ 😂 😮 😢)
- Clicking the same reaction again removes it
- Show reaction counts below the message

### 13. Loading & Error States
- Show skeleton loaders or spinners while data is loading
- If a message fails to send, show an error with a retry option
- Handle network/service errors gracefully

### 14. Group Chat
- Users can create a group conversation by picking multiple members and giving it a name
- All members see messages in real time
- Show group name and member count in the sidebar
