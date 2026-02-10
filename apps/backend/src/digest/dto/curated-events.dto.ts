export interface DigestEvent {
  id: string;
  type: 'convention' | 'workshop' | 'jam';
  title: string;
  starts_at: string;
  ends_at: string;
  location_city: string;
  image_url: string | null;
  created_at: string;
}

export interface GroupedEvents {
  conventions: DigestEvent[];
  workshops: DigestEvent[];
  jams: DigestEvent[];
}

export interface CuratedEvents {
  upcoming: GroupedEvents;
  new: GroupedEvents;
}

export interface SubscribedUser {
  user_id: string;
  email: string;
  first_name: string | null;
  unsubscribe_token: string;
  last_digest_sent_at: string | null;
  digest_frequency: 'weekly' | 'monthly';
}
