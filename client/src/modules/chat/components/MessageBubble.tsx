// import React, { useState, useLayoutEffect, useRef } from 'react';
// import gsap from 'gsap';
// import { formatMessageTime } from '../../../shared/utils/formatTime';
// import { Message } from '../../../types/chat';

// const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// const formatFileSize = (bytes?: number | string | null) => {
//   if (!bytes) return '';
//   const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
//   if (b < 1024) return `${b} B`;
//   if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
//   return `${(b / (1024 * 1024)).toFixed(1)} MB`;
// };

// interface MessageBubbleProps {
//   message: Message;
//   isOwn: boolean;
//   showSender?: boolean;
//   onReply?: (msg: Message) => void;
//   onEdit?: (msg: Message) => void;
//   onDelete?: (msg: Message) => void;
//   onReaction?: (msg: Message, emoji: string) => void;
//   onForward?: (msg: Message) => void;
//   onMediaClick?: (url: string, type: 'image' | 'video' | 'document') => void;
//   highlight?: string;
// }

// export default function MessageBubble({
//   message,
//   isOwn,
//   showSender = false,
//   onReply,
//   onEdit,
//   onDelete,
//   onReaction,
//   onForward,
//   onMediaClick,
//   highlight
// }: MessageBubbleProps) {
//   const [showMenu, setShowMenu] = useState(false);
//   const bubbleRef = useRef<HTMLDivElement>(null);

//   const isOnlyEmojis = (text: string) => {
//     if (!text) return false;
//     // Match emojis and optional skin tone modifiers/joiners
//     const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+(\ufe0f|\u200d)?$/u;
//     const cleanText = text.replace(/\s/g, '');
//     if (!emojiRegex.test(cleanText)) return false;
//     // Count actual emojis (handling surrogates)
//     const count = [...cleanText].length;
//     return count <= 3 ? count : false;
//   };

//   const emojiCount = message.content ? isOnlyEmojis(message.content) : false;
//   const isImageOnly = message.message_type === 'image' && !message.content;

//   useLayoutEffect(() => {
//     if (bubbleRef.current) {
//       gsap.from(bubbleRef.current, {
//         scale: 0.85,
//         opacity: 0,
//         duration: 0.5,
//         ease: 'back.out(1.7)',
//         x: isOwn ? 30 : -30,
//         clearProps: 'all'
//       });
//     }
//   }, []);

//   const handleReactionClick = (emoji: string) => {
//     onReaction?.(message, emoji);
//   };

//   const VITE_BASEURL = import.meta.env.VITE_BASEURL as string;
//   const MEDIA_BASE = VITE_BASEURL && VITE_BASEURL.startsWith('http') ? new URL(VITE_BASEURL).origin : '';

//   // Group reactions by emoji
//   const reactionGroups = message.reactions?.reduce((acc: any, r: any) => {
//     acc[r.reaction] = (acc[r.reaction] || 0) + 1;
//     return acc;
//   }, {});

//   const highlightText = (text: string, highlight?: string) => {
//     if (!highlight || !highlight.trim()) return text;
//     const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
//     return (
//       <span>
//         {parts.map((part, i) =>
//           part.toLowerCase() === highlight.toLowerCase() ? (
//             <mark key={i} className="bg-[var(--teal)] text-white rounded-sm px-0.5">{part}</mark>
//           ) : (
//             part
//           )
//         )}
//       </span>
//     );
//   };

//   return (
//     <div className={`flex message-bubble group ${isOwn ? 'justify-end' : 'justify-start'} px-3 py-0.5`}>
//       <div className="relative max-w-[68%] min-w-[120px]">

