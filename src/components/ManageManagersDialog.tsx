import { useState, useEffect } from "react";
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
  const [managers, setManagers] = useState<JamManager[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadManagers();
    }
  }, [open, jamId]);

  const loadManagers = async () => {
    try {
      setIsLoading(true);
      const managersData = await managersApi.getJamManagers(jamId);
      setManagers(managersData);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const data = await profilesApi.searchUsers(query, 10);

      // Filter out users who are already managers
      const managerIds = managers.map((m) => m.user_id);
      const filteredResults = data.filter(
        (user) => !managerIds.includes(user.id)
      );

      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const handleAddManager = async (userId: string, userName: string) => {
    try {
      await managersApi.addJamManager(jamId, userId);
      toast({
        title: "Manager aggiunto",
        description: `${userName} è ora un manager di questa jam`,
      });
      setSearchQuery("");
      setSearchResults([]);
      loadManagers();
      onManagersUpdated();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveManager = async (managerUserId: string, managerName: string) => {
    try {
      await managersApi.removeJamManager(jamId, managerUserId);
      toast({
        title: "Manager rimosso",
        description: `${managerName} non è più un manager di questa jam`,
      });
      loadManagers();
      onManagersUpdated();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldEllipsis className="h-5 w-5" />
            Gestisci Manager
          </DialogTitle>
          <DialogDescription>
            Aggiungi o rimuovi manager per questa jam. I manager hanno gli stessi
            permessi del proprietario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search for new managers */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Aggiungi Manager</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
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
                      disabled={isSearching}
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
            <label className="text-sm font-medium">Manager Attuali</label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : managers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun manager aggiunto
              </p>
            ) : (
              <div className="space-y-2">
                {managers.map((manager) => (
                  <div
                    key={manager.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {manager.profiles.first_name} {manager.profiles.last_name || ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {manager.profiles.email}
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRemoveManager(manager.user_id, `${manager.profiles.first_name} ${manager.profiles.last_name || ''}`.trim())
                        }
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
