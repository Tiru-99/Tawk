import { Router } from "express";
import { getProfilePic, uploadProfilePic } from "../controllers/imageUpload.controller";

const router = Router(); 

router.route('/upload-profile-pic/:id').get(uploadProfilePic);
router.route('/get-profile-pic/:id').get(getProfilePic);

export default router ; 