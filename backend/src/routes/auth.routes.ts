import { Router } from "express";
import { handleSignUp, loginHandler , getAllUsers, checkAuth } from "../controllers/auth.controller";
import { verfiyJWT } from "../middlewares/auth.middleware";


const router = Router(); 

router.route("/signup").post(handleSignUp);
router.route("/login").post(loginHandler);
router.route("/getusers").get(verfiyJWT , getAllUsers);
router.route("/checkauth").get(checkAuth);

export default router; 