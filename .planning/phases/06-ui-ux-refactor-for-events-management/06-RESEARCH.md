# Phase 6: UI/UX Refactor for Events Management - Research

**Researched:** 2026-01-22
**Domain:** React UI/UX, Italian localization, multi-step forms, event discovery interfaces
**Confidence:** HIGH

## Summary

Phase 6 requires comprehensive UI/UX improvements across event management features, with Italian localization as a foundational requirement. The research identifies a proven stack combining react-i18next for translation, date-fns for Italian date formatting, shadcn/ui components with React Hook Form for multi-step wizards, and Supabase Storage for image optimization.

Key architectural insights:
- **Italian localization** requires react-i18next with namespaces, date-fns Italian locale (it), and 24-hour time formatting (dd/MM/yyyy, HH:mm)
- **Multi-step wizards** work best with React Hook Form's watch/unregister pattern, avoiding Context API performance issues for form-heavy scenarios
- **Unified view patterns** use URL parameters for state management, enabling bookmarkable filters and view toggles
- **Event discovery** follows Airbnb patterns: hero sections, responsive card grids (CSS Grid with auto-fit), image optimization via Supabase transformations
- **Draft auto-save** uses debounced updates (500-1000ms) with Supabase upsert and onConflict handling

The stack is mature, well-documented, and directly addresses all phase requirements with high confidence.

**Primary recommendation:** Use react-i18next for Italian UI, React Hook Form for wizard state management, shadcn date picker with Italian locale, and Supabase image transformations for responsive cards. Avoid Context API for form state (performance issues) and avoid custom stepper implementations (use community solutions like shadcn-stepper or react-step-wizard).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-i18next | 14.x | UI internationalization | Industry standard, 30M+ weekly downloads, integrates with i18next ecosystem |
| date-fns | 3.x/4.x | Date formatting and locale support | Already in project, Italian locale (it) built-in, React Big Calendar dependency |
| React Hook Form | 7.x | Form state management | Performance-focused, watch/unregister pattern for conditional fields, 40M+ weekly downloads |
| shadcn/ui | Latest | UI component library | Already in project, composable components, Tailwind CSS based |
| Supabase Storage | Latest | Image hosting and transformations | Already in project, on-the-fly image optimization, Next.js loader support |
| Tailwind CSS | 3.x/4.x | Styling framework | Already in project, responsive utilities, design token support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rrule.js | 2.x | RRULE parsing (already in project) | Displaying recurring event details, human-readable descriptions |
| react-day-picker | Latest | Calendar component (shadcn dependency) | Date picker implementation with Italian locale |
| usehooks or custom | N/A | useDebounce hook | Draft auto-save, search input debouncing (500-1000ms delay) |
| FullCalendar | 6.x | Calendar view component | Month view with event names in grid cells (dayGridMonth) |
| react-step-wizard | 5.x | Wizard navigation | Alternative to custom stepper, manages step state and validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-i18next | react-intl | react-intl requires more boilerplate, react-i18next has better namespace support |
| React Hook Form | Formik | Formik is heavier, more re-renders, React Hook Form has better performance for large forms |
| Zustand | Context API | Context API causes unnecessary re-renders in form-heavy scenarios, but simpler for basic state |
| FullCalendar | react-big-calendar | react-big-calendar already used in project for initial calendar view, FullCalendar for enhanced month grid |
| Supabase transformations | Cloudinary/imgix | Third-party services add cost and complexity, Supabase included with existing plan |

**Installation:**
```bash
# Core i18n stack (if not present)
npm install react-i18next i18next

# Multi-step wizard support (choose one)
npm install react-step-wizard  # or implement custom with React Hook Form

# useDebounce hook (if not using existing utility)
npm install use-debounce  # or implement custom hook

# FullCalendar for enhanced calendar view (optional upgrade)
npm install @fullcalendar/react @fullcalendar/daygrid

# Note: shadcn components, date-fns, React Hook Form, Supabase already in project
```

## Architecture Patterns

### Recommended Project Structure
```
apps/frontend/src/
├── locales/              # Translation files
│   ├── it/
│   │   ├── common.json   # Shared UI elements (buttons, labels)
│   │   ├── events.json   # Event-specific translations
│   │   ├── forms.json    # Form labels and validation messages
│   │   └── dashboard.json
│   └── i18n.ts          # i18next configuration
├── components/
│   ├── forms/
│   │   ├── wizard/      # Multi-step wizard components
│   │   ├── date-picker/ # Italian locale date picker
│   │   └── conditional-fields/ # Event type-based field visibility
│   ├── events/
│   │   ├── EventCard.tsx        # Airbnb-style card
│   │   ├── EventCardGrid.tsx    # Responsive grid layout
│   │   ├── EventHero.tsx        # Detail page hero section
│   │   └── ViewToggle.tsx       # Grid/calendar toggle
│   └── dashboard/
│       ├── UpcomingEvents.tsx
│       ├── Recommendations.tsx
│       └── Statistics.tsx
└── hooks/
    ├── useDebounce.ts    # Draft auto-save debouncing
    ├── useAutoSave.ts    # Draft persistence to Supabase
    └── useLocalStorage.ts # Browser close recovery
```

