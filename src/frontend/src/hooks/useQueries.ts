import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Check, Location, Record_, UserData } from "../backend.d";
import { useActor } from "./useActor";

export function useLogin() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }): Promise<UserData> => {
      if (!actor) throw new Error("Not connected");
      return actor.login(username, password);
    },
  });
}

export function useGetAllAttendance() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, Array<Record_>]>>({
    queryKey: ["attendance"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAttendance();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllEmployees() {
  const { actor, isFetching } = useActor();
  return useQuery<UserData[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployees();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetStoreLocation() {
  const { actor, isFetching } = useActor();
  return useQuery<Location | null>({
    queryKey: ["storeLocation"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getStoreLocation();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetStoreLocation() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      latitude,
      longitude,
    }: {
      latitude: number;
      longitude: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setStoreLocation(latitude, longitude);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storeLocation"] }),
  });
}

export function useAddEmployee() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      username,
      password,
      dailySalary,
      name,
    }: {
      username: string;
      password: string;
      dailySalary: bigint;
      name: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addEmployee(username, password, dailySalary, name);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      username: string;
      name: string;
      employeeId: string;
      dailySalary: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).updateEmployee(
        args.username,
        args.name,
        args.employeeId,
        args.dailySalary,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeleteEmployee() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).deleteEmployee(username);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useAddManualAttendance() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      employeeId: string;
      employeeName: string;
      date: string;
      checkInTime: string;
      checkOutTime: string | null;
      hoursWorked: bigint | null;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addManualAttendance(
        args.employeeId,
        args.employeeName,
        args.date,
        args.checkInTime,
        args.checkOutTime,
        args.hoursWorked,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useCheckIn() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      employeeId: string;
      employeeName: string;
      date: string;
      checkInTime: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.checkIn(
        args.employeeId,
        args.employeeName,
        args.date,
        args.checkInTime,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useCheckOut() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      employeeId: string;
      checkOutTime: string;
      hoursWorked: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.checkOut(
        args.employeeId,
        args.checkOutTime,
        args.hoursWorked,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useGetAllBackgroundChecks() {
  const { actor, isFetching } = useActor();
  return useQuery<Check[]>({
    queryKey: ["backgroundChecks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBackgroundChecks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetBackgroundCheck() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      employeeId: string;
      status: string;
      notes: string;
      updatedDate: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setBackgroundCheck(
        args.employeeId,
        args.status,
        args.notes,
        args.updatedDate,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backgroundChecks"] }),
  });
}
