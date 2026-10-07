import { useState } from "react";
import { Navigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller } from "react-hook-form";
import { useUserStore } from "@/store/userStore";
import { Spinner } from "@/components/ui/spinner";

import DialogComponent from "@/components/common/DialogComponent";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/interface/users/users";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useChangePassword from "@/hooks/users/useChangePassword";

const ChangePassword = () => {
  const user = useUserStore((u) => u.user);
  const { changePassword, isPending } = useChangePassword();

  if (!user) {
    return <Navigate to='/login' replace />;
  }

  const [open, setOpen] = useState(false);
  const modalOnChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const methods = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      userId: user.id,
      currentPassword: "",
      newPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    await changePassword(data);

    methods.reset({
      currentPassword: "",
      newPassword: "",
    });

    setOpen(false);
  };

  return (
    <DialogComponent
      open={open}
      buttonLabel={"Change Password"}
      dialogTitle={"Change Password"}
      dialogDescription={
        "Update your account password to keep your account secure."
      }
      modalOnChange={modalOnChange}
    >
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className='flex flex-col gap-5'
      >
        <FieldGroup>
          <Controller
            name='currentPassword'
            control={methods.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Current Password</FieldLabel>
                <Input
                  {...field}
                  id='form-rhf-demo-titlse'
                  aria-invalid={fieldState.invalid}
                  placeholder='••••••••••••'
                  autoComplete='off'
                  type='password'
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <FieldGroup>
          <Controller
            name='newPassword'
            control={methods.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>New Password</FieldLabel>
                <Input
                  {...field}
                  id='form-rhf-demo-title'
                  aria-invalid={fieldState.invalid}
                  placeholder='••••••••••••'
                  autoComplete='off'
                  type='password'
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
        <Button type='submit' disabled={isPending}>
          <Button type='submit' disabled={isPending}>
            {isPending ? (
              <>
                <Spinner />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </Button>
      </form>
    </DialogComponent>
  );
};

export default ChangePassword;
