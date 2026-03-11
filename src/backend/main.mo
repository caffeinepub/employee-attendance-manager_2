import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

actor {
  module User {
    public type Role = { #admin; #employee };

    public type UserData = {
      username : Text;
      password : Text;
      role : Role;
      employeeId : ?Text;
      dailySalary : ?Nat;
      name : ?Text;
    };
  };

  module StoreLocation {
    public type Location = {
      latitude : Float;
      longitude : Float;
    };
  };

  module Attendance {
    public type Record = {
      employeeId : Text;
      employeeName : Text;
      date : Text;
      checkInTime : Text;
      checkOutTime : ?Text;
      hoursWorked : ?Int;
      isManual : Bool;
    };
  };

  type UserData = User.UserData;
  type Role = User.Role;
  type Location = StoreLocation.Location;
  type Record = Attendance.Record;

  let usersMap = Map.empty<Text, UserData>();
  let attendanceMap = Map.empty<Text, List.List<Record>>();
  var storeLocation : ?Location = null;

  system func preupgrade() {
    if (usersMap.isEmpty()) {
      let admin : UserData = {
        username = "admin";
        password = "admin123";
        role = #admin;
        employeeId = null;
        dailySalary = null;
        name = ?("Admin");
      };
      usersMap.add("admin", admin);

      let employee : UserData = {
        username = "sukh";
        password = "1234";
        role = #employee;
        employeeId = ?("EMP001");
        dailySalary = ?800;
        name = ?("Sukh Ghuman");
      };
      usersMap.add("sukh", employee);

      let emptyList = List.empty<Record>();
      attendanceMap.add("EMP001", emptyList);
    };
  };

  // User functions
  public query ({ caller }) func login(username : Text, password : Text) : async UserData {
    switch (usersMap.get(username)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        if (user.password != password) {
          Runtime.trap("Wrong password");
        };
        user;
      };
    };
  };

  // Admin functions
  public shared ({ caller }) func addEmployee(username : Text, password : Text, dailySalary : Nat, name : Text) : async () {
    if (usersMap.containsKey(username)) {
      Runtime.trap("User already exists");
    };

    let newEmployee : UserData = {
      username;
      password;
      role = #employee;
      employeeId = ?("EMP" # usersMap.size().toText());
      dailySalary = ?dailySalary;
      name = ?name;
    };

    usersMap.add(username, newEmployee);
    attendanceMap.add("EMP" # (usersMap.size() - 1).toText(), List.empty<Record>());
  };

  public query ({ caller }) func getAllEmployees() : async [UserData] {
    let employees = usersMap.toArray();
    employees.filter(
      func(entry) {
        switch (entry.1.role) {
          case (#employee) { true };
          case (#admin) { false };
        };
      }
    ).map(func(entry) { entry.1 });
  };

  public shared ({ caller }) func setStoreLocation(latitude : Float, longitude : Float) : async () {
    storeLocation := ?{
      latitude;
      longitude;
    };
  };

  public query ({ caller }) func getStoreLocation() : async ?Location {
    storeLocation;
  };

  public shared ({ caller }) func addManualAttendance(employeeId : Text, employeeName : Text, date : Text, checkInTime : Text, checkOutTime : ?Text, hoursWorked : ?Int) : async () {
    let record : Record = {
      employeeId;
      employeeName;
      date;
      checkInTime;
      checkOutTime;
      hoursWorked;
      isManual = true;
    };

    let records = switch (attendanceMap.get(employeeId)) {
      case (null) { List.empty<Record>() };
      case (?existing) { existing };
    };
    records.add(record);
    attendanceMap.add(employeeId, records);
  };

  public query ({ caller }) func getAllAttendance() : async [(Text, [Record])] {
    attendanceMap.toArray().map(func((id, records)) { (id, records.toArray()) });
  };

  // Employee functions
  public shared ({ caller }) func checkIn(employeeId : Text, employeeName : Text, date : Text, checkInTime : Text) : async () {
    let record : Record = {
      employeeId;
      employeeName;
      date;
      checkInTime;
      checkOutTime = null;
      hoursWorked = null;
      isManual = false;
    };

    let records = switch (attendanceMap.get(employeeId)) {
      case (null) { List.empty<Record>() };
      case (?existing) { existing };
    };
    records.add(record);
    attendanceMap.add(employeeId, records);
  };

  public shared ({ caller }) func checkOut(employeeId : Text, checkOutTime : Text, hoursWorked : Int) : async () {
    switch (attendanceMap.get(employeeId)) {
      case (null) { Runtime.trap("No attendance records found") };
      case (?records) {
        if (records.isEmpty()) {
          Runtime.trap("No check-in records found");
        };

        let firstRecord = records.at(0);
        if (firstRecord.checkOutTime != null) {
          Runtime.trap("Already checked out");
        };

        let updatedRecord : Record = {
          firstRecord with
          checkOutTime = ?checkOutTime;
          hoursWorked = ?hoursWorked;
        };

        records.put(0, updatedRecord);
      };
    };
  };
};
