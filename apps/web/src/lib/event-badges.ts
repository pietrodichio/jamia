export const getEventTypeBadgeColorClasses = (type: string): string => {
  const typeStyles: Record<string, string> = {
    jam: 'bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white border-amber-600 hover:from-amber-600/90 hover:to-orange-600/90',
    class: 'bg-gradient-to-r from-blue-500/90 to-cyan-500/90 text-white border-blue-600 hover:from-blue-600/90 hover:to-cyan-600/90',
    workshop: 'bg-gradient-to-r from-purple-500/90 to-violet-500/90 text-white border-purple-600 hover:from-purple-600/90 hover:to-violet-600/90',
    convention: 'bg-gradient-to-r from-pink-500/90 to-rose-500/90 text-white border-pink-600 hover:from-pink-600/90 hover:to-rose-600/90',
  };

  return typeStyles[type] || 'bg-muted text-foreground border-border';
};
