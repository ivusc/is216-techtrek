export class DatabaseError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "DatabaseError";
  }
};

export class IllegalArguementError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "IllegalArguementError";
  }
}
