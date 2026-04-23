import { Request, Response, NextFunction } from 'express';
import { AnySchema } from 'yup';

interface ValidationSchema {
  body?: AnySchema;
  query?: AnySchema;
  params?: AnySchema;
}

export const validate = (schema: ValidationSchema) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.validate(req.body, { 
          abortEarly: false, 
          stripUnknown: true 
        });
      }
      if (schema.query) {
        req.query = await schema.query.validate(req.query, { 
          abortEarly: false, 
          stripUnknown: true 
        }) as any;
      }
      if (schema.params) {
        req.params = await schema.params.validate(req.params, { 
          abortEarly: false, 
          stripUnknown: true 
        }) as any;
      }
      next();
    } catch (err: any) {
      const errors = err.inner?.map((e: any) => ({
        path: e.path,
        message: e.message
      })) || [{ message: err.message }];

      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }
  };
