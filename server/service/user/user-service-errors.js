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

module.exports = {
  DatabaseError,
  IllegalArguementError
}