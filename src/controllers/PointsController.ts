import { Request, Response } from 'express';
import knex from '../database/connection';

class PointsController {
    async index(request: Request, response: Response) {
        const { city, uf, items } = request.query;

        const parsedItems = String(items)
            .split(',')
            .map(item => Number(item.trim()));

        const points = await knex('points')
        .join('point_items', 'points.id', '=', 'point_items.point_id')
        .whereIn('point_items.item_id', parsedItems)
        .where('city', String(city))
        .where('uf', String(uf))
        .distinct()
        .select('points.*');

        const serializePoints = points.map(point => {
            return {
                ...point,
                image_url: `http://192.168.0.106:3333/uploads/point/${point.image}`,
            };
        });

        return response.json(serializePoints);
    }

    async show(request: Request, response: Response) {
        const { id } = request.params;

        const point = await knex("points").where('id', id).first();

        if(!point){
            return response.status(400).json({ message: 'Point not found.'});
        }
        
        const serializePoint = {
            ...point,
            image_url: `http://192.168.0.106:3333/uploads/point/${point.image}`,
        };

        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title');

        return response.json({ point: serializePoint, items });
    }

    async create(request: Request, response: Response) {
        try {

            const { 
                name,
                email,
                whatsapp,
                latitude,
                longitude,
                city,
                uf,
                items
            } = request.body;
    
            if(!request.file){
                response.status(400);
                const errorRes = {
                    statusCode: 400,
                    message: String(`"imgem" is not allowed to be empty`),
                    error: "Bad Request",
                    validation: {
                        source: "body",
                        keys: [
                            "image"
                        ]
                    }
                }
                return response.json(errorRes);
            }
            
            const point = { 
                image: request.file.filename,
                name,
                email,
                whatsapp,
                latitude,
                longitude,
                city,
                uf
            }

            const trx = await knex.transaction();
            
            const insertedIds = await trx('points').insert(point);
        
            const point_id = insertedIds[0];
        
            const pointItems = items
                .split(',')
                .map((item: string) => Number(item.trim()))
                .map((item_id: number) => {
                    return {
                        item_id,
                        point_id,
                    }
                });
        
            await trx('point_items').insert(pointItems);
        
            await trx.commit();
            
            return response.json({ id:point_id, ... point});

        } catch (error) {
            response.status(400);
            const errorRes = {
                statusCode: 400,
                message: "Falha ao cadastrar o Ponto de Coleta.",
                message_error: String(error),
                error: "Bad Request"
            }
            return response.json(errorRes);
        }
    }
}

export default PointsController;