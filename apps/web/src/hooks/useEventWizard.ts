import { useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Event form schema
const eventFormSchema = z.object({
  type: z.enum(['jam', 'class', 'workshop', 'convention']),
  title: z.string().min(3, 'Minimo 3 caratteri').max(100, 'Massimo 100 caratteri'),
  description: z.string().max(1000, 'Massimo 1000 caratteri').optional(),
  location: z.string().min(3, 'Minimo 3 caratteri'),
  tags: z.array(z.string()).optional(),
  date: z.date({ required_error: 'Data richiesta' }),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm richiesto'),
  end_date: z.date().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm').optional().or(z.literal('')),
  price: z.number().min(0, 'Il prezzo non può essere negativo').optional(),
  link: z.string().url('URL non valido').optional().or(z.literal('')),
  // Jam participant management fields
  manageParticipants: z.boolean().optional(),
  capacity: z.number().min(1, 'Minimo 1 partecipante').optional(),
  visibility: z.enum(['public', 'private']).optional(),
  roles: z.object({
    base: z.boolean().optional(),
    flyer: z.boolean().optional(),
    spotter: z.boolean().optional(),
  }).optional(),
  // External registration fields
  externalLink: z.string().url('URL non valido').optional().or(z.literal('')),
  ctaText: z.string().max(30, 'Massimo 30 caratteri').optional(),
  // Image upload field
  image_url: z.string().url('URL non valido').optional().or(z.literal('')),
  // Teacher selection (for class/workshop/convention)
  teacherIds: z.array(z.string().uuid()).optional(),
});

export type EventFormData = z.infer<typeof eventFormSchema>;

// Define which fields belong to each step
const stepFields: Record<number, (keyof EventFormData)[]> = {
  1: ['type', 'title', 'description', 'location', 'tags', 'manageParticipants', 'capacity', 'visibility'],
  2: ['date', 'time', 'end_date', 'end_time', 'price', 'link', 'externalLink', 'ctaText'],
  3: ['image_url'], // Image upload step
  4: ['teacherIds'], // Teacher selection step
  5: [], // Preview step - no validation needed
};

interface UseEventWizardReturn {
  currentStep: number;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  form: UseFormReturn<EventFormData>;
  isStepValid: boolean;
  getStepFields: (step: number) => (keyof EventFormData)[];
}

export function useEventWizard(): UseEventWizardReturn {
  const [currentStep, setCurrentStep] = useState(1);
  const [isStepValid, setIsStepValid] = useState(false);

  // Initialize form with React Hook Form
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    shouldUnregister: true, // Critical: unregister hidden fields when they unmount
    mode: 'onChange', // Validate on change for better UX
    defaultValues: {
      type: 'jam',
      title: '',
      description: '',
      location: '',
      tags: [],
      time: '',
      end_time: '',
      price: undefined,
      link: '',
      manageParticipants: false,
      visibility: 'public',
      roles: {
        base: false,
        flyer: false,
        spotter: false,
      },
      externalLink: '',
      ctaText: 'Registrati',
      image_url: '',
      teacherIds: [],
    },
  });

  const { trigger } = form;

  // Get fields for a specific step
  const getStepFields = (step: number): (keyof EventFormData)[] => {
    return stepFields[step] || [];
  };

  // Validate current step and move to next step if valid
  const nextStep = async () => {
    const fields = getStepFields(currentStep);
    const isValid = await trigger(fields);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      setIsStepValid(false); // Reset for next step
    } else {
      setIsStepValid(false);
    }
  };

  // Move to previous step without validation
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setIsStepValid(true); // Assume previous step was valid
  };

  return {
    currentStep,
    nextStep,
    prevStep,
    form,
    isStepValid,
    getStepFields,
  };
}
