import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AddNewUserInput } from "@/interface/users/users";

// The BFP order assigning the person to the section (FR-USR-003). Kept in
// the audit log with every section change.
const DesignationRef = () => {
  const { control } = useFormContext<AddNewUserInput>();
  const section = useWatch({ control, name: "section" });

  if (!section) {
    return null;
  }

  return (
    <Controller
      name='sectionDesignationRef'
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor='sectionDesignationRef'>
            Designation order (optional)
          </FieldLabel>
          <Input
            id='sectionDesignationRef'
            {...field}
            value={field.value ?? ""}
            placeholder='e.g. Special Order No. 2026-118'
            aria-invalid={fieldState.invalid}
          />
          <FieldDescription>
            The Special Order or office order assigning this section.
          </FieldDescription>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};

export default DesignationRef;
