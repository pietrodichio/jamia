import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  photoUrl?: string | null;
  firstName?: string;
  lastName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export const UserAvatar = ({ 
  photoUrl, 
  firstName = "", 
  lastName = "", 
  size = "md",
  className = ""
}: UserAvatarProps) => {
  const getInitials = () => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || "";
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || "";
    return firstInitial + lastInitial || "?";
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {photoUrl && <AvatarImage src={photoUrl} alt={`${firstName} ${lastName}`} />}
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
};

