import "dotenv/config";
async function test() {
  const uid = Math.random().toString(36).substr(2, 9);
  const data = { name: "Company", city: "Moscow" };
  const res = await fetch(`http://localhost:3000/api/db/doc/companies/${uid}/settings/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, merge: false })
  });
  console.log(res.status, await res.text());
  
  const res2 = await fetch(`http://localhost:3000/api/db/doc/companies/${uid}/settings/categories`, {
    method: "GET"
  });
  console.log(res2.status, await res2.text());
}
test();