//         {/* Action Menu Trigger (Three dots) */}
//         {!message.is_deleted && (
//           <div className={`absolute top-0 ${isOwn ? 'right-full mr-1' : 'left-full ml-1'} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
//             <div className="relative">
//               <button
//                 onClick={() => setShowMenu(!showMenu)}
//                 className="p-1 rounded-full hover:bg-[var(--hover)] text-[var(--subtext)]"
//               >
//                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
//                   <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
//                 </svg>
//               </button>
//               {showMenu && (
//                 <div 
//                   className={`absolute top-full ${isOwn ? 'right-0' : 'left-0'} mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg shadow-xl py-1 z-20 min-w-[100px]`}
//                   onMouseLeave={() => setShowMenu(false)}
//                 >
//                   <button onClick={() => { onReply?.(message); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Reply</button>
//                   {isOwn && (
//                     <>
//                       <button onClick={() => { onEdit?.(message); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Edit</button>
//                       <button onClick={() => { onDelete?.(message); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)] text-red-500">Delete</button>
//                     </>
//                   )}
//                   <button onClick={() => { onForward?.(message); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Forward</button>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Reaction hover strip */}
//         {!message.is_deleted && (
//           <div
//             className={`reaction-strip absolute ${isOwn ? 'right-full mr-8' : 'left-full ml-8'} top-1/2 -translate-y-1/2
//               flex items-center gap-0.5 bg-[var(--panel)] border border-[var(--border)] rounded-full px-2 py-1 shadow-md z-10`}
//           >
//             {REACTIONS.map(r => (
//               <button
//                 key={r}
//                 onClick={() => handleReactionClick(r)}
//                 className="text-sm hover:scale-125 transition-transform duration-100 cursor-pointer"
//                 title={`React with ${r}`}
//               >
//                 {r}
//               </button>
//             ))}
//           </div>
//         )}

//         <div 
//           ref={bubbleRef}
//           className={isOwn ? 'bubble-sent' : 'bubble-received'} 
//           style={{ padding: isImageOnly ? '2px' : emojiCount ? '12px 16px 8px' : '8px 12px 6px' }}
//         >
//           {/* Group sender name */}
//           {showSender && !isOwn && (
//             <p
//               className="text-xs font-semibold mb-1 truncate"
//               style={{ color: message.sender_avatar_color || 'var(--teal)' }}
//             >
//               {message.sender_username}
//             </p>
//           )}

//           {/* Quoted Message */}
//           {message.replied_to_id && !message.is_deleted && (
//             <div className="mb-2 p-2 rounded bg-[var(--bg)] border-l-4 border-[var(--teal)] opacity-80 text-[11px]">
//               <p className="font-bold mb-0.5" style={{ color: 'var(--teal)' }}>
//                 {message.parent_message_sender || 'User'}
//               </p>
//               <p className="truncate" style={{ color: 'var(--subtext)' }}>
//                 {message.parent_message_content}
//               </p>
//             </div>
//           )}

//           {/* Message Content */}
//           <div className="flex flex-col">
//             {message.is_deleted ? (
//                <p className="text-sm italic opacity-60" style={{ color: 'var(--text)' }}>
//                   🚫 This message was deleted
//                </p>
//             ) : (
//               <>
//                 {/* Image Rendering */}
//                 {message.message_type === 'image' && message.media_url && (
//                   <div 
//                     onClick={() => onMediaClick?.(message.media_url!, 'image')}
//                     className={`${message.content ? 'mb-2' : ''} overflow-hidden rounded-lg cursor-pointer bg-[var(--bg)] border border-[var(--border)] max-w-full`}
//                   >
//                     <img 
//                       src={message.media_thumbnail_url || message.media_url} 
//                       alt="Shared media"
//                       className="w-full h-auto object-cover max-h-[350px] hover:opacity-95 transition-opacity"
//                       loading="lazy"
//                     />
//                   </div>
//                 )}

//                 {message.message_type === 'file' && message.media_url && (
//                   <div 
//                     onClick={() => onMediaClick?.(message.media_url!, 'document')}
//                     className="flex items-center gap-3 p-3 mb-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--hover)] transition-colors border border-[var(--border)] cursor-pointer"
//                   >
//                     <div className="w-10 h-10 rounded bg-[var(--teal)] flex items-center justify-center flex-shrink-0 text-white shadow-sm">
//                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                       </svg>
//                     </div>
//                     <div className="flex-1 min-w-0 overflow-hidden">
//                       <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
//                         {message.media_filename || 'Attachment'}
//                       </p>
//                       <p className="text-[10px]" style={{ color: 'var(--subtext)' }}>
//                         {formatFileSize(message.media_size_bytes)}
//                       </p>
//                     </div>
//                     <svg className="w-4 h-4 text-[var(--subtext)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//                     </svg>
//                   </div>
//                 )}

//                 {/* Text Content */}
//                 {message.content && (
//                   <div 
//                     className={`relative leading-[1.4] break-words ${emojiCount ? 'text-4xl py-2' : 'text-[14.2px] pr-[60px]'}`} 
//                     style={{ color: 'var(--text)' }}
//                   >
//                     {highlightText(message.content, highlight)}

