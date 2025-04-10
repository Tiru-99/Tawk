import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { postObjectUrl, getObjectUrl } from "../utils/s3upload";
import {v4 as uuid} from "uuid"; 


export const uploadProfilePic = async (req: Request, res: Response) => {
    try {
        //fetch the image name , and its type from frontend
        const { id } = req.params;
        const { fileType } = req.query;

        console.log("File Type : ", fileType);

        let url = await postObjectUrl('/profile_pic/',`profile_pic_${id}`, fileType as string);

        res.status(200).json({
            message: "Url fetched successfully",
            url: url
        })
    } catch (error) {
        res.status(400).json({
            message: "Something went wrong while fetching the url",
            error: error
        });
        return;
    }

}

export const getPresignedUrl = async(req : Request , res : Response) => {
    const fileType = req.query.fileType || "image/jpeg";

    const parsedFileType = JSON.stringify(fileType);

    const fileName = `${uuid()}.${parsedFileType.split("/")[1]}`;

   try {

     let url = await postObjectUrl('/chat_pics/',`${fileName}` , fileType as string);
 
     res.status(200).send({
         message : "Url fetched successfully",
         url : url , 
         key : "/chat_pics/"+fileName
     });
   } catch (error) {
     console.log("Something went wrong while getting presigned url" , error);
     res.status(500).send({
        message : "Something went wrong while getting presigned url",
        error : error 
     })
   }
}


export const getProfilePic = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const imageUrl = await getObjectUrl(`/profile_pic/profile_pic_${id}`);

        //update the image in the database with every get object call
        await prisma.user.update({
            where :{
                id : id 
            } ,
            data : {
                profile_pic : imageUrl
            }
        });

        // Sending image url 
        res.status(201).json({
            message: "Successfully fetched the imageUrl",
            url: imageUrl
        });

    } catch (error) {
        console.error("Error fetching image URL:", error);
        res.status(500).json({ error: "Failed to fetch profile picture" });
        return;
    }
};

