import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Edit,
    Trash2,
    Users,
    UserPlus,
    Calendar,
    Shield,
    UserCheck,
    Copy,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DeleteEventDialog } from './DeleteEventDialog';
import { ManageCoOrganizersDialog } from './ManageCoOrganizersDialog';
import { ManageTeachersDialog } from './ManageTeachersDialog';
import { jamsApi } from '@/api/jams.api';
import { useToast } from '@/hooks/use-toast';
import type { EventWithOrganizer } from '@jamia/types';
import type { EventTeacher } from '@jamia/types/event';

/**
 * Helper to determine if an event is a managed jam (has participant management).
 * Returns the jam ID to use for cloning (source_jam_id for legacy, event.id for unified lookup).
 */
function getJamId(event: EventWithOrganizer): string | null {
    if (event.source_jam_id) {
        return event.source_jam_id;
    }
    if (event.type === 'jam' && event.manage_participants) {
        return event.id;
    }
    return null;
}

interface EventAdminActionsProps {
    event: EventWithOrganizer;
    teachers?: EventTeacher[];
    isOwner: boolean;
    isCoOrganizer: boolean;
    isSuperAdmin: boolean;
    canEditOccurrences: boolean;
}

export function EventAdminActions({
    event,
    teachers = [],
    isOwner,
    isCoOrganizer,
    isSuperAdmin,
    canEditOccurrences,
}: EventAdminActionsProps) {
    const navigate = useNavigate();
    const { t } = useTranslation(['events', 'common']);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Get jam ID for managed jam events (for cloning)
    const jamId = getJamId(event);

    // Clone jam mutation
    const cloneMutation = useMutation({
        mutationFn: async (id: string) => {
            return jamsApi.cloneJam(id);
        },
        onSuccess: (clonedJam) => {
            toast({
                title: 'Jam clonata!',
                description: 'La jam e stata clonata con successo',
            });
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['jams'] });
            queryClient.invalidateQueries({ queryKey: ['events'] });
            // Navigate to edit the cloned jam
            navigate(`/jam/${clonedJam.id}/edit`);
        },
        onError: () => {
            toast({
                title: 'Errore',
                description: 'Impossibile clonare la jam',
                variant: 'destructive',
            });
        },
    });

    const handleClone = () => {
        if (jamId) {
            cloneMutation.mutate(jamId);
        }
    };

    // Don't render if user has no admin permissions
    if (!isOwner && !isCoOrganizer && !isSuperAdmin) {
        return null;
    }

    const handleEditEvent = () => {
        navigate(`/events/${event.id}/edit`);
    };

    const handleScrollToOccurrences = () => {
        const occurrencesSection = document.getElementById('event-occurrences');
        if (occurrencesSection) {
            occurrencesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Determine permission badge
    const getPermissionBadge = () => {
        if (isSuperAdmin) {
            return <Badge variant="destructive">Super Admin</Badge>;
        }
        if (isOwner) {
            return <Badge variant="default">Proprietario</Badge>;
        }
        if (isCoOrganizer) {
            return <Badge variant="secondary">Co-Organizzatore</Badge>;
        }
        return null;
    };

    return (
        <Card className="border-primary/20 bg-primary/5 rounded-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        {t('events:admin.title')}
                    </CardTitle>
                    {getPermissionBadge()}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Owner/Super Admin Actions */}
                {(isOwner || isSuperAdmin) && (
                    <>
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">
                                {t('events:admin.ownerActions')}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleEditEvent}
                                    className="rounded-xl"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t('events:actions.editEvent')}
                                </Button>

                                {/* Clone button - only for managed jam events */}
                                {jamId && (
                                    <Button
                                        variant="outline"
                                        onClick={handleClone}
                                        disabled={cloneMutation.isPending}
                                        className="rounded-xl"
                                    >
                                        {cloneMutation.isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Copy className="mr-2 h-4 w-4" />
                                        )}
                                        Clona Jam
                                    </Button>
                                )}

                                <ManageCoOrganizersDialog eventId={event.id} isOwner={isOwner}>
                                    <Button variant="outline" className="rounded-xl">
                                        <Users className="mr-2 h-4 w-4" />
                                        {t('events:admin.manageCoOrganizers')}
                                    </Button>
                                </ManageCoOrganizersDialog>

                                {event.type !== 'jam' && (
                                    <ManageTeachersDialog
                                        eventId={event.id}
                                        currentTeachers={teachers}
                                        isOwner={isOwner}
                                    >
                                        <Button variant="outline" className="rounded-xl">
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            {t('events:admin.manageTeachers')}
                                        </Button>
                                    </ManageTeachersDialog>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteDialogOpen(true)}
                                    className="rounded-xl text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('events:actions.deleteEvent')}
                                </Button>
                            </div>
                        </div>

                        {(isOwner || isSuperAdmin) && canEditOccurrences && <Separator />}
                    </>
                )}

                {/* Occurrence Management - Available to Owner, Co-Organizer, and Super Admin */}
                {canEditOccurrences && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">
                            {t('events:admin.occurrenceManagement')}
                        </h4>
                        {event.recurrence_rule ? (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {t('events:admin.occurrenceManagementDescription')}
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={handleScrollToOccurrences}
                                    className="rounded-xl"
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {t('events:admin.editOccurrences')}
                                </Button>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t('events:admin.noRecurrence')}
                            </p>
                        )}
                    </div>
                )}

                {/* Co-Organizer Info */}
                {isCoOrganizer && !isOwner && (
                    <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-start gap-2">
                            <UserCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                {t('events:admin.coOrganizerInfo')}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* Delete Event Dialog */}
            <DeleteEventDialog
                eventId={event.id}
                eventTitle={event.title}
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            />
        </Card>
    );
}
