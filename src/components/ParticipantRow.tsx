import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/UserAvatar";
import { type Participant, type ParticipantUpdatableRole } from "@/api/participants.api";

type ParticipantWithProfile = Participant;

const getParticipantFullName = (participant: ParticipantWithProfile) => {
  const firstName = participant.profiles?.first_name ?? "";
  const lastName = participant.profiles?.last_name ?? "";

  return `${firstName} ${lastName}`.trim();
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "base":
      return "bg-blue-500/10 text-blue-600";
    case "flyer":
      return "bg-pink-500/10 text-pink-600";
    default:
      return "bg-purple-500/10 text-purple-600";
  }
};

const formatJoinedDate = (joinedAt: string) => {
  const date = new Date(joinedAt);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return formatDistanceToNow(date, { addSuffix: true, locale: it });
  }

  if (diffInHours < 24 * 7) {
    return format(date, "EEEE 'alle' HH:mm", { locale: it });
  }

  return format(date, "d MMMM 'alle' HH:mm", { locale: it });
};

interface ParticipantRowProps {
  participant: ParticipantWithProfile;
  isOwner: boolean;
  canEditRole: boolean;
  onRemove: (participant: ParticipantWithProfile) => void;
  isRemoving: boolean;
  onChangeRole?: (role: ParticipantUpdatableRole) => void;
  isUpdatingRole?: boolean;
  extraActions?: React.ReactNode;
  showJoinedAt?: boolean;
  customStatus?: React.ReactNode;
}

export const ParticipantRow = ({
  participant,
  isOwner,
  canEditRole,
  onRemove,
  isRemoving,
  onChangeRole,
  isUpdatingRole,
  extraActions,
  showJoinedAt = true,
  customStatus,
}: ParticipantRowProps) => (
  <div className="flex items-center flex-col justify-between gap-3 p-3 bg-secondary/20 rounded-xl">
    <div className="flex items-center gap-2 flex-shrink-0 self-start w-full">

    <div className="flex items-start gap-3 min-w-0 flex-1 overflow-hidden">
      <UserAvatar
        photoUrl={participant.profiles?.photo_url}
        firstName={participant.profiles?.first_name}
        lastName={participant.profiles?.last_name}
        size="md"
      />

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0 md:max-w-fit">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="min-w-0 flex-1 md:w-fit">
                  <p className="font-medium truncate md:w-fit">{getParticipantFullName(participant)}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>{getParticipantFullName(participant)}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {canEditRole && onChangeRole && (
            <div className="flex-shrink-0">
              <Select
                disabled={isUpdatingRole}
                value={participant.role === "base" ? "base" : "flyer"}
                onValueChange={(value) => onChangeRole(value as ParticipantUpdatableRole)}
              >
                <SelectTrigger
                  className={`h-7 w-fit gap-x-2 px-2 text-xs rounded-lg ${getRoleBadgeColor(participant.role)} ${isUpdatingRole ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <SelectValue placeholder="Ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="flyer">Flyer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2 flex-shrink-0 sm:hidden">
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(participant)}
                disabled={isRemoving}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:hidden">
          {isOwner && participant.profiles?.phone && (
            <a
              href={`https://api.whatsapp.com/send/?phone=${participant.profiles.phone.replace(/^\+/, "")}&text&type=phone_number&app_absent=0`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline cursor-pointer truncate"
            >
              {participant.profiles.phone}
            </a>
          )}
          {customStatus ? (
            customStatus
          ) : showJoinedAt && participant.joined_at ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground truncate cursor-default">
                    {formatJoinedDate(participant.joined_at)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{formatJoinedDate(participant.joined_at)}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        {isOwner && participant.profiles?.phone && (
          <a
            href={`https://api.whatsapp.com/send/?phone=${participant.profiles.phone.replace(/^\+/, "")}&text&type=phone_number&app_absent=0`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline cursor-pointer truncate hidden sm:inline"
          >
            {participant.profiles.phone}
          </a>
        )}
      </div>
    </div>

    <div className="hidden sm:flex flex-col items-end gap-y-2 flex-shrink-0 self-start">
      <div className="flex items-center gap-2">
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(participant)}
            disabled={isRemoving}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {customStatus ? (
        customStatus
      ) : showJoinedAt && participant.joined_at ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground text-right whitespace-nowrap cursor-default">
                {formatJoinedDate(participant.joined_at)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <span>{formatJoinedDate(participant.joined_at)}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className="text-xs text-muted-foreground text-right">-</span>
      )}
    </div>
    </div>
    {extraActions && (
      <div className="flex items-center gap-2 flex-shrink-0 self-start w-full">
        {extraActions}
      </div>
    )}
  </div>
);
