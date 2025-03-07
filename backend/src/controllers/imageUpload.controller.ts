import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { postObjectUrl, getObjectUrl } from "../utils/s3upload";

export const uploadProfilePic = async (req: Request, res: Response) => {
    try {
        //fetch the image name , and its type from frontend
        const { id } = req.params;
        const { fileType } = req.query;

        console.log("File Type : ", fileType);

        let url = await postObjectUrl(`profile_pic_${id}`, fileType as string);

        //updating the profile pic 

        await prisma.user.update({
            where: {
                id: id
            },
            data: {
                profile_pic: `profile_pic_${id}`
            }
        })

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

export const updateProfilePic = async (req: Request, res: Response) => {
    try {
        const { profile_pic } = req.body;
        const { id } = req.body;
        await prisma.user.update({
            where: {
                id: id
            },
            data: {
                profile_pic: profile_pic
            }
        });

        res.status(200).json({
            message: "Profile Pic updated successfully",
            image: profile_pic
        });
    } catch (error) {
        console.log("Something went wrong while updating the profile pic", error);
        res.status(500).json({
            message: "Something went wrong while updating the profile pic",
            error: error
        });
        return;
    }
}

export const getProfilePic = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const imageUrl = await getObjectUrl(`/profile_pic/profile_pic_${id}`);

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

