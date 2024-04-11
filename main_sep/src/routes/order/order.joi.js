import Joi from 'joi';

export const createOrderSchema = Joi.object({
  companyId: Joi.number().integer().required(),
  price: Joi.number().integer().required(),
  quantity: Joi.number().integer().required(),
});

export const updateOrderSchema = Joi.object({
  price: Joi.number().integer().required(),
  quantity: Joi.number().integer().required(),
});
