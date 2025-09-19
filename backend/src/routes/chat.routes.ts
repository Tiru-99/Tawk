import { Router } from "express";
import { createChat, createGroupChat, getChats } from "../controllers/chat.controller";

const router = Router(); 

router.route("/singlechat").post(createChat);
router.route("/groupchat").post(createGroupChat);
router.route("/getchats/:id").get(getChats);



export default router;  