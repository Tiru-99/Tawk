import { Router } from "express";
import { handleSignUp, loginHandler , health } from "../controllers/auth.controller";


const router = Router(); 

router.route("/signup").post(handleSignUp);
router.route("/login").post(loginHandler);

export default router; 