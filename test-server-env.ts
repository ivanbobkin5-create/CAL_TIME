async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/health");
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (error) {
    console.error("Error:", error);
  }
}
main();
