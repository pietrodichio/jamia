import { describe, expect, it } from "vitest";
import type { Jam } from "@/api/jams.api";
import { jamFormSchema, jamToFormValues } from "./jam-form";

const buildJam = (overrides: Partial<Jam> = {}): Jam =>
  ({
    id: "jam-1",
    name: "Jam del Lunedì",
    description: null,
    location: {
      description: "Via Padova, 41, Milano",
      place_id: null,
      latitude: null,
      longitude: null,
      google_maps_url: null,
    },
    location_text: "Via Padova, 41, Milano",
    gmaps_link: null,
    location_lat: null,
    location_lng: null,
    starts_at: "2026-10-19T19:00:00+00:00",
    ends_at: "2026-10-19T21:00:00+00:00",
    capacity: 12,
    desired_bases_min: 2,
    desired_bases_max: 6,
    desired_flyers_min: null,
    desired_flyers_max: null,
    auto_promote: true,
    public_participants: true,
    ...overrides,
  }) as unknown as Jam;

const issuePaths = (values: unknown) => {
  const result = jamFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
};

describe("jamToFormValues", () => {
  it("produces valid form values for a jam whose location has null fields", () => {
    expect(issuePaths(jamToFormValues(buildJam()))).toEqual([]);
  });

  it("does not turn missing coordinates into 0", () => {
    const values = jamToFormValues(buildJam());

    expect(values.location.latitude).toBeUndefined();
    expect(values.location.longitude).toBeUndefined();
  });
});

describe("jamFormSchema role limits", () => {
  it("rejects a bases max lower than the bases min", () => {
    const values = jamToFormValues(buildJam({ desired_bases_min: 2, desired_bases_max: 1 }));

    expect(issuePaths(values)).toEqual(["desired_bases_max"]);
  });

  it("rejects a flyers max lower than the flyers min", () => {
    const values = jamToFormValues(buildJam({ desired_flyers_min: 4, desired_flyers_max: 3 }));

    expect(issuePaths(values)).toEqual(["desired_flyers_max"]);
  });

  it("accepts a max equal to the min or left empty", () => {
    expect(issuePaths(jamToFormValues(buildJam({ desired_bases_min: 2, desired_bases_max: 2 })))).toEqual([]);
    expect(issuePaths(jamToFormValues(buildJam({ desired_bases_min: 2, desired_bases_max: null })))).toEqual([]);
  });
});
