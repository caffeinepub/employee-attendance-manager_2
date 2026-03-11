import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";


// with clause is mandatory because of new backgroundCheckMap in Main actor

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

  module BackgroundCheck {
    public type Check = {
      employeeId : Text;
      status : Text;
      notes : Text;
      updatedDate : Text;
    };
  };

  type UserData = User.UserData;
  type Role = User.Role;
  type Location = StoreLocation.Location;
  type Record = Attendance.Record;
  type Check = BackgroundCheck.Check;

  let usersMap = Map.empty<Text, UserData>();
  let attendanceMap = Map.empty<Text, List.List<Record>>();
  var storeLocation : ?Location = null;
  let backgroundCheckMap = Map.empty<Text, Check>();

  do {
    usersMap.add("admin", {
      username = "admin";
      password = "admin123";
      role = #admin;
      employeeId = null;
      dailySalary = null;
      name = ?("Admin");
    });

    usersMap.add("sukh", {
      username = "sukh";
      password = "1234";
      role = #employee;
      employeeId = ?("EMP001");
      dailySalary = ?800;
      name = ?("Sukh Ghuman");
    });

    attendanceMap.add("EMP001", List.empty<Record>());
  };

  func padId(n : Nat) : Text {
    if (n < 10) { "EMP00" # (n.toText()) } else if (n < 100) {
      "EMP0" # (n.toText());
    } else {
      "EMP" # (n.toText());
    };
  };

  // Login
  public query func login(username : Text, password : Text) : async UserData {
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

  // Add employee
  public shared func addEmployee(username : Text, password : Text, dailySalary : Nat, name : Text) : async () {
    if (usersMap.containsKey(username)) {
      Runtime.trap("User already exists");
    };

    let empCount = usersMap.toArray().filter(func(e) {
      switch (e.1.role) { case (#employee) { true }; case (#admin) { false } };
    }).size();

    let paddedId = padId(empCount + 1);

    let newEmployee : UserData = {
      username;
      password;
      role = #employee;
      employeeId = ?paddedId;
      dailySalary = ?dailySalary;
      name = ?name;
    };

    usersMap.add(username, newEmployee);
    attendanceMap.add(paddedId, List.empty<Record>());
  };

  public query func getAllEmployees() : async [UserData] {
    usersMap.toArray()
      .filter(func(e) {
        switch (e.1.role) { case (#employee) { true }; case (#admin) { false } };
      })
      .map(func(e) { e.1 });
  };

  public shared func setStoreLocation(latitude : Float, longitude : Float) : async () {
    storeLocation := ?{ latitude; longitude };
  };

  public query func getStoreLocation() : async ?Location {
    storeLocation;
  };

  public shared func addManualAttendance(
    employeeId : Text,
    employeeName : Text,
    date : Text,
    checkInTime : Text,
    checkOutTime : ?Text,
    hoursWorked : ?Int,
  ) : async () {
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
      case (?r) { r };
    };
    records.add(record);
    attendanceMap.add(employeeId, records);
  };

  public query func getAllAttendance() : async [(Text, [Record])] {
    attendanceMap.toArray().map(func((id, recs)) { (id, recs.toArray()) });
  };

  public shared func checkIn(
    employeeId : Text,
    employeeName : Text,
    date : Text,
    checkInTime : Text,
  ) : async () {
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
      case (?r) { r };
    };
    records.add(record);
    attendanceMap.add(employeeId, records);
  };

  public shared func checkOut(
    employeeId : Text,
    checkOutTime : Text,
    hoursWorked : Int,
  ) : async () {
    switch (attendanceMap.get(employeeId)) {
      case (null) { Runtime.trap("No attendance records found") };
      case (?records) {
        let arr = records.toArray();
        var found = false;
        var i = arr.size();
        label search while (i > 0) {
          i -= 1;
          let rec = arr[i];
          if (rec.checkOutTime == null and not rec.isManual) {
            let updated : Record = {
              rec with
              checkOutTime = ?checkOutTime;
              hoursWorked = ?hoursWorked;
            };
            records.put(i, updated);
            found := true;
            break search;
          };
        };
        if (not found) {
          Runtime.trap("No open check-in record found");
        };
      };
    };
  };

  // Background Check methods
  public shared ({ caller }) func setBackgroundCheck(
    employeeId : Text,
    status : Text,
    notes : Text,
    updatedDate : Text,
  ) : async () {
    let check : Check = { employeeId; status; notes; updatedDate };
    backgroundCheckMap.add(employeeId, check);
  };

  public query ({ caller }) func getAllBackgroundChecks() : async [Check] {
    backgroundCheckMap.toArray().map(func(e) { e.1 });
  };
};
