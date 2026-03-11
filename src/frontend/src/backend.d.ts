import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Location {
    latitude: number;
    longitude: number;
}
export interface Check {
    status: string;
    updatedDate: string;
    employeeId: string;
    notes: string;
}
export interface UserData {
    username: string;
    password: string;
    name?: string;
    role: Role;
    employeeId?: string;
    dailySalary?: bigint;
}
export interface Record_ {
    isManual: boolean;
    employeeName: string;
    date: string;
    hoursWorked?: bigint;
    checkInTime: string;
    employeeId: string;
    checkOutTime?: string;
}
export enum Role {
    admin = "admin",
    employee = "employee"
}
export interface backendInterface {
    addEmployee(username: string, password: string, dailySalary: bigint, name: string): Promise<void>;
    addManualAttendance(employeeId: string, employeeName: string, date: string, checkInTime: string, checkOutTime: string | null, hoursWorked: bigint | null): Promise<void>;
    checkIn(employeeId: string, employeeName: string, date: string, checkInTime: string): Promise<void>;
    checkOut(employeeId: string, checkOutTime: string, hoursWorked: bigint): Promise<void>;
    getAllAttendance(): Promise<Array<[string, Array<Record_>]>>;
    getAllBackgroundChecks(): Promise<Array<Check>>;
    getAllEmployees(): Promise<Array<UserData>>;
    getStoreLocation(): Promise<Location | null>;
    login(username: string, password: string): Promise<UserData>;
    setBackgroundCheck(employeeId: string, status: string, notes: string, updatedDate: string): Promise<void>;
    setStoreLocation(latitude: number, longitude: number): Promise<void>;
}
