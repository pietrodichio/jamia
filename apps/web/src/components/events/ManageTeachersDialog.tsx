import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { teachersApi } from '@/api/teachers.api';
import { useDebounce } from '@/hooks/use-debounce';
import type { EventTeacher } from '@jamia/types/event';

interface ManageTeachersDialogProps {
  eventId: string;
  currentTeachers: EventTeacher[];
  isOwner: boolean;
  children: React.ReactNode;
}

export function ManageTeachersDialog({
  eventId,
  currentTeachers,
  isOwner,
  children,
}: ManageTeachersDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation(['events', 'common']);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search users for teacher selection
  const searchUsersQuery = useQuery({
    queryKey: ['users', 'search', eventId, debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url, email')
        .or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: open && debouncedSearchQuery.length >= 2,
  });

  const currentTeacherIds = currentTeachers.map((t) => t.user_id);
  const searchResults = searchUsersQuery.data || [];
  const filteredResults = searchResults.filter((user) => !currentTeacherIds.includes(user.id));

  const addTeacherMutation = useMutation({
    mutationFn: (userId: string) => teachersApi.addTeacher(eventId, { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'teachers'] });
      toast({
        title: t('events:admin.teacherAdded'),
        description: t('events:admin.teacherAddedDescription'),
      });
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: t('common:common.error'),
        description: error.response?.data?.message || t('common:common.error'),
        variant: 'destructive',
      });
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => teachersApi.removeTeacher(eventId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'teachers'] });
      toast({
        title: t('events:admin.teacherRemoved'),
        description: t('events:admin.teacherRemovedDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('common:common.error'),
        description: t('events:admin.teacherRemoveError'),
        variant: 'destructive',
      });
    },
  });

  if (!isOwner) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('events:admin.manageTeachers')}
          </DialogTitle>
          <DialogDescription>
            {t('events:admin.manageTeachersDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search for new teachers */}
          <div className="space-y-2">
            <label htmlFor="teacher-search" className="text-sm font-medium">
              {t('events:admin.addTeacher')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="teacher-search"
                type="text"
                placeholder={t('events:admin.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchUsersQuery.isFetching && (
              <p className="text-sm text-muted-foreground">{t('common:common.loading')}</p>
            )}

            {filteredResults.length > 0 && !searchUsersQuery.isFetching && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 p-2 border rounded-lg"
                  >
                    {user.photo_url && (
                      <img
                        src={user.photo_url}
                        alt={`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Nome non disponibile'}
                      </p>
                      {user.email && (
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addTeacherMutation.mutate(user.id)}
                      disabled={addTeacherMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && filteredResults.length === 0 && !searchUsersQuery.isFetching && (
              <p className="text-sm text-muted-foreground">{t('events:admin.noUsersFound')}</p>
            )}
          </div>

          {/* Current teachers */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('events:admin.currentTeachers')}</label>
            {currentTeachers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('events:admin.noTeachers')}</p>
            ) : (
              <div className="space-y-2">
                {currentTeachers.map((teacher) => {
                  const firstName = teacher.profiles?.first_name || '';
                  const lastName = teacher.profiles?.last_name || '';
                  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Nome non disponibile';
                  return (
                    <div
                      key={teacher.id}
                      className="flex items-center gap-2 p-2 border rounded-lg"
                    >
                      {teacher.profiles?.photo_url && (
                        <img
                          src={teacher.profiles.photo_url}
                          alt={fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{fullName}</p>
                        {teacher.profiles?.email && (
                          <p className="text-sm text-muted-foreground">{teacher.profiles.email}</p>
                        )}
                        {teacher.role && (
                          <p className="text-xs text-muted-foreground">{teacher.role}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeTeacherMutation.mutate(teacher.id)}
                        disabled={removeTeacherMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
