const { Product, ProductMaterial } = require('../models');
const createCrudController = require('./base.controller');
const ApiResponse = require('../utils/ApiResponse');
const { sequelize } = require('../models');
const { applyBusinessScope } = require('../middleware/businessScope');

const baseController = createCrudController(Product, {
  resourceName: 'Product',
  include: [{ model: ProductMaterial, as: 'materials' }],
  searchFields: ['name', 'sku', 'category', 'subcategory'],
  defaultOrder: [['created_at', 'DESC']],
});

module.exports = {
  ...baseController,

  // Override create to handle materials
  create: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const { materials, ...productData } = req.body;

      productData.business_id = req.currentBusiness;
      const product = await Product.create(productData, { transaction: t });

      if (materials && materials.length > 0) {
        await ProductMaterial.bulkCreate(
          materials.map((m) => ({
            product_id: product.id,
            material_name: typeof m === 'string' ? m : m.material_name,
            business_id: req.currentBusiness,
          })),
          { transaction: t }
        );
      }

      await t.commit();

      const created = await Product.findByPk(product.id, {
        include: [{ model: ProductMaterial, as: 'materials' }],
      });

      return ApiResponse.created(res, created, 'Product created successfully');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },

  // Override update to handle materials
  update: async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
      const product = await Product.findOne({ where: { id: req.params.id, ...applyBusinessScope(req) } });
      if (!product) {
        await t.rollback();
        return ApiResponse.notFound(res, 'Product not found');
      }

      const { materials, ...productData } = req.body;
      await product.update(productData, { transaction: t });

      if (materials) {
        await ProductMaterial.destroy({
          where: { product_id: product.id },
          transaction: t,
        });
        if (materials.length > 0) {
          await ProductMaterial.bulkCreate(
            materials.map((m) => ({
              product_id: product.id,
              material_name: typeof m === 'string' ? m : m.material_name,
              business_id: req.currentBusiness,
            })),
            { transaction: t }
          );
        }
      }

      await t.commit();

      const updated = await Product.findByPk(product.id, {
        include: [{ model: ProductMaterial, as: 'materials' }],
      });

      return ApiResponse.success(res, updated, 'Product updated');
    } catch (error) {
      await t.rollback();
      next(error);
    }
  },
};