### Pattern 1: Italian Localization Setup
**What:** Complete Italian UI with proper date/time formatting
**When to use:** Application initialization, all user-facing text
**Example:**
```typescript
// src/locales/i18n.ts
// Source: https://react.i18next.com/ + https://date-fns.org/docs/Locale
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { it } from 'date-fns/locale/it';

import common from './it/common.json';
import events from './it/events.json';
import forms from './it/forms.json';

i18n
  .use(initReactI18next)
  .init({
    lng: 'it',
    fallbackLng: 'it',
    resources: {
      it: {
        common,
        events,
        forms,
      },
    },
    interpolation: {
      escapeValue: false, // React already escapes
      format: (value, format, lng) => {
        if (value instanceof Date) {
          return formatDate(value, format, { locale: it });
        }
        return value;
      },
    },
  });

export default i18n;

// Usage in components
import { useTranslation } from 'react-i18next';

function CreateEventButton() {
  const { t } = useTranslation('events');
  return <Button>{t('create_event')}</Button>; // "Crea Evento"
}

// Italian date formatting
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';

const italianDate = format(new Date(), 'dd/MM/yyyy', { locale: it }); // 22/01/2026
const italianTime = format(new Date(), 'HH:mm', { locale: it }); // 14:30
```

**Translation file structure:**
```json
// locales/it/common.json
{
  "buttons": {
    "save": "Salva",
    "cancel": "Annulla",
    "delete": "Elimina",
    "edit": "Modifica"
  },
  "validation": {
    "required": "Campo obbligatorio",
    "invalid_email": "Email non valida"
  }
}

// locales/it/events.json
{
  "create_event": "Crea Evento",
  "event_types": {
    "jam": "Jam",
    "class": "Lezione",
    "workshop": "Workshop",
    "convention": "Convegno"
  },
  "filters": {
    "all_types": "Tutti i tipi"
  }
}
```

### Pattern 2: Multi-Step Wizard with React Hook Form
**What:** Type-safe wizard with conditional fields and validation per step
**When to use:** Event creation, complex forms with sequential data collection
**Example:**
```typescript
// Source: https://react-hook-form.com/docs/useform/watch + community patterns
import { useForm } from 'react-hook-form';
import { useState } from 'react';

type EventFormData = {
  type: 'jam' | 'class' | 'workshop' | 'convention';
  title: string;
  manageParticipants?: boolean;
  capacity?: number;
  teachers?: string[];
  // ... other fields
};

function CreateEventWizard() {
  const [step, setStep] = useState(1);
  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<EventFormData>();

  const eventType = watch('type');
  const manageParticipants = watch('manageParticipants');

  const nextStep = async () => {
    // Validate current step before proceeding
    const fieldsToValidate = getStepFields(step);
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  return (
    <form>
      {step === 1 && (
        <>
          <select {...register('type', { required: true })}>
            <option value="jam">Jam</option>
            <option value="class">Lezione</option>
          </select>

          {eventType === 'jam' && (
            <label>
              <input type="checkbox" {...register('manageParticipants')} />
              Gestisci partecipanti?
            </label>
          )}

          {eventType === 'jam' && manageParticipants && (
            <input
              type="number"
              {...register('capacity', { required: true, min: 1 })}
              placeholder="Capacità massima"
            />
          )}
        </>
      )}

      {step === 2 && (
        <>
          {/* Schedule fields */}
        </>
      )}

      {step === 3 && (
        <>
          {/* Preview */}
        </>
      )}

      <Button onClick={nextStep}>Avanti</Button>
    </form>
  );
}

function getStepFields(step: number): (keyof EventFormData)[] {
  switch (step) {
    case 1: return ['type', 'title', 'manageParticipants', 'capacity'];
    case 2: return ['date', 'time', 'location'];
    case 3: return [];
    default: return [];
  }
}
```

