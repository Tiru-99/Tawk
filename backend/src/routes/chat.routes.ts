import { Router } from "express";
import { createChat, createGroupChat } from "../controllers/chat.controller";

const router = Router(); 

router.route("/singlechat").post(createChat);
router.route("/groupchat").post(createGroupChat);


export default router;  