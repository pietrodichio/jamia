import { LocationSearch } from '@/components/search/LocationSearch';
import { KeywordSearch } from '@/components/search/KeywordSearch';
import { EventFilters } from '@/components/events/EventFilters';
import { EventList } from '@/components/events/EventList';

const DiscoverEvents = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">Discover Events</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1 space-y-4">
            <LocationSearch />
            <KeywordSearch />
            <EventFilters />
          </aside>

          {/* Main Content - Event List */}
          <main className="lg:col-span-3">
            <EventList />
          </main>
        </div>
      </div>
    </div>
  );
};

export default DiscoverEvents;
