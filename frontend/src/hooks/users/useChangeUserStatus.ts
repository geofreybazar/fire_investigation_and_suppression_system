import { useMutation, useQueryClient } from "@tanstack/react-query";
import userService from "@/service/user.service";
import { showToast } from "@/utils/resubaleToast";

const useChangeUserStatus = () => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: changeUserStatus,
    isPending,
    isError,
    error,
    isSuccess,
  } = useMutation({
    mutationFn: userService.changeUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user"],
      });
      showToast({
        title: "Change User Status",
        description: "Personnel's status was changed successfully.",
        type: "success",
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Something went wrong";

      showToast({
        title: "Error",
        description: message,
        type: "error",
        priority: "high",
      });
    },
  });
  return { changeUserStatus, isPending, isError, error, isSuccess };
};

export default useChangeUserStatus;