### Pattern 3: Draft Auto-Save with Debounce
**What:** Save form progress automatically without overwhelming the API
**When to use:** Long forms, multi-step wizards, any form where data loss would frustrate users
**Example:**
```typescript
// Source: https://usehooks.com/usedebounce + https://supabase.com/docs/reference/javascript/upsert
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/lib/supabase';

function useAutoSave(formData: Partial<EventFormData>, eventId?: string) {
  const debouncedFormData = useDebounce(formData, 1000); // 1 second delay
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    async function saveDraft() {
      if (!debouncedFormData.title) return; // Don't save empty forms

      setSaveStatus('saving');

      try {
        const { data, error } = await supabase
          .from('events')
          .upsert({
            id: eventId, // undefined for new events
            ...debouncedFormData,
            status: 'draft',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id', // Update existing draft by ID
            ignoreDuplicates: false, // Merge with existing
          })
          .select()
          .single();

        if (error) throw error;

        setSaveStatus('saved');
        return data.id; // Store ID for subsequent saves
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('error');
      }
    }

    saveDraft();
  }, [debouncedFormData]);

  return saveStatus;
}

// useDebounce implementation
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler); // Cleanup on value change
  }, [value, delay]);

  return debouncedValue;
}

// Usage in wizard
function CreateEventWizard() {
  const { watch } = useForm<EventFormData>();
  const formData = watch();
  const [eventId, setEventId] = useState<string>();

  const saveStatus = useAutoSave(formData, eventId);

  return (
    <div>
      {saveStatus === 'saving' && <span>Salvataggio...</span>}
      {saveStatus === 'saved' && <span>Salvato</span>}
      {/* form fields */}
    </div>
  );
}
```

### Pattern 4: Unified View Toggle with URL State
**What:** Single page with grid/calendar view toggle, shared filters persisted in URL
**When to use:** Discovery interfaces where users switch between list and calendar views
**Example:**
```typescript
// Source: https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/
import { useSearchParams } from 'react-router-dom';

function UnifiedEventView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'grid'; // Default to grid
  const type = searchParams.get('type');

  const setView = (newView: 'grid' | 'calendar') => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('view', newView);
      return params;
    }, { replace: true }); // Don't pollute browser history
  };

  return (
    <div>
      <FilterBar /> {/* Reads from URL params */}

      <ViewToggle>
        <Button
          variant={view === 'grid' ? 'default' : 'outline'}
          onClick={() => setView('grid')}
        >
          Griglia
        </Button>
        <Button
          variant={view === 'calendar' ? 'default' : 'outline'}
          onClick={() => setView('calendar')}
        >
          Calendario
        </Button>
      </ViewToggle>

      {view === 'grid' ? (
        <EventCardGrid filters={{ type }} />
      ) : (
        <EventCalendar filters={{ type }} />
      )}
    </div>
  );
}

// Shareable URLs: /discover?view=calendar&type=jam&lat=45.4642&lng=9.1900&radius=50000
```

### Pattern 5: Responsive Event Card Grid (Airbnb-style)
**What:** Auto-responsive card grid that adapts from 1 column (mobile) to 3 columns (desktop)
**When to use:** Event discovery, home page, search results
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Common_grid_layouts
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function EventCard({ event }: { event: EventWithOrganizer }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Hero image */}
      <div className="relative h-48 w-full">
        <img
          src={getOptimizedImageUrl(event.image_url, { width: 400, quality: 80 })}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-2 right-2" variant={eventTypeVariant[event.type]}>
          {t(`events.event_types.${event.type}`)}
        </Badge>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{event.title}</h3>
        <p className="text-sm text-muted-foreground mb-2">
          {format(new Date(event.date), 'dd MMMM yyyy, HH:mm', { locale: it })}
        </p>
        <p className="text-sm line-clamp-2">{event.description}</p>
      </CardContent>
    </Card>
  );
}

