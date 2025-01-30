import { Request , Response } from "express";
import prisma from "../utils/prisma";
import bcrypt from 'bcrypt'
import jwt, { decode } from 'jsonwebtoken';


export const handleSignUp = async(req : Request , res : Response) => {
    const { email , password , username , profile_pic} = req.body ; 

    const userExists = await prisma.user.findFirst({
      where: {
          OR: [
              { email: email },
              { username: username }
          ]
      }
  });
  

    if(userExists){
         res.status(400).json({
            message : "User with this email Id and username already exists"
        })
    }

    const hashedPassword = await bcrypt.hash(password , 10);

        try {
            const user = await prisma.user.create({
                data:{
                    email, 
                    password : hashedPassword ,
                    username, 
                    profile_pic : profile_pic || null 
                }
            });

           res.status(200).json({
                message : "User created successfully",
                user : user
            })
        } catch (error) {
            console.log("Something went wrong while registering the user" , error);
             res.status(500).json({
                message : "Somethign went wrong while registering the user"
            })
        }
    
}


export const loginHandler = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
  
      const userExists = await prisma.user.findUnique({
        where: { email }
      });
  
      if (!userExists) {
          res.status(401).json({
          message: "User with this email does not exist"
        });
        return ; 
      }
  
      const comparePassword = await bcrypt.compare(password, userExists.password);
  
      if (!comparePassword) {
        res.status(401).json({
          message: "Invalid Password or Email"
        });
        return ; 
      }
  
      const jwtToken = jwt.sign({ id: userExists.id }, process.env.JWT_SECRET!);
  
      const options = {
        httpOnly: true,
        secure: true
      };
  
      res.status(200)
        .cookie("jwtToken", jwtToken, options)
        .json({
          message: "User has been successfully Logged In",
          token: jwtToken
        });
    } catch (error) {
      console.log("this is the error" ,error);
      res.status(500).json({
        message: "Internal Server Error",
        error: error
      });
    }
  };

  //controller to protect routes at the frontend 
  export const checkAuth = async(req:Request , res : Response) => {
    const token = req.cookies.jwtToken ; 

    if(!token){
        res.status(401).json({
            message : "Unauthorized User"
        });
        return ;
    }

    try {
      const decodedToken = jwt.verify(token , process.env.JWT_SECRET!);
      res.status(200).json({
        message : "Authenticated" , 
        token : decodedToken
      })
    } catch (error) {
      console.log("Something went wrong" , error);
      res.status(400).json({
        message : "Unauthorized"
      })
    }


}


  export const getAllUsers = async(req:Request , res:Response) =>{
    
    try {
      const users = await prisma.user.findMany({
        select : {
          id : true , 
          username : true , 
          email : true 
        }
      }); 
  
      res.status(200).json({
        message : "Users Fetched Successfully",
        data : users
      })
    } catch (error) {
      console.log("Something went wrong while fetching the users list");
      res.status(500).json({
        message : "Something went wrong while fetching the data",
        error : error
      })
    }
  }


  export const health = async(req: Request , res : Response) => {
    const token = (req as any).user; 
    console.log("this is my fetched token" , token);
    res.send("this is the health check router");
  }