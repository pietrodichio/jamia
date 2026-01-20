import { useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { participantsApi, type ManagedParticipantDto, type Participant } from "@/api/participants.api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const phoneNumberRegex = /^\+?[0-9\s\-().]{7,20}$/;
const roleOptions = ["both", "base", "flyer"] as const;

const addParticipantSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .min(1, "L'email è obbligatoria.")
    .email("Inserisci un'email valida."),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || phoneNumberRegex.test(value), {
      message: "Inserisci un numero di telefono valido.",
    }),
  role: z.enum(roleOptions),
});

type AddParticipantFormValues = z.infer<typeof addParticipantSchema>;

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jamId: string;
  onParticipantsUpdated?: () => void;
}

export const AddParticipantDialog = ({
  open,
  onOpenChange,
  jamId,
  onParticipantsUpdated,
}: AddParticipantDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddParticipantFormValues>({
    resolver: zodResolver(addParticipantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "flyer",
    },
  });

  const { handleSubmit, control, reset, formState } = form;

  const addParticipantMutation = useMutation<Participant, unknown, ManagedParticipantDto>({
    mutationFn: async (payload) => participantsApi.addParticipantAsManager(jamId, payload),
    onSuccess: (result) => {
      toast({
        title: result.state === "waiting" ? "Aggiunto alla lista d'attesa" : "Partecipante confermato",
        description: result.invited
          ? "Abbiamo inviato un invito via email al partecipante."
          : "Il partecipante è stato aggiunto con successo.",
      });
      reset({ firstName: "", lastName: "", email: "", phone: "", role: "flyer" });
      onParticipantsUpdated?.();
      queryClient.invalidateQueries({ queryKey: ["jam-participants", jamId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.response?.data?.message || "Impossibile aggiungere il partecipante",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AddParticipantFormValues) => {
    addParticipantMutation.mutate({
      email: values.email.trim(),
      firstName: values.firstName?.trim() || undefined,
      lastName: values.lastName?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      role: values.role,
    });
  };

  useEffect(() => {
    if (!open) {
      reset({ firstName: "", lastName: "", email: "", phone: "", role: "flyer" });
    }
  }, [open, reset]);

  const isSubmitting = addParticipantMutation.isPending;
  const isDisabled = useMemo(
    () => isSubmitting || !formState.isValid || !formState.isDirty,
    [formState.isDirty, formState.isValid, isSubmitting],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aggiungi partecipante</DialogTitle>
          <DialogDescription>
            Invita partecipanti o prenota un posto per chi non ha ancora un account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Giulia" className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Rossi" className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="nome@email.com" className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono (opzionale)</FormLabel>
                    <FormControl>
                      <Input placeholder="+39 ..." className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ruolo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Seleziona un ruolo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="base">Base</SelectItem>
                        <SelectItem value="flyer">Flyer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Se la persona non ha un account riceverà un invito automatico via email.
            </p>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Annulla
              </Button>
              <Button type="submit" className="rounded-xl" disabled={isDisabled}>
                {isSubmitting ? "Aggiugendo..." : "Aggiungi partecipante"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

