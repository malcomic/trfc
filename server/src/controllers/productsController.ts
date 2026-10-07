import { Request, Response } from 'express';
import { query, getClient } from '../config/db.js';
import {
  ProductOptionsError,
  parseDistanceOptions,
  parseVariantsInput,
  saveProductVariants,
  syncProductStock,
  variantsJsonSql,
} from '../utils/productVariants.js';

const PRODUCT_WITH_CATEGORY_SQL = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug,
         ${variantsJsonSql()} AS variants
  FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
`;

const ADMIN_PRODUCT_SQL = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug,
         ${variantsJsonSql(true)} AS variants
  FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
`;

async function findCategoryName(categoryId: unknown): Promise<string | null> {
  if (typeof categoryId !== 'string' || !categoryId.trim()) return null;
  const result = await query('SELECT name FROM product_categories WHERE id = $1', [categoryId]);
  return result.rows[0]?.name ?? null;
}

async function fetchAdminProduct(id: string) {
  const result = await query(`${ADMIN_PRODUCT_SQL} WHERE p.id = $1`, [id]);
  return result.rows[0];
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const result = categorySlug
      ? await query(
          `${PRODUCT_WITH_CATEGORY_SQL}
           WHERE p.is_active = true AND c.slug = $1
           ORDER BY p.created_at DESC`,
          [categorySlug]
        )
      : await query(
          `${PRODUCT_WITH_CATEGORY_SQL}
           WHERE p.is_active = true
           ORDER BY p.created_at DESC`
        );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`${PRODUCT_WITH_CATEGORY_SQL} WHERE p.id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const getAdminProductList = async () => {
  const result = await query(`${ADMIN_PRODUCT_SQL} ORDER BY p.created_at DESC`);
  return result.rows;
};

export const createProduct = async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { name, description, price, stock, category_id, image_url } = req.body;
    const categoryName = await findCategoryName(category_id);
    if (!categoryName) {
      return res.status(400).json({ error: 'A valid category is required' });
    }
    const variants = parseVariantsInput(req.body.variants);
    const distanceOptions = parseDistanceOptions(req.body.distance_options);

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO products (name, description, price, stock, category, category_id, image_url, distance_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, description, price, stock ?? 0, categoryName, category_id, image_url, JSON.stringify(distanceOptions)]
    );
    const productId = result.rows[0].id;
    if (variants) {
      await saveProductVariants(client, productId, variants);
      await syncProductStock(client, productId);
    }
    await client.query('COMMIT');

    res.status(201).json(await fetchAdminProduct(productId));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof ProductOptionsError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    client.release();
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { name, description, price, stock, category_id, image_url, is_active } = req.body;
    const categoryName = await findCategoryName(category_id);
    if (!categoryName) {
      return res.status(400).json({ error: 'A valid category is required' });
    }
    const variants = parseVariantsInput(req.body.variants);
    const distanceOptions =
      req.body.distance_options === undefined ? null : parseDistanceOptions(req.body.distance_options);

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE products
       SET name = $1, description = $2, price = $3, stock = $4, category = $5,
           category_id = $6, image_url = $7, is_active = $8,
           distance_options = COALESCE($9::jsonb, distance_options)
       WHERE id = $10 RETURNING id`,
      [
        name,
        description,
        price,
        stock,
        categoryName,
        category_id,
        image_url,
        is_active,
        distanceOptions ? JSON.stringify(distanceOptions) : null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    if (variants) {
      await saveProductVariants(client, id, variants);
    }
    await syncProductStock(client, id);
    await client.query('COMMIT');

    res.json(await fetchAdminProduct(id));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof ProductOptionsError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update product' });
  } finally {
    client.release();
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};
