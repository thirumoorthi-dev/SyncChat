import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

export function formatMessageTime(date) {
  const d = new Date(date);
  return format(d, 'HH:mm');
}

export function formatConversationTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEEE');
  return format(d, 'dd/MM/yyyy');
}

export function formatLastSeen(date, isOnline) {
  if (isOnline) return 'online';
  if (!date) return 'last seen a while ago';
  const d = new Date(date);
  if (isToday(d)) return `last seen today at ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`;
  return `last seen ${format(d, 'dd/MM/yyyy')} at ${format(d, 'HH:mm')}`;
}
