import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jamFormDefaults, jamFormSchema, JamFormValues } from "@/lib/jam-form";

type UseJamFormOptions = {
  defaultValues?: Partial<JamFormValues>;
};

export const useJamForm = (options?: UseJamFormOptions) =>
  useForm<JamFormValues>({
    resolver: zodResolver(jamFormSchema),
    defaultValues: {
      ...jamFormDefaults,
      ...options?.defaultValues,
    },
  });
