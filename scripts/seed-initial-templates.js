const { Client } = require('pg');

async function seedDraftCatalog() {
  const client = new Client({
    host: 'db.qtvzxezxyzsvgbauyytt.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Aakarsh@8851',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log('Seeding 12 initial draft design records (6 Sweatshirts, 6 Jackets)...');

  // Sweatshirt category id: c1111111-1111-1111-1111-111111111111
  // Jacket category id: c2222222-2222-2222-2222-222222222222

  const sweatshirts = [
    { num: '01', name: 'Premium Heavyweight Sweatshirt — Design 01', slug: 'sweatshirt-design-01', sku: 'WLC-SW-01' },
    { num: '02', name: 'Premium Heavyweight Sweatshirt — Design 02', slug: 'sweatshirt-design-02', sku: 'WLC-SW-02' },
    { num: '03', name: 'Premium Heavyweight Sweatshirt — Design 03', slug: 'sweatshirt-design-03', sku: 'WLC-SW-03' },
    { num: '04', name: 'Premium Heavyweight Sweatshirt — Design 04', slug: 'sweatshirt-design-04', sku: 'WLC-SW-04' },
    { num: '05', name: 'Premium Heavyweight Sweatshirt — Design 05', slug: 'sweatshirt-design-05', sku: 'WLC-SW-05' },
    { num: '06', name: 'Premium Heavyweight Sweatshirt — Design 06', slug: 'sweatshirt-design-06', sku: 'WLC-SW-06' },
  ];

  const jackets = [
    { num: '01', name: 'Architectural Technical Jacket — Design 01', slug: 'jacket-design-01', sku: 'WLC-JK-01' },
    { num: '02', name: 'Architectural Technical Jacket — Design 02', slug: 'jacket-design-02', sku: 'WLC-JK-02' },
    { num: '03', name: 'Architectural Technical Jacket — Design 03', slug: 'jacket-design-03', sku: 'WLC-JK-03' },
    { num: '04', name: 'Architectural Technical Jacket — Design 04', slug: 'jacket-design-04', sku: 'WLC-JK-04' },
    { num: '05', name: 'Architectural Technical Jacket — Design 05', slug: 'jacket-design-05', sku: 'WLC-JK-05' },
    { num: '06', name: 'Architectural Technical Jacket — Design 06', slug: 'jacket-design-06', sku: 'WLC-JK-06' },
  ];

  for (const item of sweatshirts) {
    const res = await client.query(`
      INSERT INTO public.products (
        name, slug, sku, category_id, status, base_price, sort_order, short_description
      ) VALUES (
        $1, $2, $3, 'c1111111-1111-1111-1111-111111111111', 'draft', 0, $4, 'Draft template awaiting official imagery, price, and stock configuration.'
      )
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [item.name, item.slug, item.sku, parseInt(item.num, 10)]);

    const prodId = res.rows[0].id;

    // Create variants M, L, XL
    for (const size of ['M', 'L', 'XL']) {
      await client.query(`
        INSERT INTO public.product_variants (product_id, size, sku, stock_quantity, price_adjustment)
        VALUES ($1, $2, $3, 0, 0)
        ON CONFLICT (product_id, size) DO NOTHING;
      `, [prodId, size, `${item.sku}-${size}`]);
    }
  }

  for (const item of jackets) {
    const res = await client.query(`
      INSERT INTO public.products (
        name, slug, sku, category_id, status, base_price, sort_order, short_description
      ) VALUES (
        $1, $2, $3, 'c2222222-2222-2222-2222-222222222222', 'draft', 0, $4, 'Draft template awaiting official imagery, price, and stock configuration.'
      )
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [item.name, item.slug, item.sku, parseInt(item.num, 10) + 10]);

    const prodId = res.rows[0].id;

    // Create variants L, XL, XXL
    for (const size of ['L', 'XL', 'XXL']) {
      await client.query(`
        INSERT INTO public.product_variants (product_id, size, sku, stock_quantity, price_adjustment)
        VALUES ($1, $2, $3, 0, 0)
        ON CONFLICT (product_id, size) DO NOTHING;
      `, [prodId, size, `${item.sku}-${size}`]);
    }
  }

  const countRes = await client.query('SELECT count(*) FROM public.products;');
  const variantRes = await client.query('SELECT count(*) FROM public.product_variants;');
  console.log(`✅ Draft catalog ready: ${countRes.rows[0].count} products, ${variantRes.rows[0].count} variants.`);

  await client.end();
}

seedDraftCatalog().catch(console.error);
