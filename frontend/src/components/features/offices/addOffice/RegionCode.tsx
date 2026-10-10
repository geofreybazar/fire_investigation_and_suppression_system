import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

const RegionCode = () => {
  const { control } = useFormContext();

  const officeType = useWatch({
    control,
    name: "type",
  });
  return (
    <>
      {officeType === "REGIONAL_OFFICE" && (
        <Controller
          control={control}
          name='regionCode'
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Region Code</FieldLabel>

              <Input
                placeholder='e.g. NCR, RI, RII'
                autoComplete='off'
                {...field}
                value={field.value ?? ""}
                onChange={(event) =>
                  field.onChange(event.target.value.toUpperCase())
                }
              />
            </Field>
          )}
        />
      )}
    </>
  );
};

export default RegionCode;
