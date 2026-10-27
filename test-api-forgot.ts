import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lk.ivanbobkin@gmail.com" })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (error) {
    console.error("Error:", error);
  }
}
main();