//                     {/* Inline Timestamp for non-emoji messages */}
//                     {!emojiCount && (
//                       <div className="absolute bottom-[-2px] right-[-4px] flex items-center gap-1 pl-4 select-none">
//                         {message.is_edited && !message.is_deleted && (
//                           <span className="text-[9px] italic opacity-60" style={{ color: 'var(--subtext)' }}>edited</span>
//                         )}
//                         <span className="text-[10px] opacity-60" style={{ color: 'var(--subtext)' }}>
//                           {formatMessageTime(message.created_at)}
//                         </span>
//                         {isOwn && (
//                           <span className="flex-shrink-0 flex items-center">
//                             {message.is_read ? (
//                               <svg className="w-[15px] h-[15px]" style={{ color: '#53BDEB' }} fill="currentColor" viewBox="0 0 16 15">
//                                 <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.503zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
//                               </svg>
//                             ) : message.is_delivered ? (
//                               <svg className="w-[15px] h-[15px] opacity-60" style={{ color: 'var(--subtext)' }} fill="currentColor" viewBox="0 0 16 15">
//                                 <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.503zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
//                               </svg>
//                             ) : (
//                               <svg className="w-[14px] h-[14px] opacity-60" style={{ color: 'var(--subtext)' }} fill="currentColor" viewBox="0 0 16 15">
//                                 <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
//                               </svg>
//                             )}
//                           </span>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </>
//             )}

//             {reactionGroups && Object.keys(reactionGroups).length > 0 && (
//               <div 
//                 className={`absolute -bottom-3 ${isOwn ? 'right-2' : 'left-2'} flex items-center gap-0.5 px-1 py-0.5 rounded-full shadow-sm z-10`}
//                 style={{ background: 'var(--panel)', border: `2px solid ${isOwn ? 'var(--sent)' : 'var(--received)'}` }}
//               >
//                 {Object.entries(reactionGroups).map(([emoji, count]: [string, any]) => (
//                   <div 
//                     key={emoji} 
//                     className="flex items-center gap-0.5 text-[11px]"
//                     style={{ color: 'var(--text)' }}
//                   >
//                     <span>{emoji}</span>
//                     {Object.keys(reactionGroups).length === 1 && count > 1 && (
//                       <span className="font-medium opacity-80 ml-0.5">{count}</span>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Separator Timestamp for emoji-only messages */}
//           {emojiCount && (
//             <div className="flex items-center gap-1 mt-1 justify-end select-none">
//               <span className="text-[10px] opacity-60" style={{ color: 'var(--text)' }}>
//                 {formatMessageTime(message.created_at)}
//               </span>
//               {isOwn && (
//                  <span className="flex-shrink-0 flex items-center">
//                    {message.is_read ? (
//                      <svg className="w-[15px] h-[15px]" style={{ color: '#53BDEB' }} fill="currentColor" viewBox="0 0 16 15">
//                        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.503zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
//                      </svg>
//                    ) : (
//                      <svg className="w-[15px] h-[15px] opacity-60" style={{ color: 'var(--subtext)' }} fill="currentColor" viewBox="0 0 16 15">
//                        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.503zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
//                      </svg>
//                    )}
//                  </span>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useState, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { formatMessageTime } from '../../../shared/utils/formatTime';
import { Message } from '../../../types/chat';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const formatFileSize = (bytes?: number | string | null) => {
  if (!bytes) return '';
  const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  onDelete?: (msg: Message) => void;
  onReaction?: (msg: Message, emoji: string) => void;
  onForward?: (msg: Message) => void;
  onMediaClick?: (url: string, type: 'image' | 'video' | 'document') => void;
  highlight?: string;
}

