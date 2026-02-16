import type { Event } from "@jamia/types/event";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { eventsApi } from "@/api/events.api";
import { EventCardGrid } from "@/components/events/EventCardGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIpLocation } from "@/hooks/useIpLocation";

interface RecommendationsSectionProps {
  userId?: string;
}

export function RecommendationsSection({ userId }: RecommendationsSectionProps) {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const [radius, setRadius] = useState(50);
  const { data: ipLocation, isLoading: isLocationLoading } = useIpLocation();

  const hasLocation = Boolean(ipLocation?.lat && ipLocation?.lng);

  const recommendationsQuery = useQuery<(Event & { distance_meters: number })[]>({
    queryKey: ["events", "recommendations", userId, ipLocation?.lat, ipLocation?.lng, radius],
    enabled: hasLocation,
    queryFn: async () => {
      if (!ipLocation) return [];

      const searchParams = {
        lng: ipLocation.lng,
        lat: ipLocation.lat,
        radius,
      };

      const events = await eventsApi.searchEvents(searchParams);

      // Filter out user's own events
      const filtered = events.filter((event) => event.owner_id !== userId);

      // Limit to 5 recommendations
      return filtered.slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isLocationLoading || recommendationsQuery.isLoading;
  const recommendations = recommendationsQuery.data || [];

  return (
    <Card className="border-primary/10 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{t("sections.recommendations")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <EventCardGrid
            events={recommendations}
            emptyStateContext={{
              hasLocation,
              radius: radius.toString(),
              hasActiveFilters: false,
              onSetLocation: () => navigate("/discover"),
              onExpandRadius: () => {
                const nextRadius = radius < 100 ? 100 : radius < 200 ? 200 : 500;
                setRadius(nextRadius);
              },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
