export async function sendOBDData(payload) {
  const res = await fetch("https://authentical-sandee-unsagely.ngrok-free.dev/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload })
  });

  if (!res.ok) {
    throw new Error("API error: " + res.status);
  }

  return res.json();
}