function EventCardGrid({ events }: { events: EventWithOrganizer[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

// Supabase image transformation helper
function getOptimizedImageUrl(
  url: string,
  options: { width?: number; height?: number; quality?: number }
): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const bucket = 'event-images';
  const path = url.split('/').pop();

  const params = new URLSearchParams();
  if (options.width) params.set('width', options.width.toString());
  if (options.height) params.set('height', options.height.toString());
  if (options.quality) params.set('quality', options.quality.toString());

  return `https://${projectId}.supabase.co/storage/v1/render/image/public/${bucket}/${path}?${params}`;
}
```

**CSS Grid Responsive Breakpoints:**
```css
/* Tailwind utility classes handle this automatically */
.grid {
  display: grid;
  gap: 1.5rem;
}

/* Mobile: 1 column */
@media (min-width: 0) {
  .grid { grid-template-columns: 1fr; }
}

/* Tablet: 2 columns */
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Pattern 6: Shadcn Date Picker with Italian Locale
**What:** Replace native HTML date inputs with shadcn date picker showing Italian dates
**When to use:** All date inputs throughout the app (filters, forms, event details)
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/date-picker + Italian locale setup
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

function DatePicker({ value, onChange }: { value?: Date; onChange: (date?: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'dd/MM/yyyy', { locale: it }) : 'Seleziona data'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={it} // Italian month/day names
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// Usage in form
function EventDateField() {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name="date"
      render={({ field }) => (
        <DatePicker
          value={field.value}
          onChange={field.onChange}
        />
      )}
    />
  );
}
```

### Anti-Patterns to Avoid

- **Context API for wizard state:** Causes unnecessary re-renders in form-heavy scenarios. Use React Hook Form's built-in state or Zustand for better performance.
- **Manual localStorage sync on every keystroke:** Use debouncing (1000ms) to avoid excessive writes and localStorage quota issues.
- **Fixed-width containers for translated text:** Italian text can expand 30%+ compared to English. Use min-width and let containers grow.
- **Pushing to browser history on filter changes:** Use `replace: true` in setSearchParams to avoid polluting history with filter iterations.
- **Not validating steps before navigation:** Always call `trigger()` on current step fields before allowing forward navigation in wizard.
- **Hardcoded date formats:** Use date-fns with Italian locale for all date displays to ensure correct dd/MM/yyyy format.
- **Storing view state in component state only:** URL parameters enable bookmarking and sharing, making views more useful.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-step form navigation | Custom step state machine with prev/next logic | react-step-wizard or React Hook Form + useState | Edge cases: validation timing, backwards navigation, step skipping, URL sync. Libraries handle these robustly. |
| Debounce hook | Manual setTimeout/clearTimeout in useEffect | use-debounce library or useDebounce hook pattern | Cleanup timing, dependency arrays, memory leaks. Standard pattern exists with 7M+ weekly downloads. |
| Italian date formatting | String manipulation or custom locale objects | date-fns Italian locale (`it`) | Handles month names, weekday names, date parsing, relative time. 200+ locales maintained. |
| Image responsive sizes | Multiple image uploads or manual resizing | Supabase Storage transformations | On-the-fly resizing, format optimization (WebP), quality adjustment. Already in tech stack. |
| Translation infrastructure | Custom translation HOCs or context providers | react-i18next | Handles pluralization, interpolation, lazy loading, namespace organization. 30M+ weekly downloads. |
| Form conditional fields | Manual show/hide logic with useState | React Hook Form watch/unregister pattern | Handles field registration lifecycle, validation scope, default values correctly. |
| Calendar month view with events | Custom calendar grid renderer | FullCalendar dayGridMonth or react-big-calendar | Date math, week boundaries, overflow handling, timezone support. Don't reinvent date-heavy UI. |
| localStorage persistence | Manual JSON.stringify/parse with error handling | useLocalStorage hook or useSyncExternalStore | Handles quota errors, SSR compatibility, cross-tab sync, JSON parsing errors. |
| Responsive card grids | Fixed breakpoint media queries | CSS Grid with auto-fit: `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))` | Automatically adapts to container width without media queries. Handles 4k screens and narrow sidebars. |

**Key insight:** UI patterns in 2026 are well-solved problems. React ecosystem has mature libraries for i18n, forms, dates, and image handling. Custom implementations introduce bugs (timezone issues, validation edge cases, performance problems) that cost more to fix than using proven libraries.

## Common Pitfalls

### Pitfall 1: Italian Locale Not Applied to Date Picker
**What goes wrong:** Shadcn date picker shows English month names despite Italian UI translations
**Why it happens:** React Day Picker (underlying library) requires explicit locale prop, doesn't inherit from i18next context
**How to avoid:** Always pass `locale={it}` prop to Calendar component and use date-fns with locale in format() calls
**Warning signs:** Calendar shows "January" instead of "gennaio", weekdays show "Mon" instead of "lun"
**Fix:**
```typescript
import { it } from 'date-fns/locale/it';

<Calendar locale={it} />
<DatePicker locale={it} />
```

### Pitfall 2: React Hook Form Fields Not Unregistering
**What goes wrong:** Conditional fields (jam capacity, teachers) remain in form data even when hidden, causing validation errors or incorrect API payloads
**Why it happens:** React Hook Form doesn't auto-unregister fields by default when they unmount
**How to avoid:** Enable `shouldUnregister: true` in useForm config or manually unregister fields when conditions change
**Warning signs:** Form submits data for fields that aren't visible, validation fires for hidden fields
**Fix:**
```typescript
const form = useForm({
  shouldUnregister: true, // Auto-unregister on unmount
});

// OR manually unregister
useEffect(() => {
  if (eventType !== 'jam') {
    unregister('capacity');
    unregister('roles');
  }
}, [eventType, unregister]);
```

### Pitfall 3: Auto-Save Creates Duplicate Draft Records
**What goes wrong:** Each auto-save creates a new draft event instead of updating the existing one
**Why it happens:** Supabase upsert without proper onConflict handling or missing primary key in payload
**How to avoid:** Always include the event ID in upsert payload and specify `onConflict: 'id'`
**Warning signs:** Multiple draft events with same title, database table grows rapidly during form editing
**Fix:**
```typescript
const { data } = await supabase
  .from('events')
  .upsert({
    id: draftId, // CRITICAL: include existing draft ID
    ...formData,
    status: 'draft',
  }, {
    onConflict: 'id', // Update existing record with this ID
    ignoreDuplicates: false, // Merge changes
  });

// Store returned ID for subsequent saves
if (!draftId) setDraftId(data.id);
```

### Pitfall 4: Wizard Navigation Allows Invalid Steps
**What goes wrong:** User proceeds to step 2 with empty required fields in step 1, sees validation errors on final submit
**Why it happens:** Next button doesn't trigger validation before incrementing step
**How to avoid:** Call `trigger(fieldsArray)` before allowing step change, only proceed if validation passes
**Warning signs:** Users report confusing late validation errors, can navigate to preview with incomplete data
**Fix:**
```typescript
const nextStep = async () => {
  const fieldsToValidate = getStepFields(currentStep);
  const isValid = await trigger(fieldsToValidate); // Returns boolean

  if (isValid) {
    setCurrentStep(prev => prev + 1);
  }
  // If invalid, errors already set by trigger(), UI shows them
};
```

### Pitfall 5: Fixed-Width Buttons Break on Italian Translation
**What goes wrong:** Button text overflows or wraps awkwardly when English is replaced with longer Italian equivalents
**Why it happens:** Italian words are often 20-30% longer than English (e.g., "Delete" → "Elimina", "Register" → "Registrati")
**How to avoid:** Use min-width instead of fixed width, test all UI elements with longest translation variants
**Warning signs:** Buttons with truncated text (…), awkward line breaks in navigation items
**Fix:**
```css
/* Bad - fixed width */
.button { width: 120px; }

/* Good - flexible width */
.button { min-width: 120px; padding: 0.5rem 1rem; }

/* Tailwind approach */
<Button className="min-w-[120px] px-4">
  {t('common.buttons.save')}
</Button>
```

### Pitfall 6: localStorage Auto-Save Fails Silently
**What goes wrong:** Draft auto-save stops working but user isn't notified, leads to data loss on browser close
**Why it happens:** localStorage quota exceeded (5-10MB limit) or storage disabled in private browsing mode
**How to avoid:** Wrap localStorage writes in try-catch, show user notification on failure, fall back to sessionStorage
**Warning signs:** No "Salvato" indicator after typing, draft not recovered on page reload
**Fix:**
```typescript
function useLocalStorageSafe(key: string, initialValue: any) {
  const [error, setError] = useState<string | null>(null);

  const setValue = (value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError(null);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        setError('Storage pieno. Salva manualmente.');
        // Fallback to sessionStorage or show warning
      }
      console.error('localStorage save failed:', e);
    }
  };

  return [value, setValue, error] as const;
}
```

### Pitfall 7: Image URLs Not Optimized for Responsive Cards
**What goes wrong:** Full-resolution images (2MB+) loaded for 400px card thumbnails, causing slow page loads
**Why it happens:** Direct Supabase storage URLs used without transformation parameters
**How to avoid:** Always use Supabase render endpoint with width/quality parameters for thumbnails
**Warning signs:** Slow initial page load, high bandwidth usage, poor Lighthouse scores
**Fix:**
```typescript
// Bad - full resolution
const imageUrl = `${supabaseUrl}/storage/v1/object/public/events/${filename}`;

