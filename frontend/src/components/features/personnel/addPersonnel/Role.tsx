import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AddNewUserInput } from "@/interface/users/users";
import { ROLE_LABELS } from "@/constants/personnel";
import { useUserStore } from "@/store/userStore";
import { assignableRoles } from "@/utils/permissions";

const Role = () => {
  const { control, setValue } = useFormContext<AddNewUserInput>();
  const currentUser = useUserStore((state) => state.user);
  const options = assignableRoles(currentUser);

  return (
    <Controller
      name='role'
      control={control}
      render={({ field, fieldState }) => {
        // An existing account keeps showing its role even if it isn't one
        // the current admin could pick (e.g. the SUPER_ADMIN account).
        const roles =
          field.value && !options.includes(field.value as never)
            ? [field.value, ...options]
            : options;

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor='role'>Role</FieldLabel>

            <Select
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(value);
                // Administrators have no section.
                if (value === "ADMIN" || value === "SUPER_ADMIN") {
                  setValue("section", null);
                  setValue("sectionDesignationRef", null);
                }
              }}
            >
              <SelectTrigger id='role'>
                <SelectValue placeholder='Select role'>
                  {field.value ? ROLE_LABELS[field.value] : "Select role"}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
};

export default Role;
