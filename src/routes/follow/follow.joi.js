import Joi from 'joi';

export const companyIdSchema = Joi.object({
    cardId: Joi.number().integer().required(),
  });