export default function MessageBubble({
  message,
  isOwn,
  showSender = false,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onForward,
  onMediaClick,
  highlight,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionStrip, setShowReactionStrip] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const isOnlyEmojis = (text: string): number | false => {
    if (!text) return false;
    const emojiRegex =
      /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+(\ufe0f|\u200d)?$/u;
    const cleanText = text.replace(/\s/g, '');
    if (!emojiRegex.test(cleanText)) return false;
    const count = [...cleanText].length;
    return count <= 3 ? count : false;
  };

  const emojiCount = message.content ? isOnlyEmojis(message.content) : false;
  const isImageOnly = message.message_type === 'image' && !message.content;

  useLayoutEffect(() => {
    if (bubbleRef.current) {
      gsap.from(bubbleRef.current, {
        scale: 0.92,
        opacity: 0,
        duration: 0.22,
        ease: 'back.out(1.4)',
        x: isOwn ? 16 : -16,
        clearProps: 'all',
      });
    }
  }, []);

  // Group reactions by emoji
  const reactionGroups = message.reactions?.reduce(
    (acc: Record<string, number>, r: any) => {
      acc[r.reaction] = (acc[r.reaction] || 0) + 1;
      return acc;
    },
    {}
  );
  const hasReactions = reactionGroups && Object.keys(reactionGroups).length > 0;

  const highlightText = (text: string, hl?: string) => {
    if (!hl || !hl.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${hl})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === hl.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400 text-black rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // ── Tick icons ──
  const TickIcon = () => {
    if (!isOwn) return null;
    if (message.is_read)
      return (
        <svg className="w-[17px] h-[17px] flex-shrink-0" style={{ color: '#53BDEB' }} fill="currentColor" viewBox="0 0 16 15">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.503zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
        </svg>
      );
    if (message.is_delivered)
      return (
        <svg className="w-[17px] h-[17px] flex-shrink-0 opacity-55" style={{ color: 'var(--subtext)' }} fill="currentColor" viewBox="0 0 16 15">
          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.503zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
        </svg>
      );
    return (
      <svg className="w-[17px] h-[17px] flex-shrink-0 opacity-55" style={{ color: 'var(--subtext)' }} fill="currentColor" viewBox="0 0 16 15">
        <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
      </svg>
    );
  };

  const MetaInline = ({ onImage = false }: { onImage?: boolean }) => (
    <span
      className="inline-flex items-center gap-[2px] select-none whitespace-nowrap"
      style={{ color: onImage ? 'rgba(255,255,255,0.85)' : 'var(--subtext)' }}
    >
      {message.is_edited && !message.is_deleted && (
        <span className="text-[10px] italic opacity-70 mr-0.5">edited</span>
      )}
      <span className="text-[11px]">{formatMessageTime(message.created_at)}</span>
      <TickIcon />
    </span>
  );

  const bubbleRadius = isOwn ? '8px 0px 8px 8px' : '0px 8px 8px 8px';
  const bubbleBg = isOwn ? 'var(--sent)' : 'var(--received)';

  return (
    // Full-width row — WhatsApp uses ~8px side padding, generous max-width
    <div
      className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} py-[2px]`}
      style={{ paddingLeft: 8, paddingRight: 8 }}
    >
      {/* Bubble container — 75% max keeps timestamps from clipping */}
      <div
        className="relative group"
        style={{ maxWidth: '75%', minWidth: 80, marginBottom: hasReactions ? 18 : 0 }}
      >

        {/* ── Hover controls ── */}
        {!message.is_deleted && (
          <div
            className={`
              absolute top-1 z-20
              flex items-center gap-1
              opacity-0 group-hover:opacity-100 transition-opacity duration-150
              ${isOwn ? 'right-[calc(100%+4px)]' : 'left-[calc(100%+4px)]'}
            `}
          >
            <div
              className="flex items-center gap-0.5 rounded-full px-2 py-1 shadow-lg"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
            >
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => onReaction?.(message, r)}
                  className="text-[15px] leading-none hover:scale-125 transition-transform duration-100"
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-1.5 rounded-full hover:bg-[var(--hover)]"
                style={{ color: 'var(--subtext)' }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
              {showMenu && (
                <div
                  className={`absolute top-full mt-1 ${isOwn ? 'right-0' : 'left-0'} rounded-lg shadow-xl py-1 z-30`}
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)', minWidth: 130 }}
                  onMouseLeave={() => setShowMenu(false)}
                >
                  <button onClick={() => { onReply?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Reply</button>
                  {isOwn && (
                    <>
                      <button onClick={() => { onEdit?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Edit</button>
                      <button onClick={() => { onDelete?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--hover)] text-red-500">Delete</button>
                    </>
                  )}
                  <button onClick={() => { onForward?.(message); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--hover)]" style={{ color: 'var(--text)' }}>Forward</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bubble ── */}
        <div
          ref={bubbleRef}
          style={{
            background: bubbleBg,
            borderRadius: bubbleRadius,
            padding: isImageOnly ? '3px' : emojiCount ? '8px 14px 6px' : '7px 12px 8px 10px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            // Extra bottom margin so reaction pill doesn't overlap content below
            marginBottom: hasReactions ? 16 : 0,
          }}
        >
          {/* Group sender */}
          {showSender && !isOwn && (
            <p className="text-[12.5px] font-semibold mb-1 truncate leading-tight" style={{ color: message.sender_avatar_color || 'var(--teal)' }}>
              {message.sender_username}
            </p>
          )}

          {/* Reply quote */}
          {message.replied_to_id && !message.is_deleted && (
            <div
              className="flex overflow-hidden mb-1.5"
              style={{ borderRadius: 4, background: isOwn ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.14)' }}
            >
              <div style={{ width: 3, flexShrink: 0, background: 'var(--teal)', borderRadius: '4px 0 0 4px' }} />
              <div className="px-2 py-1.5 min-w-0">
                <p className="text-[11.5px] font-semibold leading-tight mb-0.5" style={{ color: 'var(--teal)' }}>
                  {message.parent_message_sender || 'User'}
                </p>
                <p className="text-[11.5px] truncate leading-tight opacity-75" style={{ color: 'var(--text)' }}>
                  {message.parent_message_content}
                </p>
              </div>
            </div>
          )}

          {/* Body */}
          {message.is_deleted ? (
            <div className="flex items-end gap-2">
              <p className="text-[13px] italic opacity-50 flex-1" style={{ color: 'var(--text)' }}>
                🚫 This message was deleted
              </p>
              <div className="flex-shrink-0"><MetaInline /></div>
            </div>
          ) : (
            <>
              {/* Image */}
              {message.message_type === 'image' && message.media_url && (
                <div
                  onClick={() => onMediaClick?.(message.media_url!, 'image')}
                  className={`overflow-hidden cursor-pointer relative ${message.content ? 'mb-1.5' : ''}`}
                  style={{ borderRadius: 6, maxWidth: 300 }}
                >
                  <img
                    src={message.media_thumbnail_url || message.media_url}
                    alt="Shared media"
                    style={{ width: '100%', height: 'auto', maxHeight: 300, objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  {isImageOnly && (
                    <div
                      className="absolute bottom-1.5 right-1.5 flex items-center px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                      <MetaInline onImage />
                    </div>
                  )}
                </div>
              )}

              {/* File */}
              {message.message_type === 'file' && message.media_url && (
                <div
                  onClick={() => onMediaClick?.(message.media_url!, 'document')}
                  className="flex items-center gap-3 mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ padding: '10px 12px', borderRadius: 8, background: isOwn ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--teal)' }}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{message.media_filename || 'Attachment'}</p>
                    <p className="text-[11px] opacity-65" style={{ color: 'var(--subtext)' }}>{formatFileSize(message.media_size_bytes)}</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0 opacity-55" style={{ color: 'var(--subtext)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              )}

              {/* Text */}
              {message.content && (
                emojiCount ? (
                  <div>
                    <div className="text-[42px] leading-tight tracking-wide py-1">{message.content}</div>
                    <div className="flex justify-end mt-0.5"><MetaInline /></div>
                  </div>
                ) : (
                  // Phantom spacer trick — reserves room for timestamp so text never overlaps
                  <div className="relative">
                    <p
                      className="text-[14px] leading-[1.45] break-words whitespace-pre-wrap"
                      style={{ color: 'var(--text)', wordBreak: 'break-word' }}
                    >
                      {highlightText(message.content, highlight)}
                      {/* Invisible spacer: 76px for sent (time+2ticks), 46px for received (time only) */}
                      <span
                        aria-hidden
                        style={{ display: 'inline-block', width: isOwn ? 76 : 46, height: 10, verticalAlign: 'bottom' }}
                      />
                    </p>
                    {/* Absolute timestamp — never overlaps thanks to spacer above */}
                    <div className="absolute bottom-0 right-0 flex items-center" style={{ lineHeight: 1 }}>
                      <MetaInline />
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* ── Reaction pill — sits just outside bubble bottom ── */}
        {hasReactions && (
          <div
            className={`absolute flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-md z-10 ${isOwn ? 'right-2' : 'left-2'}`}
            style={{
              top: '100%',
              marginTop: 2,
              background: 'var(--panel)',
              border: `1.5px solid ${isOwn ? 'var(--sent)' : 'var(--received)'}`,
            }}
          >
            {Object.entries(reactionGroups!).map(([emoji, count]: [string, any]) => (
              <div key={emoji} className="flex items-center gap-0.5 text-[13px]">
                <span>{emoji}</span>
                {count > 1 && (
                  <span className="text-[10px] font-semibold ml-0.5" style={{ color: 'var(--subtext)' }}>{count}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}