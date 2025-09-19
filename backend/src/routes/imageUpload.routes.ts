import { Router } from "express";
import { getProfilePic, uploadProfilePic , getPresignedUrl } from "../controllers/imageUpload.controller";

const router = Router(); 

router.route('/upload-profile-pic/:id').get(uploadProfilePic);
router.route('/get-profile-pic/:id').get(getProfilePic);
router.route('/get-presigned-url').get(getPresignedUrl);

export default router ; 