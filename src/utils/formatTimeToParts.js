export function formatTimeToParts(iso) {
  const d = new Date(iso);

  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const datePart = `${day} ${month}`;

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const timePart = `${hours}:${minutes}`;

  const seconds = String(d.getSeconds()).padStart(2, "0");
  const millis = String(d.getMilliseconds()).padStart(3, "0");
  const preciseTimePart = `${seconds}:${millis}`;

  return [datePart, timePart, preciseTimePart];
}
