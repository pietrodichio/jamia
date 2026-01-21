import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ACCOMMODATION_OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'camping', label: 'Camping' },
  { value: 'dormitory', label: 'Dormitory' },
  { value: 'homestay', label: 'Homestay' },
  { value: 'included', label: 'Included in Price' },
];

const FOOD_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'included', label: 'Included in Price' },
  { value: 'vegan', label: 'Vegan Options' },
  { value: 'vegetarian', label: 'Vegetarian Options' },
  { value: 'gluten-free', label: 'Gluten-Free Options' },
];

interface AmenityFiltersProps {
  selectedAccommodation: string[];
  selectedFood: string[];
  onAccommodationChange: (options: string[]) => void;
  onFoodChange: (options: string[]) => void;
}

export function AmenityFilters({
  selectedAccommodation,
  selectedFood,
  onAccommodationChange,
  onFoodChange
}: AmenityFiltersProps) {
  const toggleAccommodation = (option: string) => {
    if (selectedAccommodation.includes(option)) {
      onAccommodationChange(selectedAccommodation.filter(o => o !== option));
    } else {
      onAccommodationChange([...selectedAccommodation, option]);
    }
  };

  const toggleFood = (option: string) => {
    if (selectedFood.includes(option)) {
      onFoodChange(selectedFood.filter(o => o !== option));
    } else {
      onFoodChange([...selectedFood, option]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Accommodation */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Accommodation</h3>
        <div className="space-y-2">
          {ACCOMMODATION_OPTIONS.map(({ value, label }) => (
            <div key={value} className="flex items-center gap-2">
              <Checkbox
                id={`accommodation-${value}`}
                checked={selectedAccommodation.includes(value)}
                onCheckedChange={() => toggleAccommodation(value)}
              />
              <Label
                htmlFor={`accommodation-${value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Food */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Food Options</h3>
        <div className="space-y-2">
          {FOOD_OPTIONS.map(({ value, label }) => (
            <div key={value} className="flex items-center gap-2">
              <Checkbox
                id={`food-${value}`}
                checked={selectedFood.includes(value)}
                onCheckedChange={() => toggleFood(value)}
              />
              <Label
                htmlFor={`food-${value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
