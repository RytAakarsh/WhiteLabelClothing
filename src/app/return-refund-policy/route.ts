export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>410 Gone | White Label Clothing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #FFFFFF;
      color: #000000;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #737373;
      margin-bottom: 16px;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 24px;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 12px;
    }
    p {
      font-size: 13px;
      color: #525252;
      max-width: 440px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    a {
      display: inline-block;
      padding: 12px 28px;
      background: #000000;
      color: #FFFFFF;
      text-decoration: none;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      transition: opacity 0.2s;
    }
    a:hover {
      opacity: 0.85;
    }
  </style>
</head>
<body>
  <span class="badge">HTTP 410 · Resource Permanently Removed</span>
  <h1>Page Gone</h1>
  <p>The Return & Refund Policy page has been permanently removed from White Label Clothing. For any order assistance or inquiries, please contact our support team.</p>
  <a href="/">Return to Storefront</a>
</body>
</html>`;

  return new Response(html, {
    status: 410,
    statusText: 'Gone',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
