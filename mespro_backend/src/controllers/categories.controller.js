const { ProductCategory } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const { applyBusinessScope } = require('../middleware/businessScope');

/**
 * GET /products/categories
 * Return categories as a tree: [{ id, slug, name, subcategories: [{ id, slug, name }] }]
 */
exports.getAll = async (req, res, next) => {
  try {
    const where = { parent_id: null, ...applyBusinessScope(req) };
    const categories = await ProductCategory.findAll({
      where,
      include: [{ model: ProductCategory, as: 'subcategories', attributes: ['id', 'slug', 'name'] }],
      order: [['name', 'ASC'], [{ model: ProductCategory, as: 'subcategories' }, 'name', 'ASC']],
      attributes: ['id', 'slug', 'name'],
    });
    return ApiResponse.success(res, categories);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /products/categories
 * Body: { name, parent_id? }
 */
exports.create = async (req, res, next) => {
  try {
    const { name, parent_id } = req.body;
    if (!name || !name.trim()) {
      return ApiResponse.badRequest(res, 'Category name is required');
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
    const business_id = req.currentBusiness;

    // Check for duplicates under the same parent + business
    const existing = await ProductCategory.findOne({
      where: { slug, parent_id: parent_id || null, business_id },
    });
    if (existing) {
      return ApiResponse.badRequest(res, 'Category already exists');
    }

    // If parent_id provided, verify it belongs to same business and is a root category
    if (parent_id) {
      const parentCat = await ProductCategory.findOne({
        where: { id: parent_id, business_id },
      });
      if (!parentCat) {
        return ApiResponse.notFound(res, 'Parent category not found');
      }
    }

    const category = await ProductCategory.create({
      name: name.trim(),
      slug,
      parent_id: parent_id || null,
      business_id,
    });

    return ApiResponse.created(res, category, 'Category created');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /products/categories/bulk-subcategories
 * Body: { parent_id, names: ["sub1", "sub2"] }
 */
exports.bulkCreateSubcategories = async (req, res, next) => {
  try {
    const { parent_id, names } = req.body;
    if (!parent_id || !Array.isArray(names) || !names.length) {
      return ApiResponse.badRequest(res, 'parent_id and names[] are required');
    }

    const business_id = req.currentBusiness;
    const parentCat = await ProductCategory.findOne({ where: { id: parent_id, business_id } });
    if (!parentCat) {
      return ApiResponse.notFound(res, 'Parent category not found');
    }

    const created = [];
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const [cat, wasCreated] = await ProductCategory.findOrCreate({
        where: { slug, parent_id, business_id },
        defaults: { name, slug, parent_id, business_id },
      });
      if (wasCreated) created.push(cat);
    }

    return ApiResponse.created(res, created, `${created.length} subcategories created`);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /products/categories/:id
 * Body: { name }
 */
exports.update = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return ApiResponse.badRequest(res, 'Category name is required');
    }

    const category = await ProductCategory.findOne({
      where: { id: req.params.id, ...applyBusinessScope(req) },
    });
    if (!category) {
      return ApiResponse.notFound(res, 'Category not found');
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');

    // Check duplicate name under same parent
    const existing = await ProductCategory.findOne({
      where: {
        slug,
        parent_id: category.parent_id,
        business_id: category.business_id,
        id: { [require('sequelize').Op.ne]: category.id },
      },
    });
    if (existing) {
      return ApiResponse.badRequest(res, 'A category with this name already exists');
    }

    await category.update({ name: name.trim(), slug });

    return ApiResponse.success(res, category, 'Category updated');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /products/categories/:id
 * Deletes a category and all its subcategories (CASCADE)
 */
exports.remove = async (req, res, next) => {
  try {
    const category = await ProductCategory.findOne({
      where: { id: req.params.id, ...applyBusinessScope(req) },
    });
    if (!category) {
      return ApiResponse.notFound(res, 'Category not found');
    }

    await category.destroy();
    return ApiResponse.success(res, null, 'Category deleted');
  } catch (error) {
    next(error);
  }
};
