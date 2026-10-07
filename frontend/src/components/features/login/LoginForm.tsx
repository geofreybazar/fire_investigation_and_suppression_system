import { useEffect } from "react";
import { useNavigate } from "react-router";
import useLogin from "@/hooks/auth/useLogin";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type LoginType, loginSchema } from "@/interface/login";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { useUserStore } from "@/store/userStore";

import { isAxiosError } from "axios";

const LoginForm = () => {
  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);

  const { login, isPending, isError, error, isSuccess, data } = useLogin();

  const { handleSubmit, control } = useForm<LoginType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      account_number: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginType) => {
    await login(data);
  };

  useEffect(() => {
    if (isSuccess && data) {
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      navigate("/");
    }
  }, [isSuccess, data, setUser, navigate]);

  return (
    <form
      className='flex flex-col gap-4 mt-2'
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup>
        <Controller
          name='account_number'
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Input
                {...field}
                id='form-rhf-demo-title'
                aria-invalid={fieldState.invalid}
                placeholder='A123456'
                autoComplete='off'
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='password'
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Input
                {...field}
                type='password'
                id='form-rhf-demo-title'
                aria-invalid={fieldState.invalid}
                placeholder='••••••••••••'
                autoComplete='off'
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button
        type='submit'
        disabled={isPending}
        className='w-full font-medium rounded-xl transition'
      >
        {isPending ? "Signing In..." : "Sign In"}
      </Button>

      {isError && (
        <p className='text-center text-red-600 text-sm font-medium'>
          {isAxiosError(error)
            ? error.response?.data?.message
            : "Login failed. Please try again."}
        </p>
      )}
    </form>
  );
};

export default LoginForm;
