import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type FormSwitchProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export const FormSwitch = ({ id, label, description, checked, onChange, disabled }: FormSwitchProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-base">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
};

