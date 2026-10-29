const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const lines = env.split('\n');
const config = {};
lines.forEach(l => {
  const parts = l.split('=');
  if (parts.length >= 2) config[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const SWEATSHIRT_CAT_ID = 'c1111111-1111-1111-1111-111111111111';
const JACKET_CAT_ID = 'c2222222-2222-2222-2222-222222222222';

const products = [
  // 6 Sweatshirts
  {
    name: 'Monochrome Signature Sweatshirt',
    slug: 'monochrome-signature-sweatshirt',
    sku: 'WLC-SWT-001',
    category_id: SWEATSHIRT_CAT_ID,
    base_price: 299900,
    compare_at_price: 399900,
    short_description: 'Architectural heavyweight fleece sweatshirt with signature monochrome tailoring.',
    description: 'Constructed from bespoke 460 GSM combed cotton fleece. Features dropped shoulders, ribbed mock-collar trim, and reinforced double-needle construction. Tailored for a structural silhouette with elevated drape.',
    is_featured: true,
    is_new_arrival: true,
    is_best_seller: true,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 1,
    sizes: ['M', 'L', 'XL'],
    image: '/images/hero-sweatshirt-sale.png',
  },
  {
    name: 'Essential Black Sweatshirt',
    slug: 'essential-black-sweatshirt',
    sku: 'WLC-SWT-002',
    category_id: SWEATSHIRT_CAT_ID,
    base_price: 249900,
    compare_at_price: 349900,
    short_description: 'Deep carbon black crewneck engineered in dense loopback French terry.',
    description: 'The daily uniform cornerstone. Crafted with deep reactive-dyed yarn to prevent color degradation. Seamless ribbed cuffs, relaxed chest box cut, and brushed interior softness.',
    is_featured: true,
    is_new_arrival: true,
    is_best_seller: false,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 2,
    sizes: ['M', 'L', 'XL'],
    image: '/images/hero-sweatshirt-sale.png',
  },
  {
    name: 'Essential Ivory Sweatshirt',
    slug: 'essential-ivory-sweatshirt',
    sku: 'WLC-SWT-003',
    category_id: SWEATSHIRT_CAT_ID,
    base_price: 249900,
    compare_at_price: 349900,
    short_description: 'Unbleached natural ecru sweatshirt with subtle tonal stitching.',
    description: 'An expression of restrained minimalism. Unbleached organic cotton blend exhibiting subtle natural texture. Soft tactile hand feel with ribbed hem line designed to sit cleanly above trousers.',
    is_featured: true,
    is_new_arrival: false,
    is_best_seller: true,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 3,
    sizes: ['M', 'L', 'XL'],
    image: '/images/hero-sweatshirt-sale.png',
  },
  {
    name: 'Architectural Grey Sweatshirt',
    slug: 'architectural-grey-sweatshirt',
    sku: 'WLC-SWT-004',
    category_id: SWEATSHIRT_CAT_ID,
    base_price: 279900,
    compare_at_price: 369900,
    short_description: 'Heathered concrete grey pullover with engineered geometric seam lines.',
    description: 'Industrial design meets luxury loungewear. Multi-panel sleeve construction allowing full ergonomic mobility without cuff bunching. 420 GSM cross-knit fleece.',
    is_featured: false,
    is_new_arrival: true,
    is_best_seller: false,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 4,
    sizes: ['M', 'L', 'XL'],
    image: '/images/hero-sweatshirt-sale.png',
  },
  {
    name: 'Minimal Contrast Sweatshirt',
    slug: 'minimal-contrast-sweatshirt',
    sku: 'WLC-SWT-005',
    category_id: SWEATSHIRT_CAT_ID,
    base_price: 289900,
    compare_at_price: 379900,
    short_description: 'Two-tone monochromatic split design with matte tactile surface.',
    description: 'Sharp high-contrast architectural colorblocking. Subtle matte finish on premium compact cotton knit. Designed for modular winter layering under tailored coats.',
    is_featured: false,
    is_new_arrival: false,
    is_best_seller: false,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 5,
    sizes: ['M', 'L', 'XL'],
    image: '/images/hero-sweatshirt-sale.png',
  },
  {
    name: 'Winter Edition Heavyweight Sweatshirt',
    slug: 'winter-edition-heavyweight-sweatshirt',
    sku: 'WLC-SWT-006',
    category_id: SWEATSHIRT_CAT_ID,
    base_price: 329900,
    compare_at_price: 429900,
    short_description: '500 GSM thermo-insulating oversized fleece sweatshirt.',
    description: 'Our most substantial knitwear piece. 500 GSM thermal French terry designed to withstand sub-zero wind chills. Generous boxy profile with drop-shoulder silhouette and heavy gauge ribbing.',
    is_featured: false,
    is_new_arrival: true,
    is_best_seller: true,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 6,
    sizes: ['M', 'L', 'XL'],
    image: '/images/hero-sweatshirt-sale.png',
  },

  // 6 Jackets
  {
    name: 'Signature Winter Trench Jacket',
    slug: 'signature-winter-trench-jacket',
    sku: 'WLC-JKT-001',
    category_id: JACKET_CAT_ID,
    base_price: 599900,
    compare_at_price: 799900,
    short_description: 'Tailored weatherproof trench jacket with storm flap and storm collar.',
    description: 'A timeless silhouette elevated with modern technical performance. Water-repellent matte twill outer shell, storm-guard collar, concealed placket, and brushed satin lining.',
    is_featured: true,
    is_new_arrival: true,
    is_best_seller: true,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 7,
    sizes: ['L', 'XL', 'XXL'],
    image: '/images/hero-jacket-sale.png',
  },
  {
    name: 'Monochrome Utility Jacket',
    slug: 'monochrome-utility-jacket',
    sku: 'WLC-JKT-002',
    category_id: JACKET_CAT_ID,
    base_price: 499900,
    compare_at_price: 649900,
    short_description: 'Multi-pocket tactical jacket in matte technical ripstop.',
    description: 'Functional streetwear precision. Quad cargo pockets with concealed magnetic closures, heavy two-way matte zipper, and adjustable velcro storm cuffs.',
    is_featured: true,
    is_new_arrival: false,
    is_best_seller: false,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 8,
    sizes: ['L', 'XL', 'XXL'],
    image: '/images/hero-jacket-sale.png',
  },
  {
    name: 'Essential Black Bomber Jacket',
    slug: 'essential-black-bomber-jacket',
    sku: 'WLC-JKT-003',
    category_id: JACKET_CAT_ID,
    base_price: 449900,
    compare_at_price: 599900,
    short_description: 'Modern flight bomber jacket with satin nylon finish and lightweight padding.',
    description: 'Reimagined flight silhouette featuring weather-resistant dense twill nylon shell, 100g thermo-quilted lining, ribbed baseball collar, and clean sleeve utility pocket.',
    is_featured: true,
    is_new_arrival: true,
    is_best_seller: false,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 9,
    sizes: ['L', 'XL', 'XXL'],
    image: '/images/hero-jacket-sale.png',
  },
  {
    name: 'Ivory Contrast Puffer Jacket',
    slug: 'ivory-contrast-puffer-jacket',
    sku: 'WLC-JKT-004',
    category_id: JACKET_CAT_ID,
    base_price: 549900,
    compare_at_price: 729900,
    short_description: 'Architectural baffled puffer jacket in contrasting ivory and carbon black.',
    description: 'High-loft synthetic down insulation housed in matte technical micro-ripstop. High funnel neck collar, elasticated drawcord hem, and contrast black interior lining.',
    is_featured: false,
    is_new_arrival: true,
    is_best_seller: true,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 10,
    sizes: ['L', 'XL', 'XXL'],
    image: '/images/hero-jacket-sale.png',
  },
  {
    name: 'Architectural Minimalist Coat',
    slug: 'architectural-minimalist-coat',
    sku: 'WLC-JKT-005',
    category_id: JACKET_CAT_ID,
    base_price: 649900,
    compare_at_price: 849900,
    short_description: 'Clean-line single-breasted overcoat with hidden placket.',
    description: 'A masterclass in modern tailoring. Heavyweight structured melton wool blend, notched lapels, horn-effect buttons concealed beneath a clean front fly, and interior welt pockets.',
    is_featured: false,
    is_new_arrival: false,
    is_best_seller: false,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 11,
    sizes: ['L', 'XL', 'XXL'],
    image: '/images/hero-jacket-sale.png',
  },
  {
    name: 'Winter Edition Wool Jacket',
    slug: 'winter-edition-wool-jacket',
    sku: 'WLC-JKT-006',
    category_id: JACKET_CAT_ID,
    base_price: 699900,
    compare_at_price: 899900,
    short_description: 'Substantial virgin wool blend jacket with sherpa fleece lining.',
    description: 'Engineered for harsh winter climates. 650 GSM virgin wool weave bonded with plush tonal shearling lining. Custom embossed hardware, deep side-entry welt pockets, and reinforced collar strap.',
    is_featured: false,
    is_new_arrival: true,
    is_best_seller: true,
    is_offer_eligible: true,
    is_demo: true,
    status: 'published',
    sort_order: 12,
    sizes: ['L', 'XL', 'XXL'],
    image: '/images/hero-jacket-sale.png',
  },
];

async function seed() {
  const client = new Client({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to PostgreSQL Supabase database.');

  try {
    // Clean old demo data or clean products
    await client.query('DELETE FROM product_images WHERE product_id IN (SELECT id FROM products);');
    await client.query('DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products);');
    await client.query('DELETE FROM products;');

    console.log('Cleared previous product tables.');

    for (const p of products) {
      const prodRes = await client.query(
        `INSERT INTO products (
          name, slug, sku, category_id, base_price, compare_at_price,
          short_description, description, is_featured, is_new_arrival,
          is_best_seller, is_offer_eligible, is_demo, status, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id`,
        [
          p.name,
          p.slug,
          p.sku,
          p.category_id,
          p.base_price,
          p.compare_at_price,
          p.short_description,
          p.description,
          p.is_featured,
          p.is_new_arrival,
          p.is_best_seller,
          p.is_offer_eligible,
          p.is_demo,
          p.status,
          p.sort_order,
        ]
      );

      const productId = prodRes.rows[0].id;
      console.log(`Inserted product [${p.slug}] with ID: ${productId}`);

      // Insert primary image
      await client.query(
        `INSERT INTO product_images (product_id, storage_path, alt_text, sort_order, is_primary)
         VALUES ($1, $2, $3, $4, $5)`,
        [productId, p.image, p.name, 1, true]
      );

      // Insert variants with stock 15 each
      for (const size of p.sizes) {
        const variantSku = `${p.sku}-${size}`;
        await client.query(
          `INSERT INTO product_variants (product_id, size, sku, stock_quantity, price_adjustment, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [productId, size, variantSku, 15, 0, true]
        );
      }
    }

    console.log('Successfully seeded all 12 demo products with variants and images!');
  } finally {
    await client.end();
  }
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
