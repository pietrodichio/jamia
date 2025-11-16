import { useMemo, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "quill-emoji/dist/quill-emoji.css";
import "quill-emoji";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Mail, Send } from "lucide-react";
import {
  jamsApi,
  JamEmailAudience,
  SendJamEmailPayload,
  TestJamEmailPayload,
} from "@/api/jams.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sanitizeHtml } from "@/lib/sanitize";

interface JamEmailComposerProps {
  jamId: string;
  jamName: string;
  senderEmail?: string | null;
}

const audienceLabels: Record<JamEmailAudience, string> = {
  all: "Partecipanti e lista d'attesa",
  participants: "Solo partecipanti confermati",
  waiting: "Solo lista d'attesa",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "response" in error) {
    const apiError = error as { response?: { data?: { message?: string } } };
    return apiError.response?.data?.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const editorIsEmpty = (html: string): boolean => {
  if (!html) {
    return true;
  }

  const plainText = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, "")
    .trim();

  return plainText.length === 0;
};

export const JamEmailComposer = ({ jamId, jamName, senderEmail }: JamEmailComposerProps) => {
  const { toast } = useToast();
  const [audience, setAudience] = useState<JamEmailAudience>("all");
  const [subject, setSubject] = useState(`Aggiornamenti per ${jamName}`);
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [testRecipient, setTestRecipient] = useState(senderEmail || "");

  const toolbarModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "emoji"],
          ["clean"],
        ],
      },
      "emoji-toolbar": true,
      "emoji-textarea": false,
      "emoji-shortname": true,
    }),
    [],
  );

  const sendEmailMutation = useMutation({
    mutationFn: (payload: SendJamEmailPayload) =>
      jamsApi.sendJamEmail(jamId, payload),
    onSuccess: (data) => {
      toast({
        title: "Email inviata",
        description:
          data.recipientCount === 1
            ? "Messaggio inviato a 1 destinatario"
            : `Messaggio inviato a ${data.recipientCount} destinatari`,
      });
    },
    onError: (error) => {
      toast({
        title: "Errore durante l'invio",
        description: getErrorMessage(error, "Impossibile inviare l'email."),
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: (payload: TestJamEmailPayload) =>
      jamsApi.sendJamEmailTest(jamId, payload),
    onSuccess: () => {
      toast({
        title: "Email di test inviata",
        description: "Controlla la tua casella di posta per verificare il contenuto.",
      });
    },
    onError: (error) => {
      toast({
        title: "Impossibile inviare il test",
        description: getErrorMessage(error, "Invio email di test non riuscito."),
        variant: "destructive",
      });
    },
  });

  const buildBasePayload = (): SendJamEmailPayload => {
    const trimmedSubject = subject.trim();

    if (!trimmedSubject) {
      throw new Error("Il titolo dell'email è obbligatorio.");
    }

    if (editorIsEmpty(htmlContent)) {
      throw new Error("Inserisci il contenuto dell'email.");
    }

    return {
      subject: trimmedSubject,
      htmlContent: sanitizeHtml(htmlContent),
      previewText: previewText.trim() || undefined,
      audience,
    };
  };

  const handleSendEmail = () => {
    try {
      const payload = buildBasePayload();
      sendEmailMutation.mutate(payload);
    } catch (error) {
      toast({
        title: "Campi mancanti",
        description: getErrorMessage(error, "Completa tutti i campi obbligatori."),
        variant: "destructive",
      });
    }
  };

  const handleSendTestEmail = () => {
    try {
      if (!testRecipient.trim()) {
        throw new Error("Inserisci un destinatario per l'email di test.");
      }

      const payload = buildBasePayload();
      const testPayload: TestJamEmailPayload = {
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        previewText: payload.previewText,
        textContent: payload.textContent,
        recipientEmail: testRecipient.trim(),
      };
      testEmailMutation.mutate(testPayload);
    } catch (error) {
      toast({
        title: "Campi mancanti",
        description: getErrorMessage(error, "Completa tutti i campi obbligatori."),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-primary/10 shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Comunica con i partecipanti
        </CardTitle>
        <CardDescription>
          Invia aggiornamenti o promemoria a chi è iscritto alla jam. Useremo il tuo indirizzo come reply-to
          per permettere alle persone di risponderti direttamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Destinatari</Label>
            <Select value={audience} onValueChange={(value) => setAudience(value as JamEmailAudience)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Scegli chi riceverà l'email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{audienceLabels.all}</SelectItem>
                <SelectItem value="participants">{audienceLabels.participants}</SelectItem>
                <SelectItem value="waiting">{audienceLabels.waiting}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Titolo email</Label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Es. Aggiornamenti logistici"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Testo di anteprima (opzionale)</Label>
          <Input
            value={previewText}
            onChange={(event) => setPreviewText(event.target.value)}
            placeholder="Questa riga appare nella preview della casella email"
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Suggerimento: usa il testo di anteprima per anticipare il contenuto dell'email.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Contenuto</Label>
          <div className="rounded-xl border border-border bg-background">
            <ReactQuill
              value={htmlContent}
              onChange={setHtmlContent}
              modules={toolbarModules}
              className="jam-email-editor rounded-xl"
              placeholder="Scrivi il messaggio da inviare ai partecipanti..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="space-y-1.5">
            <Label>Email di test</Label>
            <div className="flex items-center gap-x-8 justify-between">
            <Input
              type="email"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
              placeholder="tuoindirizzo@email.com"
              className="rounded-xl"
            />
            <Button
            variant="outline"
            className="rounded-xl"
            onClick={handleSendTestEmail}
            disabled={testEmailMutation.isPending || sendEmailMutation.isPending}
          >
            {testEmailMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Invia test
          </Button>
            </div>
          
           
          </div>
          
        </div>

        <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
              Le risposte verranno inoltrate a:{" "}
              {senderEmail ? (
                <span className="font-medium text-foreground">{senderEmail}</span>
              ) : (
                "non disponibile"
              )}
            </p>
          <Button
            className="rounded-xl"
            onClick={handleSendEmail}
            disabled={sendEmailMutation.isPending || testEmailMutation.isPending}
          >
            {sendEmailMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Invia a {audience === "all" ? "tutti" : audience === "participants" ? "i partecipanti" : "la lista d'attesa"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
