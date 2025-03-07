import { Router } from "express";
import { getProfilePic, updateProfilePic, uploadProfilePic } from "../controllers/imageUpload.controller";

const router = Router(); 

router.route('/upload-profile-pic/:id').get(uploadProfilePic);
router.route('/get-profile-pic/:id').get(getProfilePic);
router.route('/update-profile-pic').put(updateProfilePic);

export default router ; 