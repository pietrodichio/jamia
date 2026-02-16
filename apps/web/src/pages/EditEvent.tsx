import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { eventsApi } from '@/api/events.api';
import { teachersApi } from '@/api/teachers.api';
import { eventOrganizersApi } from '@/api/event-organizers.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEventWizard } from '@/hooks/useEventWizard';
import { WizardStepIndicator } from '@/components/forms/wizard/WizardStepIndicator';
import { WizardNavigation } from '@/components/forms/wizard/WizardNavigation';
import { EventTypeStep } from '@/components/forms/event/EventTypeStep';
import { EventScheduleStep } from '@/components/forms/event/EventScheduleStep';
import { EventImageStep } from '@/components/forms/event/EventImageStep';
import { EventTeachersStep } from '@/components/forms/event/EventTeachersStep';
import { EventPreviewStep } from '@/components/forms/event/EventPreviewStep';
import { ArrowLeft } from 'lucide-react';
import type { UpdateEventDto } from '@jamia/types/event';

export default function EditEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(['common', 'events', 'forms']);

  // Initialize wizard form
  const { currentStep, nextStep, prevStep, goToStep, form } = useEventWizard();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.getEventById(eventId!),
    enabled: !!eventId,
  });

  const { data: teachers } = useQuery({
    queryKey: ['events', eventId, 'teachers'],
    queryFn: () => teachersApi.listTeachers(eventId!),
    enabled: !!eventId,
  });

  const { data: coOrganizers } = useQuery({
    queryKey: ['events', eventId, 'organizers'],
    queryFn: () => eventOrganizersApi.getCoOrganizers(eventId!),
    enabled: !!eventId,
  });

  const teacherIds = useMemo(
    () => teachers?.map((teacher) => teacher.user_id) ?? [],
    [teachers]
  );
  const coOrganizerIds = useMemo(
    () => coOrganizers?.map((organizer) => organizer.user_id) ?? [],
    [coOrganizers]
  );
  const hasInitializedForm = useRef(false);
  const submitIntentRef = useRef(false);

  // Watch event type to conditionally show teachers step
  const eventType = form.watch('type');
  const showTeachersStep = ['class', 'workshop', 'convention'].includes(eventType);

  // Load event data into wizard form
  useEffect(() => {
    if (!event || hasInitializedForm.current) return;

    const locationText = event.location_text as unknown;
    const locationDescription = typeof locationText === 'string'
      ? locationText
      : (locationText as { description?: string })?.description || '';

    const locationGoogleMapsUrl = typeof locationText === 'object' && locationText !== null
      ? (locationText as { googleMapsUrl?: string })?.googleMapsUrl
      : undefined;

    const startDate = event.starts_at ? new Date(event.starts_at) : undefined;
    const endDate = event.ends_at ? new Date(event.ends_at) : undefined;

    const parsedPrice = event.price ? Number(event.price) : undefined;

    form.reset({
      type: event.type,
      title: event.title,
      description: event.description || '',
      organizerContact: event.organizer_contact || '',
      location: {
        description: locationDescription,
        city: event.location_city || undefined,
        latitude: event.location_lat,
        longitude: event.location_lng,
        googleMapsUrl: event.gmaps_link || locationGoogleMapsUrl || '',
      },
      tags: event.tags || [],
      date: startDate,
      time: startDate ? startDate.toTimeString().slice(0, 5) : '',
      end_date: endDate,
      end_time: endDate ? endDate.toTimeString().slice(0, 5) : '',
      price: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
      externalLink: event.external_link || '',
      ctaText: event.cta_text || 'Registrati',
      image_url: event.image_url || '',
      teacherIds,
      coOrganizerIds,
      recurrence: {
        rule: event.recurrence_rule || null,
        dtstart: event.recurrence_dtstart || null,
        until: event.recurrence_until || null,
      },
    });
    hasInitializedForm.current = true;
  }, [event, form, teacherIds, coOrganizerIds]);

  useEffect(() => {
    if (!hasInitializedForm.current || teachers === undefined) return;
    form.setValue('teacherIds', teacherIds, { shouldDirty: false });
  }, [form, teacherIds, teachers]);

  useEffect(() => {
    if (!hasInitializedForm.current || coOrganizers === undefined) return;
    form.setValue('coOrganizerIds', coOrganizerIds, { shouldDirty: false });
  }, [form, coOrganizerIds, coOrganizers]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateEventDto) => eventsApi.updateEvent(eventId!, data),
    onSuccess: async () => {
      const selectedTeacherIds = form.getValues('teacherIds') || [];
      const currentTeacherIds = teacherIds;

      const teachersToAdd = selectedTeacherIds.filter(
        (id) => !currentTeacherIds.includes(id)
      );
      const teachersToRemove = currentTeacherIds.filter(
        (id) => !selectedTeacherIds.includes(id)
      );

      try {
        if (teachersToAdd.length > 0) {
          await teachersApi.addTeachers(eventId!, teachersToAdd);
        }
        if (teachersToRemove.length > 0) {
          await Promise.all(
            teachersToRemove.map((teacherId) => teachersApi.removeTeacher(eventId!, teacherId))
          );
        }
      } catch (error) {
        console.error('Teacher update failed:', error);
        toast({
          title: 'Errore aggiornando gli insegnanti',
          description: 'Le modifiche agli insegnanti potrebbero non essere state salvate',
          variant: 'destructive',
        });
      }

      const selectedCoOrganizerIds = form.getValues('coOrganizerIds') || [];
      const currentCoOrganizers = coOrganizers || [];
      const currentCoOrganizerIds = currentCoOrganizers.map((organizer) => organizer.user_id);

      const coOrganizersToAdd = selectedCoOrganizerIds.filter(
        (id) => !currentCoOrganizerIds.includes(id)
      );
      const coOrganizersToRemove = currentCoOrganizers.filter(
        (organizer) => !selectedCoOrganizerIds.includes(organizer.user_id)
      );

      try {
        if (coOrganizersToAdd.length > 0) {
          await Promise.all(
            coOrganizersToAdd.map((userId) =>
              eventOrganizersApi.addCoOrganizer(eventId!, { userId })
            )
          );
        }
        if (coOrganizersToRemove.length > 0) {
          await Promise.all(
            coOrganizersToRemove.map((organizer) =>
              eventOrganizersApi.removeCoOrganizer(eventId!, organizer.id)
            )
          );
        }
      } catch (error) {
        console.error('Co-organizer update failed:', error);
        toast({
          title: 'Errore aggiornando i co-organizzatori',
          description: 'Le modifiche ai co-organizzatori potrebbero non essere state salvate',
          variant: 'destructive',
        });
      }

      toast({ title: t('events:messages.eventUpdated') });
      navigate(`/events/${eventId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore nell\'aggiornamento dell\'evento',
        description: error.response?.data?.message || 'Riprova',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = form.handleSubmit((data) => {
    const startsAt = data.date && data.time
      ? new Date(`${data.date.toISOString().split('T')[0]}T${data.time}:00`).toISOString()
      : new Date().toISOString();

    const endsAt = data.end_date && data.end_time
      ? new Date(`${data.end_date.toISOString().split('T')[0]}T${data.end_time}:00`).toISOString()
      : startsAt;

    let location_text: UpdateEventDto['location_text'] | undefined;
    if (data.location?.description) {
      const locationObj = {
        description: data.location.description,
        city: data.location.city,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        googleMapsUrl: data.location.googleMapsUrl,
      };
      location_text = locationObj as unknown as UpdateEventDto['location_text'];
    }

    const eventData: UpdateEventDto = {
      type: data.type,
      title: data.title,
      location_text,
      starts_at: startsAt,
      ends_at: endsAt,
      description: data.description || undefined,
      organizer_contact: data.organizerContact || '',
      tags: data.tags && data.tags.length > 0 ? data.tags : [],
      price: data.price !== undefined ? data.price.toString() : undefined,
      external_link: data.externalLink || '',
      cta_text: data.ctaText || '',
      image_url: data.image_url ?? '',
      recurrence_rule: data.recurrence?.rule || undefined,
      recurrence_dtstart: data.recurrence?.dtstart || undefined,
      recurrence_until: data.recurrence?.until || undefined,
    };

    updateMutation.mutate(eventData);
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-muted-foreground">
            {t('common:common.loading')}
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-4">Evento non trovato</p>
            <Link to="/discover">
              <Button variant="outline">Torna agli eventi</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stepLabels = [
    t('events:wizard.step1Title'),
    t('events:wizard.step2Title'),
    'Immagine',
    ...(showTeachersStep ? ['Insegnanti'] : []),
    t('events:wizard.step3Title'),
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link to={`/events/${eventId}`}>
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common:buttons.back')}
          </Button>
        </Link>
      </div>

      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{t('events:actions.editEvent')}</CardTitle>
          <CardDescription>Modifica i dettagli del tuo evento</CardDescription>
        </CardHeader>
        <CardContent>
          <WizardStepIndicator
            currentStep={currentStep}
            totalSteps={showTeachersStep ? 5 : 4}
            stepLabels={stepLabels}
            onStepClick={goToStep}
          />

          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-8">
              <div className="min-h-[400px]">
                {currentStep === 1 && <EventTypeStep form={form} />}
                {currentStep === 2 && <EventScheduleStep form={form} />}
                {currentStep === 3 && <EventImageStep key={event.id} form={form} />}
                {currentStep === 4 && !showTeachersStep && <EventPreviewStep form={form} />}
                {currentStep === 4 && showTeachersStep && <EventTeachersStep form={form} />}
                {currentStep === 5 && showTeachersStep && <EventPreviewStep form={form} />}
              </div>

              <WizardNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                onBack={prevStep}
                onNext={nextStep}
                isSubmitting={updateMutation.isPending}
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
