import {Request, Response , NextFunction} from 'express';
import jwt, {JwtPayload } from 'jsonwebtoken';
import prisma from '../utils/prisma';

//defining id as string in jwtpayload as there is no id type in JwtPayload type
interface CustomJwt extends JwtPayload { 
    id : string
}

export const verfiyJWT = async(req : Request , res : Response , next : NextFunction) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if(!token){
        res.status(401).json({
            message : "Incoming Token not found"
        })
        return; 
    }

    try{
        const decodedToken : JwtPayload =  jwt.verify(token , process.env.JWT_SECRET!) as CustomJwt ;

        const existingUser = await prisma.user.findUnique({
            where : {
                id : decodedToken?.id
            }
        });

        (req as any).user = existingUser;
        next();
    }catch(e){
        res.status(400).json({ error: "Invalid token" });
    }
}