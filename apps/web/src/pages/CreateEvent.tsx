import { useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { eventsApi } from '@/api/events.api';
import { teachersApi } from '@/api/teachers.api';
import { eventOrganizersApi } from '@/api/event-organizers.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEventWizard } from '@/hooks/useEventWizard';
import { useAutoSave } from '@/hooks/useAutoSave';
import { WizardStepIndicator } from '@/components/forms/wizard/WizardStepIndicator';
import { WizardNavigation } from '@/components/forms/wizard/WizardNavigation';
import { EventTypeStep } from '@/components/forms/event/EventTypeStep';
import { EventScheduleStep } from '@/components/forms/event/EventScheduleStep';
import { EventImageStep } from '@/components/forms/event/EventImageStep';
import { EventTeachersStep } from '@/components/forms/event/EventTeachersStep';
import { EventPreviewStep } from '@/components/forms/event/EventPreviewStep';
import { ArrowLeft, Save, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CreateEventDto, UpdateEventDto } from '@jamia/types/event';

export default function CreateEvent() {
  const { t } = useTranslation(['common', 'events', 'forms']);
  const navigate = useNavigate();
  const { toast } = useToast();
  const submitIntentRef = useRef(false);

  // Initialize wizard
  const { currentStep, nextStep, prevStep, goToStep, form } = useEventWizard();

  // Watch event type to conditionally show teachers step
  const eventType = form.watch('type');
  const showTeachersStep = ['class', 'workshop', 'convention'].includes(eventType);

  // Watch all form fields for auto-save
  const formData = form.watch();

  // Auto-save integration
  const { saveStatus, draftId } = useAutoSave(formData);

  // Add teachers mutation
  const addTeachersMutation = useMutation({
    mutationFn: ({ eventId, teacherIds }: { eventId: string; teacherIds: string[] }) =>
      teachersApi.addTeachers(eventId, teacherIds),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: 'Errore nell\'aggiunta degli insegnanti',
        description: err.response?.data?.message || 'Riprova',
        variant: 'destructive'
      });
    }
  });

  const addCoOrganizers = async (eventId: string) => {
    const coOrganizerIds = form.getValues('coOrganizerIds') || [];
    if (coOrganizerIds.length === 0) return;

    try {
      await Promise.all(
        coOrganizerIds.map((userId) =>
          eventOrganizersApi.addCoOrganizer(eventId, { userId })
        )
      );
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: 'Errore nell\'aggiunta dei co-organizzatori',
        description: err.response?.data?.message || 'Riprova',
        variant: 'destructive'
      });
    }
  };

  // Create event mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateEventDto) => eventsApi.createEvent(data),
    onSuccess: async (event) => {
      // Get teacherIds from form data if available
      const teacherIds = form.getValues('teacherIds');

      // Add teachers if any selected
      if (teacherIds && teacherIds.length > 0) {
        await addTeachersMutation.mutateAsync({ eventId: event.id, teacherIds });
      }

      await addCoOrganizers(event.id);

      toast({ title: t('events:messages.eventCreated') });
      navigate(`/events/${event.id}`);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: 'Errore nella creazione dell\'evento',
        description: err.response?.data?.message || 'Riprova',
        variant: 'destructive'
      });
    }
  });

  // Update event mutation (for publishing drafts)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventDto }) =>
      eventsApi.updateEvent(id, data),
    onSuccess: async (event) => {
      // Get teacherIds from form data if available
      const teacherIds = form.getValues('teacherIds');

      // Add teachers if any selected
      if (teacherIds && teacherIds.length > 0) {
        await addTeachersMutation.mutateAsync({ eventId: event.id, teacherIds });
      }

      await addCoOrganizers(event.id);

      toast({ title: t('events:messages.eventCreated') });
      navigate(`/events/${event.id}`);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: 'Errore nella pubblicazione dell\'evento',
        description: err.response?.data?.message || 'Riprova',
        variant: 'destructive'
      });
    }
  });

  // Handle form submission
  const handleSubmit = form.handleSubmit((data) => {
    // Combine date and time into ISO string
    const startsAt = data.date && data.time
      ? new Date(`${data.date.toISOString().split('T')[0]}T${data.time}:00`).toISOString()
      : new Date().toISOString();

    const endsAt = data.end_date && data.end_time
      ? new Date(`${data.end_date.toISOString().split('T')[0]}T${data.end_time}:00`).toISOString()
      : undefined;

    // Map location_text as object (matching useAutoSave pattern)
    let location_text: CreateEventDto['location_text'] | undefined;
    if (data.location?.description) {
      // TypeScript needs explicit cast for union type (string | LocationDto)
      const locationObj = {
        description: data.location.description,
        city: data.location.city,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        googleMapsUrl: data.location.googleMapsUrl,
      };
      location_text = locationObj as unknown as CreateEventDto['location_text'];
    }

    const eventData: CreateEventDto = {
      type: data.type,
      title: data.title,
      location_text,
      starts_at: startsAt,
      ends_at: endsAt || startsAt, // Ensure ends_at is set
      description: data.description || undefined,
      organizer_contact: data.organizerContact || undefined,
      tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
      price: data.price?.toString() || undefined,
      external_link: data.externalLink || undefined,
      // External registration fields (only if NOT managing participants)
      cta_text: (!data.manageParticipants || data.type !== 'jam') ? data.ctaText : undefined,
      // Image URL
      image_url: data.image_url || undefined,
      // Jam management fields - only include when type='jam' AND manageParticipants=true
      ...(data.type === 'jam' && data.manageParticipants && {
        manage_participants: true,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        desired_bases_min: data.desired_bases_min ? Number(data.desired_bases_min) : undefined,
        desired_bases_max: data.desired_bases_max ? Number(data.desired_bases_max) : undefined,
        desired_flyers_min: data.desired_flyers_min ? Number(data.desired_flyers_min) : undefined,
        desired_flyers_max: data.desired_flyers_max ? Number(data.desired_flyers_max) : undefined,
        auto_promote: data.auto_promote ?? true,
        public_participants: data.public_participants ?? true,
      }),
    };

    // Use mutations instead of direct API calls
    if (draftId) {
      updateMutation.mutate({ id: draftId, data: { ...eventData, status: 'published' } });
    } else {
      createMutation.mutate(eventData);
    }
  });

  const totalSteps = showTeachersStep ? 5 : 4;
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (currentStep !== totalSteps) {
      event.preventDefault();
      void nextStep();
      return;
    }
    if (!submitIntentRef.current) {
      event.preventDefault();
      return;
    }
    submitIntentRef.current = false;
    handleSubmit(event);
  };

  // Step labels - conditional based on event type
  const stepLabels = [
    t('events:wizard.step1Title'),
    t('events:wizard.step2Title'),
    'Immagine',
    ...(showTeachersStep ? ['Insegnanti'] : []),
    t('events:wizard.step3Title'),
  ];

  // Auto-save status indicator
  const renderSaveIndicator = () => {
    if (saveStatus === 'saving') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Save className="h-4 w-4 animate-pulse" />
          <span>Salvataggio...</span>
        </div>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Check className="h-4 w-4" />
          <span>Salvato</span>
        </div>
      );
    }
    if (saveStatus === 'error') {
      return (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Errore salvataggio</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header with back button and auto-save indicator */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/discover">
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common:buttons.back')}
          </Button>
        </Link>
        {renderSaveIndicator()}
      </div>

      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{t('events:actions.createEvent')}</CardTitle>
          <CardDescription>Condividi un nuovo evento di acroyoga con la comunità</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Wizard Step Indicator */}
          <WizardStepIndicator
            currentStep={currentStep}
            totalSteps={showTeachersStep ? 5 : 4}
            stepLabels={stepLabels}
            onStepClick={goToStep}
          />

          {/* Form */}
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-8">
              {/* Step Content */}
              <div className="min-h-[400px]">
                {currentStep === 1 && <EventTypeStep form={form} />}
                {currentStep === 2 && <EventScheduleStep form={form} />}
                {currentStep === 3 && <EventImageStep form={form} />}
                {currentStep === 4 && !showTeachersStep && <EventPreviewStep form={form} />}
                {currentStep === 4 && showTeachersStep && <EventTeachersStep form={form} />}
                {currentStep === 5 && showTeachersStep && <EventPreviewStep form={form} />}
              </div>

              {/* Wizard Navigation */}
              <WizardNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onBack={prevStep}
                onNext={nextStep}
                isSubmitting={createMutation.isPending || updateMutation.isPending || addTeachersMutation.isPending}
                canGoNext={true}
                onSubmitIntent={() => {
                  submitIntentRef.current = true;
                }}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
