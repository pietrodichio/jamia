import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserPlus, X, Search, ShieldEllipsis } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { managersApi, JamManager } from "@/api/managers.api";
import { profilesApi } from "@/api/profiles.api";
import { useDebounce } from "@/hooks/use-debounce";

interface ManageManagersDialogProps {
  jamId: string;
  isOwner: boolean;
  onManagersUpdated: () => void;
  children: React.ReactNode;
}

export const ManageManagersDialog = ({
  jamId,
  isOwner,
  onManagersUpdated,
  children,
}: ManageManagersDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Query for managers
  const managersQuery = useQuery<JamManager[]>({
    queryKey: ["jam-managers", jamId],
    enabled: open,
    queryFn: async () => {
      try {
        return await managersApi.getJamManagers(jamId);
      } catch (error: unknown) {
        const errorMessage =
          error && typeof error === "object" && "response" in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : error instanceof Error
              ? error.message
              : "Errore sconosciuto";
        toast({
          title: "Errore",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }
    },
  });

  const managers = managersQuery.data || [];
  const managerIds = managers.map((m) => m.user_id);

  // Query for user search - enabled when dialog is open
  // Shows initial results when dialog opens (empty query), or filtered results when typing
  const searchQueryEnabled = open && managersQuery.isSuccess;
  const searchUsersQuery = useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: ["search-users", jamId, debouncedSearchQuery, managerIds.sort().join(",")],
    enabled: searchQueryEnabled,
    queryFn: async () => {
      const data = await profilesApi.searchUsers(debouncedSearchQuery, 10, jamId);

      // Filter out users who are already managers
      return data.filter((user) => !managerIds.includes(user.id));
    },
  });

  const searchResults = searchUsersQuery.data || [];
  const isSearching = searchUsersQuery.isFetching;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const addManagerMutation = useMutation({
    mutationFn: async ({ userId, userName }: { userId: string; userName: string }) => {
      await managersApi.addJamManager(jamId, userId);
      return { userId, userName };
    },
    onSuccess: ({ userName }) => {
      toast({
        title: "Manager aggiunto",
        description: `${userName} è ora un manager di questa jam`,
      });
      setSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ["jam-managers", jamId] });
      queryClient.invalidateQueries({ queryKey: ["search-users", jamId] });
      onManagersUpdated();
    },
    onError: (error: unknown) => {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : error instanceof Error
            ? error.message
            : "Errore sconosciuto";
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const removeManagerMutation = useMutation({
    mutationFn: async ({ managerUserId, managerName }: { managerUserId: string; managerName: string }) => {
      await managersApi.removeJamManager(jamId, managerUserId);
      return { managerUserId, managerName };
    },
    onSuccess: ({ managerName }) => {
      toast({
        title: "Manager rimosso",
        description: `${managerName} non è più un manager di questa jam`,
      });
      queryClient.invalidateQueries({ queryKey: ["jam-managers", jamId] });
      onManagersUpdated();
    },
    onError: (error: unknown) => {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : error instanceof Error
            ? error.message
            : "Errore sconosciuto";
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleAddManager = (userId: string, userName: string) => {
    addManagerMutation.mutate({ userId, userName });
  };

  const handleRemoveManager = (managerUserId: string, managerName: string) => {
    removeManagerMutation.mutate({ managerUserId, managerName });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldEllipsis className="h-5 w-5" />
            Gestisci Manager
          </DialogTitle>
          <DialogDescription>
            Aggiungi o rimuovi manager per questa jam. I manager hanno gli stessi permessi del
            proprietario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search for new managers */}
          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">Aggiungi Manager</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Cerca per nome o email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddManager(user.id, user.name)}
                      disabled={isSearching || addManagerMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current managers */}
          <div className="space-y-2">
            <label htmlFor="managers" className="text-sm font-medium">Manager Attuali</label>
            {managersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : managers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun manager aggiunto</p>
            ) : (
              <div className="space-y-2">
                {managers.map((manager) => (
                  <div
                    key={manager.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {manager.profiles.first_name} {manager.profiles.last_name || ""}
                      </p>
                      <p className="text-sm text-muted-foreground">{manager.profiles.email}</p>
                    </div>
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRemoveManager(
                            manager.user_id,
                            `${manager.profiles.first_name} ${manager.profiles.last_name || ""}`.trim(),
                          )
                        }
                        disabled={removeManagerMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isOwner && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Solo il proprietario può aggiungere o rimuovere manager
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
