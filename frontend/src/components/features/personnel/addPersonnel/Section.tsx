import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AddNewUserInput } from "@/interface/users/users";
import { SECTIONS, SECTION_LABELS, type Section } from "@/constants/personnel";
import useGetAllOffices from "@/hooks/offices/useGetAllOffices";
import { sectionRule } from "@/utils/permissions";

const ALL_SECTIONS = "ALL";

// The station section the account works in. It decides which incidents an
// encoder may record (REQUIREMENTS.md §7.3, §7.4).
const SectionField = () => {
  const { control } = useFormContext<AddNewUserInput>();
  const { offices } = useGetAllOffices();
  const [role, officeId] = useWatch({ control, name: ["role", "officeId"] });

  const officeType = offices.find((office) => office.id === officeId)?.type;
  const rule = sectionRule(role, officeType);

  if (rule === "none") {
    return null;
  }

  return (
    <Controller
      name='section'
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor='section'>
            Section{rule === "optional" && " (optional)"}
          </FieldLabel>

          <Select
            value={field.value ?? ALL_SECTIONS}
            onValueChange={(value) =>
              field.onChange(value === ALL_SECTIONS ? null : value)
            }
          >
            <SelectTrigger id='section'>
              <SelectValue>
                {field.value
                  ? SECTION_LABELS[field.value as Section]
                  : rule === "optional"
                    ? "All sections"
                    : "Select section"}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {rule === "optional" && (
                <SelectItem value={ALL_SECTIONS}>All sections</SelectItem>
              )}
              {SECTIONS.map((section) => (
                <SelectItem key={section} value={section}>
                  {SECTION_LABELS[section]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <FieldDescription>
            {role === "ENCODER"
              ? "Encoders record only their section's incidents: Operations → Fire, EMS → EMS, SRF → Special Rescue."
              : "Viewers with a section see only that section's records."}
          </FieldDescription>

          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};

export default SectionField;
