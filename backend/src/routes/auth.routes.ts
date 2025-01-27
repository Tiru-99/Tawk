import { Router } from "express";
import { handleSignUp, loginHandler , health, getAllUsers } from "../controllers/auth.controller";


const router = Router(); 

router.route("/signup").post(handleSignUp);
router.route("/login").post(loginHandler);
router.route("/getusers").get(getAllUsers);

export default router; 