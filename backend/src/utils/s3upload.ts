import { S3Client , PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from 'dotenv';

dotenv.config({
    path : './.env'
});

//importing the env variables as string because typescript imports env variables as string | undefined
const s3 = new S3Client({
    region : "ap-south-1",
    credentials : {
        accessKeyId : process.env.AWS_ACCESS_KEY as string, 
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
    }
});

//using the presignedUrl approach 
export async function postObjectUrl(dirname : string , filename : string , contentType : string ){
    //sending an api request to aws 
    const params = { 
        Bucket: "tiru-chatapp",
        Key : dirname + filename , 
        ContentType : contentType
    }

    //link expires after 2 mins 
    const expiresIn = 120 

    const url = await getSignedUrl(s3 , new PutObjectCommand(params ) , { expiresIn });
    return url ;
}

export const getObjectUrl = async( key : string) => {
    const params = {
        Bucket : 'tiru-chatapp',
        Key : key 
    }

    const url = await getSignedUrl(s3 , new GetObjectCommand(params))
    return url ;
}


