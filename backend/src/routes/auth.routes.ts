import { Router } from "express";
import { handleSignUp, loginHandler , getAllUsers, checkAuth, getUsers , logout } from "../controllers/auth.controllers";
import { verfiyJWT } from "../middlewares/auth.middleware";

const router = Router(); 

router.route("/signup").post(handleSignUp);
router.route("/login").post(loginHandler);
router.route("/getusers/:id").get(verfiyJWT , getAllUsers);
router.route("/getAllUsers/:id").get(verfiyJWT , getUsers);
router.route("/checkauth").get(checkAuth);
router.route("/logout").get(logout);

export default router; 