import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/api/events.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Event, UpdateOccurrenceDto, UpdateEventDto } from '@jamia/types/event';

interface OccurrenceEditorProps {
  event: Event;
  occurrenceDate: string;
  isOpen: boolean;
  onClose: () => void;
}

export function OccurrenceEditor({ event, occurrenceDate, isOpen, onClose }: OccurrenceEditorProps) {
  const [editScope, setEditScope] = useState<'this' | 'future'>('this');
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateOccurrenceMutation = useMutation({
    mutationFn: (dto: UpdateOccurrenceDto) =>
      eventsApi.updateOccurrence(event.id, occurrenceDate, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', event.id] });
      toast({ title: 'Occurrence updated successfully' });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update occurrence',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const updateFutureMutation = useMutation({
    mutationFn: (dto: UpdateEventDto) =>
      eventsApi.updateFutureOccurrences(event.id, occurrenceDate, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', event.id] });
      toast({ title: 'Series updated successfully' });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update series',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    if (editScope === 'this') {
      // Edit single occurrence
      const dto: UpdateOccurrenceDto = {
        override_title: title !== event.title ? title : undefined,
        override_description: description !== event.description ? description : undefined
      };
      updateOccurrenceMutation.mutate(dto);
    } else {
      // Edit all future occurrences (series split)
      const dto: UpdateEventDto = {
        title,
        description
      };
      updateFutureMutation.mutate(dto);
    }
  };

  const handleCancel = () => {
    const dto: UpdateOccurrenceDto = { is_cancelled: true };
    updateOccurrenceMutation.mutate(dto);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Recurring Event</DialogTitle>
          <DialogDescription>
            Choose how to apply your changes to this recurring event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={editScope} onValueChange={(v) => setEditScope(v as 'this' | 'future')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="this" id="this" />
              <Label htmlFor="this">
                This occurrence only ({new Date(occurrenceDate).toLocaleDateString()})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="future" id="future" />
              <Label htmlFor="future">
                This and all future occurrences
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleCancel}>
            Cancel This Occurrence
          </Button>
          <Button onClick={handleSave} disabled={updateOccurrenceMutation.isPending || updateFutureMutation.isPending}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