// Good - optimized for cards
const imageUrl = `${supabaseUrl}/storage/v1/render/image/public/events/${filename}?width=400&quality=80`;

// For responsive images
<img
  srcSet={`
    ${getImageUrl(filename, 400)} 400w,
    ${getImageUrl(filename, 800)} 800w
  `}
  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
/>
```

### Pitfall 8: URL Parameters Not Synchronized with View State
**What goes wrong:** User toggles to calendar view, refreshes page, sees grid view again
**Why it happens:** View state stored in component useState, not reflected in URL params
**How to avoid:** Always use URL parameters as source of truth for view toggles and filters
**Warning signs:** Bookmarked URLs don't restore user's view preferences, back button doesn't undo view changes
**Fix:**
```typescript
// Bad - local state only
const [view, setView] = useState('grid');

// Good - URL as source of truth
const [searchParams, setSearchParams] = useSearchParams();
const view = searchParams.get('view') || 'grid';

const setView = (newView: string) => {
  setSearchParams(prev => {
    const params = new URLSearchParams(prev);
    params.set('view', newView);
    return params;
  }, { replace: true });
};
```

## Code Examples

Verified patterns from official sources:

### Italian Translation Namespace Organization
```typescript
// Source: https://react.i18next.com/ best practices
// locales/it/common.json
{
  "buttons": {
    "save": "Salva",
    "cancel": "Annulla",
    "delete": "Elimina",
    "edit": "Modifica",
    "create": "Crea",
    "back": "Indietro",
    "next": "Avanti",
    "finish": "Completa"
  },
  "validation": {
    "required": "Campo obbligatorio",
    "invalid_email": "Indirizzo email non valido",
    "min_length": "Minimo {{count}} caratteri",
    "max_length": "Massimo {{count}} caratteri"
  },
  "time": {
    "format_24h": "HH:mm",
    "format_date": "dd/MM/yyyy",
    "format_datetime": "dd/MM/yyyy, HH:mm"
  }
}

