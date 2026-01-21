import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const TAG_OPTIONS = [
  { value: 'beginner-friendly', label: 'Beginner Friendly' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'indoor', label: 'Indoor' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'mat-required', label: 'Mat Required' },
  { value: 'bring-partner', label: 'Bring Partner' },
  { value: 'drop-in', label: 'Drop-in' },
];

interface TagFilterProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export function TagFilter({ selectedTags, onChange }: TagFilterProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Tags</h3>
      <div className="space-y-2">
        {TAG_OPTIONS.map(({ value, label }) => (
          <div key={value} className="flex items-center gap-2">
            <Checkbox
              id={`tag-${value}`}
              checked={selectedTags.includes(value)}
              onCheckedChange={() => toggleTag(value)}
            />
            <Label
              htmlFor={`tag-${value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
