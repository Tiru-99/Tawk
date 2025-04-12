"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const imageUpload_controller_1 = require("../controllers/imageUpload.controller");
const router = (0, express_1.Router)();
router.route('/upload-profile-pic/:id').get(imageUpload_controller_1.uploadProfilePic);
router.route('/get-profile-pic/:id').get(imageUpload_controller_1.getProfilePic);
router.route('/get-presigned-url').get(imageUpload_controller_1.getPresignedUrl);
exports.default = router;
