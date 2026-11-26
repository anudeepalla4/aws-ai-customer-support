const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID || "demo-user-001";

export async function getUsageDashboard(period = "30d", signal) {
  const response = await fetch(
    `${API_BASE_URL}/analytics/usage?period=${encodeURIComponent(period)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-user-id": DEMO_USER_ID,
      },
      signal,
    },
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    throw new Error(
      body.message || `Dashboard request failed (${response.status})`,
    );
  }
  return body.data;
}
