import fetch from "node-fetch";

async function main() {
  const res = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "testuser55@gmail.com", password: "password123", verified: false })
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
main();