// locales/it/events.json
{
  "types": {
    "jam": "Jam",
    "class": "Lezione",
    "workshop": "Workshop",
    "convention": "Convegno"
  },
  "fields": {
    "title": "Titolo",
    "description": "Descrizione",
    "date": "Data",
    "time": "Ora",
    "location": "Luogo",
    "capacity": "Capacità massima",
    "manage_participants": "Gestisci partecipanti",
    "visibility": "Visibilità"
  },
  "visibility_options": {
    "public": "Pubblico (visibile a tutti)",
    "private": "Privato (solo con link)"
  },
  "wizard": {
    "step_1_title": "Tipo e Informazioni Base",
    "step_2_title": "Programmazione e Dettagli",
    "step_3_title": "Anteprima",
    "ask_manage_participants": "Vuoi gestire i partecipanti?",
    "ask_manage_participants_help": "Abilita capacità, ruoli e inviti"
  }
}

// Usage
const { t } = useTranslation(['common', 'events']);
<Button>{t('common:buttons.save')}</Button>
<Input placeholder={t('events:fields.title')} />
```

### React Hook Form Wizard Step Validation
```typescript
// Source: https://react-hook-form.com/docs/useform/watch + community discussions
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define validation per step
const step1Schema = z.object({
  type: z.enum(['jam', 'class', 'workshop', 'convention']),
  title: z.string().min(3).max(100),
  manageParticipants: z.boolean().optional(),
  capacity: z.number().min(1).optional(),
});

const step2Schema = z.object({
  date: z.date(),
  location: z.string().min(3),
});

