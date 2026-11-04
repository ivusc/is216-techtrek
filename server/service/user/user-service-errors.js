class DatabaseError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "DatabaseError";
  }
};

class IllegalArguementError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "IllegalArguementError";
  }
}

class WrongPasswordError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "WrongPasswordError";
  }
}

module.exports = {
  DatabaseError,
  IllegalArguementError,
  WrongPasswordError
}