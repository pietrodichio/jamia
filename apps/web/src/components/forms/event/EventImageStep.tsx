import { useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { EventFormData } from '@/hooks/useEventWizard';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface EventImageStepProps {
  form: UseFormReturn<EventFormData>;
}

export function EventImageStep({ form }: EventImageStepProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    form.getValues('image_url') || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Formato non supportato',
        description: 'Usa JPEG, PNG o WebP',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File troppo grande',
        description: 'Massimo 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Compress image
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filename = `${crypto.randomUUID()}.${fileExtension}`;

      // Upload to event-images bucket
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(filename, compressed);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('event-images').getPublicUrl(data.path);

      // Set form value and preview
      form.setValue('image_url', publicUrl);
      setPreviewUrl(publicUrl);

      toast({
        title: 'Immagine caricata',
        description: 'Immagine caricata con successo',
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Errore',
        description: 'Caricamento fallito',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleRemoveImage = () => {
    form.setValue('image_url', '');
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Immagine dell'evento</h3>
        <p className="text-sm text-muted-foreground">
          Aggiungi un'immagine che rappresenti il tuo evento. L'immagine sarà
          mostrata nella pagina di dettaglio e nelle anteprime.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview or upload area */}
      {previewUrl ? (
        <Card className="relative overflow-hidden">
          <div className="aspect-video relative">
            <img
              src={previewUrl}
              alt="Event preview"
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card
          className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
          onClick={triggerFileInput}
        >
          <div className="aspect-video flex flex-col items-center justify-center p-8 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Clicca per selezionare un'immagine
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG o WebP • Max 5MB
            </p>
          </div>
        </Card>
      )}

      {/* Upload button */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={triggerFileInput}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-pulse" />
              Caricamento...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? 'Cambia immagine' : 'Carica immagine'}
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        L'immagine è opzionale. Puoi sempre aggiungerla o modificarla in seguito.
      </p>
    </div>
  );
}
