export const generateEventGradient = (id: string | number, title?: string): string => {
  // Use ID first, fallback to title if ID is not available
  const seed = id?.toString() || title || 'default';

  // Deterministic hash for palette selection
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  const gradients = [
    { from: 'hsl(196, 84%, 55%)', to: 'hsl(220, 80%, 62%)' }, // ocean
    { from: 'hsl(26, 88%, 58%)', to: 'hsl(14, 86%, 62%)' }, // sunrise
    { from: 'hsl(280, 72%, 60%)', to: 'hsl(310, 74%, 62%)' }, // orchid
    { from: 'hsl(160, 70%, 45%)', to: 'hsl(178, 70%, 50%)' }, // lagoon
    { from: 'hsl(48, 90%, 58%)', to: 'hsl(36, 88%, 58%)' }, // sand
    { from: 'hsl(210, 75%, 58%)', to: 'hsl(190, 70%, 52%)' }, // arctic
    { from: 'hsl(330, 78%, 60%)', to: 'hsl(350, 80%, 60%)' }, // berry
    { from: 'hsl(120, 55%, 48%)', to: 'hsl(140, 55%, 52%)' }, // meadow
    { from: 'hsl(12, 78%, 56%)', to: 'hsl(28, 82%, 58%)' }, // ember
    { from: 'hsl(200, 70%, 52%)', to: 'hsl(240, 72%, 58%)' }, // dusk
  ];

  const gradient = gradients[Math.abs(hash) % gradients.length];

  // Vary gradient direction (45deg, 90deg, 135deg, 180deg, 225deg)
  const directions = [45, 90, 135, 180, 225];
  const direction = directions[Math.abs(hash) % directions.length];

  return `linear-gradient(${direction}deg, ${gradient.from}, ${gradient.to})`;
};
