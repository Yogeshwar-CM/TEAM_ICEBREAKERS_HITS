// websocket.test.js
const { server } = require("../server");
const { io } = require("socket.io-client");
const supertest = require("supertest");
const ACTIONS = require("./Actions");

let request; // Supertest request
let clientSocket; // Client-side socket

beforeAll((done) => {
  request = supertest(server); // Initialize Supertest
  server.listen(4001, () => {
    clientSocket = io("http://localhost:4001"); // Connect to test server
    clientSocket.on("connect", done); // Wait for the client to connect
  });
});

afterAll(() => {
  clientSocket.close(); // Close client socket connection
  server.close(); // Close server
});

test("should compile code", (done) => {
  clientSocket.emit(ACTIONS.COMPILE_CODE, {
    code: 'print("Hello, World!")',
    language: "python",
  });

  clientSocket.on(ACTIONS.COMPILATION_RESULT, (result) => {
    expect(result.output).toBe("Hello, World!\n"); // Check for expected output
    done();
  });
});

test("should generate code", (done) => {
  clientSocket.emit(ACTIONS.GENERATE_CODE, {
    prompt: "Write a function in Python that adds two numbers.",
  });

  clientSocket.on(ACTIONS.CODE_GENERATION_RESULT, (result) => {
    expect(result.code).toContain("def add"); // Check if generated code is correct
    done();
  });
});