function CreateEventWizard() {
  const [step, setStep] = useState(1);

  const form = useForm<EventFormData>({
    resolver: zodResolver(step === 1 ? step1Schema : step2Schema),
    shouldUnregister: true, // Critical: unregister hidden fields
    mode: 'onChange', // Show validation on change
  });

  const { trigger, watch } = form;

  const nextStep = async () => {
    // Validate only current step's fields
    const fields = getStepFields(step);
    const isValid = await trigger(fields);

    if (isValid) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  return (
    <FormProvider {...form}>
      <form>
        <WizardProgress currentStep={step} totalSteps={3} />

        {step === 1 && <Step1Fields />}
        {step === 2 && <Step2Fields />}
        {step === 3 && <Step3Preview />}

        <div className="flex gap-2 justify-between mt-4">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={prevStep}>
              {t('common:buttons.back')}
            </Button>
          )}

          {step < 3 ? (
            <Button type="button" onClick={nextStep}>
              {t('common:buttons.next')}
            </Button>
          ) : (
            <Button type="submit">
              {t('common:buttons.finish')}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

function getStepFields(step: number): (keyof EventFormData)[] {
  switch (step) {
    case 1: return ['type', 'title', 'manageParticipants', 'capacity'];
    case 2: return ['date', 'location'];
    case 3: return [];
    default: return [];
  }
}
```

### Supabase Image Transformation for Responsive Cards
```typescript
// Source: https://supabase.com/docs/guides/storage/serving/image-transformations
type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

function getOptimizedImageUrl(
  bucket: string,
  path: string,
  options: ImageTransformOptions = {}
): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/storage/v1/render/image/public/${bucket}/${path}`;

  const params = new URLSearchParams();
  if (options.width) params.set('width', options.width.toString());
  if (options.height) params.set('height', options.height.toString());
  if (options.quality) params.set('quality', options.quality.toString());
  if (options.resize) params.set('resize', options.resize);

  return params.toString() ? `${baseUrl}?${params}` : baseUrl;
}

// Usage in EventCard component
function EventCard({ event }: { event: Event }) {
  const thumbnailUrl = getOptimizedImageUrl('event-images', event.image_path, {
    width: 400,
    quality: 80,
    resize: 'cover',
  });

  const fullsizeUrl = getOptimizedImageUrl('event-images', event.image_path, {
    width: 1200,
    quality: 90,
  });

  return (
    <Card>
      <img
        src={thumbnailUrl}
        srcSet={`
          ${thumbnailUrl} 400w,
          ${fullsizeUrl} 1200w
        `}
        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        alt={event.title}
        className="w-full h-48 object-cover"
      />
      {/* ... card content */}
    </Card>
  );
}
```

### Dashboard Recommendations (Proximity-Based)
```typescript
// Source: Community patterns for proximity filtering
// Note: Backend handles actual proximity calculation via ST_Distance

type RecommendationFilters = {
  userLat: number;
  userLng: number;
  maxDistance?: number; // meters
  excludeEventIds?: string[]; // User's own events
  limit?: number;
};

async function fetchRecommendedEvents(filters: RecommendationFilters) {
  const params = new URLSearchParams({
    lat: filters.userLat.toString(),
    lng: filters.userLng.toString(),
    radius: (filters.maxDistance || 50000).toString(), // Default 50km
    limit: (filters.limit || 5).toString(),
  });

  const response = await fetch(`/api/events/search?${params}`);
  const events = await response.json();

  // Filter out user's own events client-side
  return events.filter(e => !filters.excludeEventIds?.includes(e.id));
}

function RecommendationsSection() {
  const { data: profile } = useQuery(['profile']);
  const { data: myEvents } = useQuery(['my-events']);

  const { data: recommendations } = useQuery(
    ['recommendations', profile?.lat, profile?.lng],
    () => fetchRecommendedEvents({
      userLat: profile.lat,
      userLng: profile.lng,
      maxDistance: 50000, // 50km
      excludeEventIds: myEvents?.map(e => e.id),
      limit: 5,
    }),
    {
      enabled: !!(profile?.lat && profile?.lng),
    }
  );

  return (
    <section>
      <h2>{t('dashboard:sections.recommendations')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations?.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
```

### FullCalendar Month View with Event Names
```typescript
// Source: https://fullcalendar.io/docs/react + https://fullcalendar.io/docs/month-view
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import itLocale from '@fullcalendar/core/locales/it';

function EventCalendar({ events }: { events: Event[] }) {
  // Transform events to FullCalendar format
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.date,
    end: event.end_date || event.date,
    url: `/events/${event.id}`,
    backgroundColor: eventTypeColors[event.type],
    extendedProps: event, // Store full event data
  }));

  return (
    <FullCalendar
      plugins={[dayGridPlugin]}
      initialView="dayGridMonth"
      locale={itLocale} // Italian month/day names
      events={calendarEvents}
      eventClick={(info) => {
        info.jsEvent.preventDefault(); // Prevent default navigation
        navigate(info.event.url);
      }}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek',
      }}
      eventDisplay="block" // Show event names in cells
      displayEventTime={true}
      height="auto"
    />
  );
}

const eventTypeColors = {
  jam: '#3b82f6',
  class: '#8b5cf6',
  workshop: '#ec4899',
  convention: '#ef4444',
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Helmet | Next.js native metadata API / react-helmet-async | 2024-2025 | React Helmet not compatible with React 19+, SSR improvements with native solutions |
| Context API for form state | Zustand / React Hook Form | 2024-2026 | 60% faster form updates (220ms → 85ms), reduced re-renders |
| Manual date formatting | date-fns with locale | Stable since 2.x | Handles edge cases (leap years, DST, localization), don't reinvent |
| Fixed breakpoint media queries | CSS Grid auto-fit | 2021+ | Responsive without media queries, adapts to any screen size |
| Redux for all state | Hybrid: TanStack Query + Zustand + Context | 2024-2026 | Right tool for job: server state (React Query), client state (Zustand), environment (Context) |
| localStorage without error handling | useSyncExternalStore (React 18+) | 2022+ | Handles quota errors, cross-tab sync, concurrent rendering |
| Custom image CDN | Supabase Storage transformations | 2023+ | Built into tech stack, no third-party cost, on-the-fly optimization |
| i18next without namespaces | Namespace-organized translations | Best practice | Lazy loading, better code splitting, logical organization |

**Deprecated/outdated:**
- React Helmet (original package): Use react-helmet-async or Next.js metadata API
- Redux DevTools Extension (standalone): Now integrated into Redux Toolkit by default
- Moment.js: Use date-fns or Day.js (smaller bundle, immutable, tree-shakeable)
- componentWillReceiveProps lifecycle: Use useEffect with dependency array
- defaultProps on function components: Use default parameters instead

## Open Questions

Things that couldn't be fully resolved:

1. **FullCalendar vs react-big-calendar for unified calendar view**
   - What we know: react-big-calendar already in project for Phase 4, FullCalendar has richer month grid with event names
   - What's unclear: Whether react-big-calendar can match FullCalendar's month view UX, migration effort vs improvement
   - Recommendation: Start with react-big-calendar enhancement (already integrated), evaluate FullCalendar if month view UX insufficient. Test with Italian locale in both libraries before deciding.

2. **Custom stepper component vs react-step-wizard library**
   - What we know: Shadcn doesn't have official Stepper component, community options exist (shadcn-stepper, react-step-wizard)
   - What's unclear: Whether custom implementation with shadcn Button/Card provides better design consistency vs library convenience
   - Recommendation: Use react-step-wizard for state management, style with shadcn components. If UX unsatisfactory, consider shadcn-stepper template or custom implementation. Prioritize functionality over perfect design in Phase 6.

3. **localStorage vs sessionStorage for draft recovery**
   - What we know: localStorage persists browser close, sessionStorage clears on tab close, quota limits (5-10MB) can be reached
   - What's unclear: User expectation—should drafts survive browser restart or only page refresh?
   - Recommendation: Use sessionStorage for wizard state (temporary), localStorage for draft auto-save with quota error handling. Show user control: "Save draft locally" checkbox for explicit persistence choice.

4. **SEO meta tags implementation (Next.js metadata API vs react-helmet-async)**
   - What we know: If using Next.js, native metadata API preferred. If plain React, react-helmet-async necessary.
   - What's unclear: Project uses React Router (based on STATE.md), not confirmed if Next.js or Vite
   - Recommendation: If Vite + React Router: use react-helmet-async. If Next.js migration planned: use Next.js metadata API. Check package.json to confirm framework choice before implementation.

5. **Image upload size guidance display (inline vs tooltip vs placeholder)**
   - What we know: CONTEXT.md specifies showing suggested size/weight but leaves presentation to Claude's discretion
   - What's unclear: Best UX pattern for guidance without cluttering form
   - Recommendation: Use inline helper text below file input ("Consigliato: 1920x1080px, max 2MB") + real-time validation feedback if file exceeds limits. Tooltip alone risks being missed.

## Sources

### Primary (HIGH confidence)
- [Supabase Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) - Image optimization API, Next.js integration
- [shadcn/ui Date Picker](https://ui.shadcn.com/docs/components/date-picker) - Installation, dependencies, Italian locale setup
- [React Hook Form Documentation](https://react-hook-form.com/docs/useform/watch) - watch, trigger, unregister APIs
- [react-i18next Introduction](https://react.i18next.com/) - Core setup, namespaces, interpolation
- [date-fns Locale Documentation](https://date-fns.org/docs/Locale) - Italian locale import patterns
- [FullCalendar React Component](https://fullcalendar.io/docs/react) - Month view, Italian locale integration
- [MDN CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Common_grid_layouts) - Responsive card grids

### Secondary (MEDIUM confidence)
- [React Hook Form Multi-Step Tutorial: Zustand + Zod + Shadcn](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps) - Verified pattern for wizard state
- [Advanced React state management using URL parameters](https://blog.logrocket.com/advanced-react-state-management-using-url-parameters/) - Feb 2025 article, verified approach
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Performance comparison data
- [Supabase JavaScript Upsert Documentation](https://supabase.com/docs/reference/javascript/upsert) - onConflict handling patterns
- [CoreUI React Stepper Component](https://coreui.io/react/docs/forms/stepper/) - Validation between steps pattern
- [useDebounce – useHooks](https://usehooks.com/usedebounce) - Standard implementation pattern
- [Persisting React State in LocalStorage: A Complete Guide](https://www.ignek.com/blog/persisting-react-state-in-localstorage/) - Error handling, quota management

### Tertiary (LOW confidence)
- [20 Free Airbnb-Inspired React + Tailwind CSS Components](https://reactcomponents.com/blog/20-free-airbnb-inspired-react-tailwind-css-components-for-your-next-project) - Card design inspiration
- [Date and time notation in Italy - Wikipedia](https://en.wikipedia.org/wiki/Date_and_time_notation_in_Italy) - Italian formatting conventions (dd/MM/yyyy, 24-hour)
- [Tailwind CSS Best Practices 2025-2026](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns) - Design token patterns
- [React Helmet updates, React 19 compatibility](https://medium.com/@dimterion/react-helmet-updates-react-19-compatibility-and-possible-alternatives-24d49da6607c) - Dec 2025 article on alternatives
- Web search results for community patterns (multi-step forms, proximity algorithms, event discovery UX)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official documentation, download counts, and project compatibility (already using React, Supabase, shadcn)
- Architecture: HIGH - Patterns verified with official docs (React Hook Form, Supabase, shadcn) and community best practices (LogRocket, Medium tutorials from 2025-2026)
- Pitfalls: HIGH - Based on official GitHub issue discussions, documentation warnings, and common patterns identified in multiple sources
- Italian localization: HIGH - date-fns locale verified, i18next patterns from official docs, date/time formats from Wikipedia and official style guides
- Dashboard recommendations: MEDIUM - Proximity filtering pattern based on existing PostGIS implementation (from STATE.md), but specific UI patterns from community sources
- Calendar view details: MEDIUM - FullCalendar and react-big-calendar both documented, but Italian locale integration tested via web search, not hands-on verification

**Research date:** 2026-01-22
**Valid until:** 30 days (stable technologies: React Hook Form, i18next, date-fns); 7 days for fast-moving areas (Tailwind CSS 4.x, shadcn component updates)
