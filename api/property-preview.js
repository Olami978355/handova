const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const absoluteHttpUrl = (value, fallback) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
};

const formatPrice = (value) =>
  `₦${Number(value).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  const id = String(req.query.id || "");

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(404).send("<!doctype html><html><head><title>Property unavailable | Handova</title></head><body>Property unavailable.</body></html>");
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("Property preview is missing Supabase environment configuration.");
    return res.status(503).send("<!doctype html><html><head><title>Handova</title></head><body>Preview temporarily unavailable.</body></html>");
  }

  try {
    const query = new URLSearchParams({
      select: "id,title,price,price_period,transaction_type,state,lga,images,escrow_verified",
      id: `eq.${id}`,
      status: "eq.active",
      deleted_at: "is.null",
      is_delisted: "eq.false",
      limit: "1",
    });

    const response = await fetch(
      `${supabaseUrl}/rest/v1/properties?${query.toString()}`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Property preview query failed:", response.status);
      return res.status(502).send("<!doctype html><html><head><title>Handova</title></head><body>Preview temporarily unavailable.</body></html>");
    }

    const rows = await response.json();
    const property = rows[0];

    if (!property) {
      return res.status(404).send("<!doctype html><html><head><title>Property unavailable | Handova</title></head><body>This property is no longer available.</body></html>");
    }

    const origin = "https://handova.ng";
    const propertyUrl = `${origin}/property/${encodeURIComponent(id)}`;

    const title = `${property.title} | Handova`;
    const location = [property.lga, property.state].filter(Boolean).join(", ");
    const transaction = property.transaction_type === "rent" ? "For Rent" : "For Sale";
    const period = property.price_period && property.price_period !== "outright"
      ? `/${property.price_period}`
      : "";
    const price = `${formatPrice(property.price)}${period}`;

    const description = [
      price,
      transaction,
      location,
      property.escrow_verified ? "Escrow verified" : "",
      "View property details and arrange an inspection on Handova.",
    ].filter(Boolean).join(" · ");

    const fallbackImage = `${origin}/icon.svg`;
    const image = absoluteHttpUrl(property.images?.[0], fallbackImage);

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="theme-color" content="#0B0D10">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Handova">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(propertyUrl)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="${escapeHtml(property.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="canonical" href="${escapeHtml(propertyUrl)}">
</head>
<body style="margin:0;background:#0B0D10;color:#fff;font-family:Arial,sans-serif">
<main style="max-width:720px;margin:48px auto;padding:24px">
<img src="${escapeHtml(image)}" alt="" style="width:100%;max-height:420px;object-fit:cover;border-radius:12px">
<p style="color:#D4AF37;font-weight:bold">HANDOVA</p>
<h1>${escapeHtml(property.title)}</h1>
<p>${escapeHtml(location)}</p>
<p>${escapeHtml(price)} · ${escapeHtml(transaction)}</p>
<a href="${escapeHtml(propertyUrl)}" style="color:#D4AF37">View property on Handova</a>
</main>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (error) {
    console.error("Property preview error:", error);
    return res.status(500).send("<!doctype html><html><head><title>Handova</title></head><body>Preview temporarily unavailable.</body></html>");
  }
}
